"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function useAdminSession() {
  const client = useMemo<SupabaseClient | null>(
    () => (typeof window === "undefined" ? null : getBrowserClient()),
    [],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(supabaseConfigured);

  useEffect(() => {
    if (!client) return;

    let active = true;

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setChecking(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, next) => {
        if (active) setSession(next);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  return {
    client,
    session,
    checking,
    configError: !supabaseConfigured,
  };
}
