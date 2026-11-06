import { NextResponse } from "next/server";
import {
  bearerToken,
  getServiceClient,
  isSupabaseConfigured,
  requireOrganiser,
} from "@/lib/supabase/server";
import type { RegistrationRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { code: "DATABASE_NOT_CONFIGURED", message: "ഡാറ്റാബേസ് ബന്ധം ഇല്ല." },
      { status: 503 },
    );
  }

  const organiser = await requireOrganiser(bearerToken(request));
  if (!organiser) {
    return NextResponse.json(
      { code: "NOT_AUTHORISED", message: "സംഘാടക അനുമതി ആവശ്യമാണ്." },
      { status: 401 },
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, registration_code, full_name, phone, branch_name, branch_key, role, created_at, qr_token, photo_key, attendance(checked_in_at)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin registrations load failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { code: "LOAD_FAILED", message: "വിവരങ്ങൾ എടുക്കാനായില്ല." },
      { status: 500 },
    );
  }

  const rows: RegistrationRow[] = (data || []).map((row) => {
    const attendance = row.attendance as
      | { checked_in_at: string }
      | { checked_in_at: string }[]
      | null;

    const checkedInAt = Array.isArray(attendance)
      ? attendance[0]?.checked_in_at ?? null
      : attendance?.checked_in_at ?? null;

    return {
      id: row.id,
      registration_code: row.registration_code,
      full_name: row.full_name,
      phone: row.phone,
      branch_name: row.branch_name,
      branch_key: row.branch_key,
      role: row.role,
      created_at: row.created_at,
      qr_token: row.qr_token,
      photo_key: row.photo_key,
      checked_in_at: checkedInAt,
    };
  });

  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
