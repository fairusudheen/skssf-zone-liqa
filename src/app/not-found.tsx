import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="pass-page">
        <div className="pass-page-wrap">
          <div className="pass-unavailable">
            <p className="micro" lang="en">
              404 / Not found
            </p>
            <h1>ഈ പേജ് കണ്ടെത്താനായില്ല.</h1>
            <p>
              പാസ് ലിങ്ക് തെറ്റാണെങ്കിൽ അല്ലെങ്കിൽ രജിസ്ട്രേഷൻ നീക്കം
              ചെയ്തിട്ടുണ്ടെങ്കിൽ ഇത് സംഭവിക്കാം. സംഘാടകരെ ബന്ധപ്പെടുക.
            </p>
            <Link className="button" href="/">
              <span>ഹോം പേജിലേക്ക്</span>
              <svg
                className="icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 10h14M11 4l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
