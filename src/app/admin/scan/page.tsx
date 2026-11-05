"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAdminSession } from "@/components/useAdminSession";
import {
  AdminApiError,
  adminFetch,
  formatMalayalamDate,
} from "@/lib/admin-api";
import type { AttendanceResult } from "@/lib/types";

interface RecentScan {
  key: string;
  status: AttendanceResult["status"];
  name: string;
  branch: string;
  time: string;
}

const subscribeSecure = () => () => {};

function getSecureSnapshot() {
  return (
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function getSecureServerSnapshot() {
  return true;
}

export default function ScanPage() {
  const router = useRouter();
  const { session, checking, configError } = useAdminSession();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [manual, setManual] = useState("");
  const secure = useSyncExternalStore(
    subscribeSecure,
    getSecureSnapshot,
    getSecureServerSnapshot,
  );

  useEffect(() => {
    if (!checking && !session) router.replace("/admin");
  }, [checking, session, router]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  async function submitToken(raw: string) {
    if (!session || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setScanError("");

    try {
      const payload = await adminFetch<AttendanceResult>(
        "/api/attendance",
        session,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: raw }),
        },
      );

      setResult(payload);
      setRecent((current) =>
        [
          {
            key: `${payload.registration.code}-${payload.checkedInAt}-${Date.now()}`,
            status: payload.status,
            name: payload.registration.name,
            branch: payload.registration.branch,
            time: payload.checkedInAt,
          },
          ...current,
        ].slice(0, 6),
      );
    } catch (error) {
      if (error instanceof AdminApiError) {
        if (error.status === 401) {
          setScanError("ലോഗിൻ കാലാവധി കഴിഞ്ഞു. വീണ്ടും ലോഗിൻ ചെയ്യുക.");
        } else {
          setScanError(error.message);
        }
      } else {
        setScanError("ഹാജർ രേഖപ്പെടുത്താനായില്ല. ബന്ധം പരിശോധിക്കുക.");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startScanning() {
    if (scanning || !secure) return;

    setResult(null);
    setScanError("");
    setScanning(true);

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();

      if (!videoRef.current) throw new Error("VIDEO_NOT_READY");

      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (scanResult, _error, callbackControls) => {
          if (!scanResult) return;
          callbackControls.stop();
          controlsRef.current = null;
          setScanning(false);
          void submitToken(scanResult.getText());
        },
      );

      controlsRef.current = controls;
    } catch (error) {
      setScanning(false);
      controlsRef.current = null;
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError") {
        setScanError(
          "ക്യാമറ ഉപയോഗിക്കാൻ അനുമതി നൽകിയിട്ടില്ല. ബ്രൗസർ ക്രമീകരണത്തിൽ ക്യാമറ അനുവദിക്കുക.",
        );
      } else if (name === "NotFoundError") {
        setScanError("ഈ ഉപകരണത്തിൽ ക്യാമറ കണ്ടെത്താനായില്ല. താഴെ കോഡ് നേരിട്ട് നൽകുക.");
      } else if (name === "NotReadableError") {
        setScanError("ക്യാമറ മറ്റൊരു ആപ്പ് ഉപയോഗിക്കുന്നു. അത് അടച്ച് വീണ്ടും ശ്രമിക്കുക.");
      } else {
        setScanError("ക്യാമറ തുറക്കാനായില്ല. താഴെ കോഡ് നേരിട്ട് നൽകുക.");
      }
    }
  }

  function stopScanning() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  function handleManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manual.trim()) return;
    setResult(null);
    void submitToken(manual.trim());
    setManual("");
  }

  if (configError) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <Link className="admin-brand" href="/">
            LIQA&apos; 2026 / CHECK-IN
          </Link>
          <nav className="admin-header-actions" aria-label="സംഘാടക നാവിഗേഷൻ">
            <Link className="header-action" href="/">
              SITE
            </Link>
          </nav>
        </header>
        <div className="admin-content">
          <section className="admin-login" aria-labelledby="scan-config-title">
            <p className="micro" lang="en">
              Configuration required
            </p>
            <h2 id="scan-config-title">ഡാറ്റാബേസ് ബന്ധം ഇല്ല.</h2>
            <p className="admin-login-copy">
              ഹാജർ സ്കാനർ ലഭ്യമാകാൻ Supabase ബന്ധം ക്രമീകരിക്കണം. ദയവായി
              സംഘാടകരെ ബന്ധപ്പെടുക.
            </p>
            <Link className="button" href="/admin">
              <span>സംഘാടക പേജിലേക്ക്</span>
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (checking || !session) {
    return (
      <div className="admin-page">
        <div className="admin-content">
          <p className="admin-status" role="status">
            {checking ? "ലോഗിൻ പരിശോധിക്കുന്നു…" : "സംഘാടക ലോഗിൻ ആവശ്യമാണ്."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" href="/">
          LIQA&apos; 2026 / CHECK-IN
        </Link>
        <nav className="admin-header-actions" aria-label="സംഘാടക നാവിഗേഷൻ">
          <Link className="header-action" href="/admin">
            DASHBOARD
          </Link>
          <Link className="header-action" href="/">
            SITE
          </Link>
        </nav>
      </header>

      <div className="admin-content">
        <div className="admin-title-row">
          <div>
            <p className="micro" lang="en">
              Organiser check-in
            </p>
            <h2 className="scan-title">ക്യൂ ആർ സ്കാൻ.</h2>
          </div>
          <p className="scan-total">
            ആകെ ഹാജർ: <strong>{result?.totalCheckedIn ?? "—"}</strong>
          </p>
        </div>

        <div className="scan-layout">
          <section className="scan-panel" aria-labelledby="scan-reader-title">
            <h3 id="scan-reader-title">ക്യാമറ</h3>

            <div className={`scan-reader${scanning ? " is-live" : ""}`}>
              <video ref={videoRef} muted playsInline />
              <div className="scan-frame" aria-hidden="true" />
              {!scanning && (
                <div className="scan-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 8V4h4M14 4h6v6M20 16v4h-4M8 20H3v-4M3 12h18"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                  <span>ക്യാമറ തുറക്കാൻ താഴെ ബട്ടൺ അമർത്തുക</span>
                </div>
              )}
            </div>

            <div className="scan-buttons">
              {scanning ? (
                <button className="button button-outline" type="button" onClick={stopScanning}>
                  സ്കാൻ നിർത്തുക
                </button>
              ) : (
                <button
                  className="button button-highlight"
                  type="button"
                  onClick={startScanning}
                  disabled={busy || !secure}
                >
                  <span>സ്കാൻ ആരംഭിക്കുക</span>
                  <svg
                    className="icon"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4M3 10h14"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
              )}
            </div>

            {!secure && (
              <p className="scan-hint" role="alert">
                ക്യാമറ ഉപയോഗിക്കാൻ HTTPS ആവശ്യമാണ്. താഴെ കോഡ് നേരിട്ട്
                നൽകാം.
              </p>
            )}

            {scanning && (
              <p className="scan-hint" role="status">
                ഡെലിഗേറ്റിന്റെ പാസിലെ ക്യൂ ആർ കോഡ് ഫ്രെയിമിനുള്ളിൽ
                കാണിക്കുക.
              </p>
            )}

            {busy && (
              <p className="scan-hint" role="status">
                ഹാജർ രേഖപ്പെടുത്തുന്നു…
              </p>
            )}
          </section>

          <section className="scan-panel" aria-labelledby="scan-result-title">
            <h3 id="scan-result-title">ഫലം</h3>

            {result ? (
              <div
                className={`scan-result status-${
                  result.status === "checked-in" ? "ok" : "already"
                }`}
              >
                <p className="scan-result-status">
                  {result.status === "checked-in"
                    ? "ഹാജർ രേഖപ്പെടുത്തി."
                    : "ഇതിനകം ഹാജർ രേഖപ്പെടുത്തിയിട്ടുണ്ട്."}
                </p>

                <div className="scan-result-body">
                  <div className="scan-result-photo">
                    {result.registration.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.registration.photoUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">
                        {Array.from(result.registration.name)[0] || "L"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="scan-result-name">
                      {result.registration.name}
                    </p>
                    <p className="scan-result-meta">
                      {result.registration.role} · {result.registration.branch}
                    </p>
                    <p className="scan-result-code">
                      {result.registration.code}
                    </p>
                  </div>
                </div>

                <dl className="scan-result-times">
                  <div>
                    <dt>ഹാജർ സമയം</dt>
                    <dd>{formatMalayalamDate(result.checkedInAt)}</dd>
                  </div>
                  <div>
                    <dt>ആകെ ഹാജർ</dt>
                    <dd>{result.totalCheckedIn}</dd>
                  </div>
                </dl>

                <button
                  className="button button-highlight"
                  type="button"
                  onClick={startScanning}
                >
                  <span>അടുത്തത് സ്കാൻ ചെയ്യുക</span>
                  <svg
                    className="icon"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4M3 10h14"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <p className="scan-empty">
                സ്കാൻ ചെയ്ത ഡെലിഗേറ്റിന്റെ വിവരങ്ങൾ ഇവിടെ കാണാം.
              </p>
            )}

            {scanError && (
              <p className="scan-error" role="alert">
                {scanError}
              </p>
            )}

            <form className="scan-manual" onSubmit={handleManual}>
              <label htmlFor="manual-token">
                ക്യാമറ പ്രവർത്തിക്കുന്നില്ലേ? കോഡ് നേരിട്ട് നൽകുക
              </label>
              <div className="scan-manual-row">
                <input
                  id="manual-token"
                  name="token"
                  type="text"
                  placeholder="പാസ് ലിങ്ക് അല്ലെങ്കിൽ ടോക്കൺ"
                  value={manual}
                  onChange={(event) => setManual(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="button"
                  type="submit"
                  disabled={busy || !manual.trim()}
                >
                  രേഖപ്പെടുത്തുക
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="admin-section" aria-labelledby="recent-title">
          <h3 id="recent-title">ഈ സെഷനിൽ</h3>
          {recent.length ? (
            <ul className="scan-recent">
              {recent.map((item) => (
                <li key={item.key}>
                  <span
                    className={`scan-dot${
                      item.status === "checked-in" ? " is-ok" : " is-already"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="scan-recent-name">{item.name}</span>
                  <span className="scan-recent-branch">{item.branch}</span>
                  <span className="scan-recent-status">
                    {item.status === "checked-in" ? "ഹാജർ" : "ഇതിനകം"}
                  </span>
                  <time dateTime={item.time}>{formatMalayalamDate(item.time)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="scan-empty">ഇതുവരെ സ്കാൻ ചെയ്തിട്ടില്ല.</p>
          )}
        </section>
      </div>
    </div>
  );
}
