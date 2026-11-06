import { NextResponse } from "next/server";
import { photoDataUrl } from "@/lib/r2";
import {
  bearerToken,
  getServiceClient,
  isSupabaseConfigured,
  requireOrganiser,
} from "@/lib/supabase/server";
import { attendanceSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractToken(value: string): string {
  const trimmed = value.trim();
  if (UUID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const last = url.pathname.split("/").filter(Boolean).pop() || "";
    if (UUID_RE.test(last)) return last;
  } catch {
    // Not a URL; fall through to the plain-segment case.
  }

  const last = trimmed.split(/[/?#]/).filter(Boolean).pop() || "";
  return last;
}

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

  const organiser = await requireOrganiser(bearerToken(request));
  if (!organiser) {
    return fail(
      "NOT_AUTHORISED",
      "സംഘാടക അനുമതി ആവശ്യമാണ്.",
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_REQUEST", "അഭ്യർത്ഥന വായിക്കാനായില്ല.", 400);
  }

  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_TOKEN", "ക്യൂ ആർ കോഡ് വായിക്കാനായില്ല.", 400);
  }

  const token = extractToken(parsed.data.token);
  if (!UUID_RE.test(token)) {
    return fail("INVALID_TOKEN", "ഈ ക്യൂ ആർ കോഡ് സാധുവല്ല.", 400);
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("mark_attendance", {
    p_token: token,
    p_organiser: organiser.userId,
  });

  if (error) {
    console.error("mark_attendance RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return fail(
      "ATTENDANCE_FAILED",
      "ഹാജർ രേഖപ്പെടുത്താനായില്ല. വീണ്ടും ശ്രമിക്കുക.",
      500,
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return fail(
      "TOKEN_NOT_FOUND",
      "ഈ ക്യൂ ആർ കോഡ് രജിസ്ട്രേഷനുമായി ബന്ധപ്പെട്ടിട്ടില്ല.",
      404,
    );
  }

  return NextResponse.json({
    status: row.already_marked ? "already-checked-in" : "checked-in",
    registration: {
      code: row.registration_code,
      name: row.full_name,
      branch: row.branch_name,
      role: row.role,
      photoUrl: await photoDataUrl(row.photo_key),
    },
    checkedInAt: row.checked_in_at,
    totalCheckedIn: Number(row.total_checked_in) || 0,
  });
}
