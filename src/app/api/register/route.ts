import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { normalizeBranch, siteUrl } from "@/lib/constants";
import { processPhoto, dataUrl } from "@/lib/images";
import { isR2Configured, deletePhoto, uploadPhoto } from "@/lib/r2";
import {
  getServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return fail(
      "DATABASE_NOT_CONFIGURED",
      "ഡാറ്റാബേസ് ബന്ധം ക്രമീകരിച്ചിട്ടില്ല.",
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("INVALID_REQUEST", "ഫോം വിവരങ്ങൾ വായിക്കാനായില്ല.", 400);
  }

  const parsed = registrationSchema.safeParse({
    fullName: String(form.get("fullName") ?? ""),
    phone: String(form.get("phone") ?? ""),
    branch: String(form.get("branch") ?? ""),
    role: String(form.get("role") ?? ""),
  });

  if (!parsed.success) {
    return fail(
      "INVALID_REGISTRATION",
      parsed.error.issues[0]?.message || "വിവരങ്ങൾ പരിശോധിക്കുക.",
      400,
    );
  }

  const input = parsed.data;
  const supabase = getServiceClient();

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, name")
    .eq("name", input.branch)
    .maybeSingle();

  if (branchError) {
    console.error("Branch lookup failed", {
      code: branchError.code,
      message: branchError.message,
      details: branchError.details,
      hint: branchError.hint,
    });
    return fail(
      "BRANCH_LOOKUP_FAILED",
      "ശാഖ വിവരങ്ങൾ എടുക്കാനായില്ല.",
      500,
    );
  }

  if (!branch) {
    return fail("INVALID_BRANCH", "ശരിയായ ശാഖ തിരഞ്ഞെടുക്കുക.", 400);
  }

  const { data: existingPhone, error: phoneLookupError } = await supabase
    .from("registrations")
    .select("id")
    .eq("phone", input.phone)
    .maybeSingle();

  if (phoneLookupError) {
    console.error("Phone lookup failed", {
      code: phoneLookupError.code,
      message: phoneLookupError.message,
      details: phoneLookupError.details,
      hint: phoneLookupError.hint,
    });
    return fail(
      "REGISTRATION_FAILED",
      "രജിസ്ട്രേഷൻ പൂർത്തിയായില്ല. വീണ്ടും ശ്രമിക്കുക.",
      500,
    );
  }

  if (existingPhone) {
    return fail(
      "DUPLICATE_PHONE",
      "ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് രജിസ്ട്രേഷൻ നടത്തിയിട്ടുണ്ട്.",
      409,
    );
  }

  let photoKey: string | null = null;
  let processedPhoto: Buffer | null = null;

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return fail(
        "PHOTO_TOO_LARGE",
        "ഫോട്ടോയുടെ വലുപ്പം 4 MB-യിൽ കുറവായിരിക്കണം.",
        413,
      );
    }

    if (!ALLOWED_TYPES.has(photo.type)) {
      return fail(
        "INVALID_PHOTO_TYPE",
        "JPG, PNG, WebP അല്ലെങ്കിൽ HEIC ഫോട്ടോ തിരഞ്ഞെടുക്കുക.",
        400,
      );
    }

    if (!isR2Configured()) {
      return fail(
        "PHOTO_STORAGE_NOT_CONFIGURED",
        "ഫോട്ടോ സൂക്ഷിക്കാനുള്ള സംവിധാനം ക്രമീകരിച്ചിട്ടില്ല. ഫോട്ടോ ഒഴിവാക്കി രജിസ്റ്റർ ചെയ്യാം.",
        503,
      );
    }

    try {
      processedPhoto = await processPhoto(
        Buffer.from(await photo.arrayBuffer()),
      );
    } catch {
      return fail(
        "INVALID_PHOTO",
        "ഫോട്ടോ വായിക്കാനായില്ല. മറ്റൊരു ഫോട്ടോ തിരഞ്ഞെടുക്കുക.",
        400,
      );
    }

    photoKey = `photos/${crypto.randomUUID()}.webp`;
    try {
      await uploadPhoto(photoKey, processedPhoto, "image/webp");
    } catch (uploadError) {
      console.error("R2 photo upload failed", uploadError);
      return fail(
        "PHOTO_UPLOAD_FAILED",
        "ഫോട്ടോ സൂക്ഷിക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.",
        502,
      );
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("registrations")
    .insert({
      full_name: input.fullName,
      phone: input.phone,
      branch_id: branch.id,
      branch_name: branch.name,
      branch_key: normalizeBranch(branch.name),
      role: input.role,
      photo_key: photoKey,
    })
    .select("id, registration_code, qr_token, created_at")
    .single();

  if (insertError || !inserted) {
    if (photoKey) await deletePhoto(photoKey);

    const duplicate =
      insertError?.code === "23505" ||
      String(insertError?.message || "").includes("registrations_phone_key");

    if (duplicate) {
      return fail(
        "DUPLICATE_PHONE",
        "ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് രജിസ്ട്രേഷൻ നടത്തിയിട്ടുണ്ട്.",
        409,
      );
    }

    console.error("Registration insert failed", {
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });

    return fail(
      "REGISTRATION_FAILED",
      "രജിസ്ട്രേഷൻ പൂർത്തിയായില്ല. വീണ്ടും ശ്രമിക്കുക.",
      500,
    );
  }

  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("branch_id", branch.id);

  const passUrl = `${siteUrl()}/pass/${inserted.qr_token}`;
  const qrDataUrl = await QRCode.toDataURL(passUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
    color: { dark: "#0B1020", light: "#F1F3F7" },
  });

  return NextResponse.json(
    {
      registrationId: inserted.id,
      registrationCode: inserted.registration_code,
      token: inserted.qr_token,
      name: input.fullName,
      branch: branch.name,
      role: input.role,
      branchTotal: count ?? 1,
      createdAt: inserted.created_at,
      passUrl,
      qrDataUrl,
      photoUrl: processedPhoto ? dataUrl(processedPhoto) : null,
    },
    { status: 201 },
  );
}
