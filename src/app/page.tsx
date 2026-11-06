import Countdown from "@/components/Countdown";
import HeroTitle from "@/components/HeroTitle";
import MotionController from "@/components/MotionController";
import RegistrationSection from "@/components/RegistrationSection";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const marqueeItems = [
  "LIQA' 2026",
  "13 NOVEMBER",
  "FIVE FROM EVERY BRANCH",
  "SNEC COLLEGE GROUND",
  "PAYYANUR",
];

function MarqueeGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="marquee-group" aria-hidden={hidden || undefined}>
      {marqueeItems.map((item) => (
        <span className="marquee-item" lang="en" key={item}>
          {item} <span className="marquee-mark" />
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        ഉള്ളടക്കത്തിലേക്ക് പോകുക
      </a>

      <SiteHeader />

      <main id="main">
        <section className="hero shell" id="top" aria-labelledby="event-title">
          <div className="hero-meta">
            <p className="hero-organiser">SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റി</p>
            <p className="hero-edition micro" lang="en">
              Leaders’ meet
              <br />
              Membership launch / 2026
            </p>
          </div>

          <div className="title-frame">
            <HeroTitle />
          </div>

          <div className="hero-under-title">
            <p className="hero-latin-name" lang="en">
              (LIQA&apos;) 2026
            </p>
            <p className="hero-subtitle">
              നേതൃസംഗമവും മെമ്പർഷിപ്പ് വിതരണോദ്ഘാടനവും
            </p>
          </div>

          <div className="hero-bottom">
            <time className="hero-date" dateTime="2026-11-13T18:00:00+05:30">
              <span className="micro" lang="en">
                Date &amp; time / Save it
              </span>
              2026 നവംബർ 13, വൈകിട്ട് 6 മണിക്ക്
            </time>
            <address className="hero-venue">
              <span className="micro" lang="en">
                Venue / Payyanur
              </span>
              SNEC കോളേജ് മൈതാനം, പുഞ്ചക്കാട്
            </address>
            <a className="button hero-cta" href="#register" data-magnetic>
              <span>രജിസ്റ്റർ ചെയ്യുക</span>
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
            </a>
          </div>
          <span className="hero-side-note micro" lang="en">
            Payyanur / Kerala / 13.12.26
          </span>
        </section>

        <div
          className="marquee"
          aria-label="ലിഖാഅ് 2026, നവംബർ 13, പയ്യന്നൂർ"
        >
          <div className="marquee-track">
            <MarqueeGroup />
            <MarqueeGroup hidden />
          </div>
        </div>

        <section className="manifesto" aria-labelledby="manifesto-title">
          <div className="shell">
            <div className="section-top">
              <span className="micro" lang="en">
                01 / The one rule
              </span>
              <span className="micro" lang="en">
                Minimum / Branch
              </span>
            </div>
            <div className="manifesto-grid">
              <div className="five-wrap reveal" aria-hidden="true">
                <div className="giant-five">5</div>
                <span className="five-caption">
                  NOT FOUR.
                  <br />
                  NOT SOMEDAY.
                  <br />
                  FIVE.
                </span>
              </div>
              <div className="manifesto-copy reveal">
                <p className="manifesto-kicker">ഓരോ ശാഖയിൽ നിന്നും</p>
                <h2 id="manifesto-title">
                  അഞ്ച് പേർ.
                  <br />
                  ഒരുമിച്ച് എത്തണം.
                </h2>
                <blockquote className="manifesto-message">
                  എല്ലാ ശാഖകളിൽ നിന്നും ചുരുങ്ങിയത് അഞ്ച് പേർ വീതം
                  നിർബന്ധമായും പങ്കെടുക്കണമെന്ന് വിനീതമായി
                  അഭ്യർത്ഥിക്കുന്നു.
                </blockquote>
                <p className="manifesto-signoff">
                  SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റി
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="details shell" aria-labelledby="details-title">
          <div className="section-top">
            <span className="micro" lang="en">
              02 / The meeting point
            </span>
            <span className="micro" lang="en">
              Payyanur / Kerala
            </span>
          </div>
          <h2 id="details-title" hidden>
            സമയവും സ്ഥലവും
          </h2>
          <div className="details-grid reveal">
            <time className="detail-block" dateTime="2026-11-13T18:00:00+05:30">
              <div className="detail-number" lang="en">
                01 — DATE / TIME
              </div>
              <p className="detail-value">
                2026 നവംബർ 13, വൈകിട്ട് 6 മണിക്ക്
              </p>
            </time>
            <address className="detail-block">
              <div className="detail-number" lang="en">
                02 — PLACE
              </div>
              <p className="detail-value">
                SNEC കോളേജ് മൈതാനം, പുഞ്ചക്കാട്
              </p>
            </address>
          </div>

          <div className="countdown-wrap reveal">
            <div className="countdown-heading">
              <h3>നവംബർ 13-ലേക്ക്</h3>
              <span className="micro" lang="en">
                Countdown / IST
              </span>
            </div>
            <Countdown />
          </div>
        </section>

        <RegistrationSection />
      </main>

      <SiteFooter />
      <MotionController />
    </>
  );
}
