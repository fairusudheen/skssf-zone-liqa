import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import PassCard from "@/components/PassCard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { siteUrl } from "@/lib/constants";
import { photoDataUrl } from "@/lib/r2";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PassData } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "രജിസ്ട്രേഷൻ പാസ് — ലിഖാഅ് 2026",
  robots: { index: false, follow: false },
};

export default async function PassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!UUID_RE.test(token)) notFound();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <SiteHeader />
        <main className="pass-page">
          <div className="pass-page-wrap">
            <div className="pass-unavailable">
              <p className="micro" lang="en">
                Pass unavailable
              </p>
              <h1>പാസ് ഇപ്പോൾ ലഭ്യമല്ല.</h1>
              <p>
                ഡാറ്റാബേസ് ബന്ധം ക്രമീകരിച്ചിട്ടില്ല. ദയവായി സംഘാടകരെ
                ബന്ധപ്പെടുക.
              </p>
              <Link className="button" href="/">
                <span>ഹോം പേജിലേക്ക്</span>
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "full_name, branch_name, role, qr_token, registration_code, photo_key, created_at",
    )
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !data) notFound();

  const qrDataUrl = await QRCode.toDataURL(`${siteUrl()}/pass/${token}`, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 420,
    color: { dark: "#0B1020", light: "#F1F3F7" },
  });

  const pass: PassData = {
    name: data.full_name,
    branch: data.branch_name,
    role: data.role,
    token: data.qr_token,
    code: data.registration_code,
    photoUrl: await photoDataUrl(data.photo_key),
    qrDataUrl,
    createdAt: data.created_at,
  };

  return (
    <>
      <SiteHeader />
      <main className="pass-page">
        <div className="pass-page-wrap">
          <div className="pass-page-head">
            <div>
              <p className="micro" lang="en">
                Your entry pass
              </p>
              <h1 className="pass-page-title">രജിസ്ട്രേഷൻ പാസ്.</h1>
            </div>
            <Link className="text-button pass-back" href="/">
              ഹോം പേജിലേക്ക്
            </Link>
          </div>

          <PassCard data={pass} withActions />

          <p className="pass-page-note">
            ഈ പാസ് ഇവന്റ് ദിവസം സംഘാടകർക്ക് കാണിക്കുക. ക്യൂ ആർ കോഡ്
            സ്കാൻ ചെയ്ത് ഹാജർ രേഖപ്പെടുത്തും. ലിങ്ക് സ്വകാര്യമായി
            സൂക്ഷിക്കുക.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
