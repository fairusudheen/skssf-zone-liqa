import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main">
          <div>
            <p className="footer-event">
              ലിഖാഅ് <span className="latin" lang="en">/ 2026</span>
            </p>
            <p className="footer-signoff">SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റി</p>
          </div>
          <Link className="button button-outline footer-admin" href="/admin">
            <span>സംഘാടകർക്ക്</span>
            <svg
              className="icon"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 16 16 4M6 4h10v10"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </Link>
        </div>
        <div className="footer-bottom micro" lang="en">
          <span>Leaders’ meet + Membership launch</span>
          <span>Payyanur / Kerala / 2026</span>
        </div>
      </div>
    </footer>
  );
}
