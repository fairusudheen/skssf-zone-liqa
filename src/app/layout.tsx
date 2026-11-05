import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Space_Grotesk } from "next/font/google";
import "./globals.css";

const anek = Anek_Malayalam({
  subsets: ["malayalam", "latin"],
  variable: "--font-anek",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://skssf-zone-liqa.vercel.app",
  ),
  title: "ലിഖാഅ് (LIQA') 2026 — SKSSF പയ്യന്നൂർ",
  description:
    "ലിഖാഅ് 2026 — SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റിയുടെ നേതൃസംഗമവും മെമ്പർഷിപ്പ് വിതരണോദ്ഘാടനവും. 2026 നവംബർ 13.",
  applicationName: "LIQA' 2026",
  openGraph: {
    title: "ലിഖാഅ് (LIQA') 2026",
    description:
      "നേതൃസംഗമവും മെമ്പർഷിപ്പ് വിതരണോദ്ഘാടനവും · 2026 നവംബർ 13 · SNEC കോളേജ് മൈതാനം, പുഞ്ചക്കാട്",
    locale: "ml_IN",
    type: "website",
    images: [
      {
        url: "/liqa-share.png",
        width: 1200,
        height: 630,
        alt: "LIQA' 2026 — SKSSF Payyanur regional meet, 13 November 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/liqa-share.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F3F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
  ],
};

const themeScript = `(function(){document.documentElement.classList.add('js');try{var saved=localStorage.getItem('liqa26-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ml"
      className={`${anek.variable} ${grotesk.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
