export const BRANCHES = [
  "രാമന്തളി",
  "എട്ടിക്കുളം",
  "കവ്വായി",
  "കാറമേൽ",
  "പുഞ്ചക്കാട്",
  "കാങ്കോൽ",
  "ഏച്ചിലാം വയൽ",
  "മാത്തിൽ",
  "പെരുമ്പ",
  "കുണ്ടയം കൊവ്വൽ",
  "കരിവെള്ളൂർ",
  "കാങ്കോൽ ടൗൺ",
  "കൊവ്വപ്പുറം",
  "കൊയപ്പാറ",
  "മണ്ടൂർ",
  "പിലാത്തറ",
  "ചന്തപ്പുര",
  "അങ്ങാടി",
  "പാലത്തറ",
  "തായിനേരി",
  "ആലിൻകീഴ്",
  "വെള്ളൂർ",
] as const;

export const ROLES = [
  "പ്രസിഡന്റ്",
  "വൈസ് പ്രസിഡന്റ്",
  "ജനറൽ സെക്രട്ടറി",
  "ജോയിന്റ് സെക്രട്ടറി",
  "വർക്കിംഗ് സെക്രട്ടറി",
  "ട്രഷറർ",
  "മെമ്പർ",
  "കൗൺസിലർ",
] as const;

export type Branch = (typeof BRANCHES)[number];
export type Role = (typeof ROLES)[number];

export const TARGET_PER_BRANCH = 5;

export const EVENT = {
  title: "ലിഖാഅ്",
  latinTitle: "(LIQA') 2026",
  dateLabel: "2026 നവംബർ 13, വൈകിട്ട് 6 മണിക്ക്",
  dateIso: "2026-11-13",
  venue: "SNEC കോളേജ് മൈതാനം, പുഞ്ചക്കാട്",
  organiser: "SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റി",
  timestamp: new Date("2026-11-13T18:00:00+05:30").getTime(),
} as const;

export function normalizeBranch(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("ml-IN");
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}
