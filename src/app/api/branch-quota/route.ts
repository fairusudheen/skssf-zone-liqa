import { NextResponse } from "next/server";
import { BRANCHES } from "@/lib/constants";
import {
  getServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const empty = BRANCHES.map((name) => ({ name, registered: 0 }));

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { branches: empty, configured: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("branch_quota");

    if (error || !Array.isArray(data)) {
      console.error("branch_quota RPC failed", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        hasData: Array.isArray(data),
      });
      return NextResponse.json(
        { branches: empty, configured: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const counts = new Map<string, number>(
      data.map((row: { branch_name: string; registered: number }) => [
        row.branch_name,
        Number(row.registered) || 0,
      ]),
    );

    return NextResponse.json(
      {
        branches: BRANCHES.map((name) => ({
          name,
          registered: counts.get(name) ?? 0,
        })),
        configured: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("branch_quota request failed", error);
    return NextResponse.json(
      { branches: empty, configured: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
