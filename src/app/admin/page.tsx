"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useAdminSession } from "@/components/useAdminSession";
import {
  AdminApiError,
  adminFetch,
  downloadCsv,
  formatMalayalamDate,
} from "@/lib/admin-api";
import { BRANCHES, TARGET_PER_BRANCH } from "@/lib/constants";
import type { RegistrationRow } from "@/lib/types";

async function requestRows(session: Session) {
  return adminFetch<{ rows: RegistrationRow[] }>(
    "/api/admin/registrations",
    session,
  );
}

export default function AdminPage() {
  const { client, session, checking, configError } = useAdminSession();
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const branchDetailRef = useRef<HTMLElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const loadData = useCallback(
    async (activeSession: Session) => {
      setLoading(true);
      setError("");
      try {
        const payload = await requestRows(activeSession);
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setLastUpdated(formatMalayalamDate(new Date().toISOString()));
      } catch (loadError) {
        if (loadError instanceof AdminApiError) {
          if (loadError.status === 401) {
            setAuthError("ഈ അക്കൗണ്ടിന് സംഘാടക അനുമതി ഇല്ല അല്ലെങ്കിൽ ലോഗിൻ കാലാവധി കഴിഞ്ഞു.");
            setRows([]);
            await client?.auth.signOut();
            return;
          }
        }
        setError("വിവരങ്ങൾ എടുക്കാൻ കഴിഞ്ഞില്ല. ബന്ധം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.");
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (!session) return;
    let active = true;

    requestRows(session)
      .then((payload) => {
        if (!active) return;
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setLastUpdated(formatMalayalamDate(new Date().toISOString()));
        setError("");
      })
      .catch(async (loadError: unknown) => {
        if (!active) return;
        if (loadError instanceof AdminApiError && loadError.status === 401) {
          setAuthError("ഈ അക്കൗണ്ടിന് സംഘാടക അനുമതി ഇല്ല അല്ലെങ്കിൽ ലോഗിൻ കാലാവധി കഴിഞ്ഞു.");
          setRows([]);
          await client?.auth.signOut();
          return;
        }
        setError("വിവരങ്ങൾ എടുക്കാൻ കഴിഞ്ഞില്ല. ബന്ധം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, client]);

  const branches = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; name: string; count: number; checked: number }
    >();

    BRANCHES.forEach((name) => {
      groups.set(name, { key: name, name, count: 0, checked: 0 });
    });

    rows.forEach((row) => {
      const name = row.branch_name;
      const current = groups.get(name) || {
        key: name,
        name,
        count: 0,
        checked: 0,
      };
      current.count += 1;
      if (row.checked_in_at) current.checked += 1;
      groups.set(name, current);
    });

    return [...groups.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "ml"),
    );
  }, [rows]);

  const selectedBranchDetail = useMemo(() => {
    if (!selectedBranch) return null;

    const branch = branches.find((item) => item.key === selectedBranch);
    if (!branch) return null;

    return {
      ...branch,
      rows: rows.filter((row) => row.branch_name === selectedBranch),
    };
  }, [branches, rows, selectedBranch]);

  useEffect(() => {
    if (!selectedBranch) return;

    branchDetailRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedBranch]);

  const checkedIn = rows.filter((row) => row.checked_in_at).length;
  const completed = branches.filter(
    (branch) => branch.count >= TARGET_PER_BRANCH,
  ).length;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    if (!email.trim() || !password) {
      setAuthError("ഇമെയിലും പാസ്‌വേഡും നൽകുക.");
      return;
    }

    if (!client) {
      setAuthError("ഡാറ്റാബേസ് ക്രമീകരണം പൂർത്തിയാക്കിയിട്ടില്ല.");
      return;
    }

    setAuthBusy(true);
    setLoading(true);
    try {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const status = signInError.status;
        setAuthError(
          status === 400 || status === 401
            ? "ഇമെയിൽ അല്ലെങ്കിൽ പാസ്‌വേഡ് ശരിയല്ല."
            : "ലോഗിൻ പൂർത്തിയായില്ല. ബന്ധം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.",
        );
        setLoading(false);
        return;
      }

      setPassword("");
    } catch {
      setLoading(false);
      setAuthError("ലോഗിൻ പൂർത്തിയായില്ല. ബന്ധം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await client?.auth.signOut();
    setRows([]);
    setLastUpdated("");
    setLoading(false);
    setAuthError("ലോഗൗട്ട് ചെയ്തു.");
  }

  function handleCsv() {
    downloadCsv(
      "liqa-2026-registrations.csv",
      [
        "Registration ID",
        "Full Name",
        "Mobile",
        "Branch",
        "Role",
        "Registered At",
        "Checked In At",
      ],
      rows.map((row) => [
        row.registration_code,
        row.full_name,
        row.phone,
        row.branch_name,
        row.role,
        row.created_at,
        row.checked_in_at || "",
      ]),
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link className="admin-brand" href="/">
          LIQA&apos; 2026 / ORGANISERS
        </Link>
        <nav className="admin-header-actions" aria-label="സംഘാടക നാവിഗേഷൻ">
          <Link className="header-action" href="/admin/scan">
            SCAN
          </Link>
          <Link className="header-action" href="/">
            SITE
          </Link>
        </nav>
      </header>

      <div className="admin-content">
        {configError && (
          <section className="admin-login" aria-labelledby="config-title">
            <p className="micro" lang="en">
              Configuration required
            </p>
            <h2 id="config-title">ഡാറ്റാബേസ് ബന്ധം ഇല്ല.</h2>
            <p className="admin-login-copy">
              NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY എന്നിവ
              ക്രമീകരിച്ച ശേഷം സംഘാടക ലോഗിൻ ലഭ്യമാകും.
            </p>
          </section>
        )}

        {!configError && checking && (
          <p className="admin-status" role="status">
            ലോഗിൻ പരിശോധിക്കുന്നു…
          </p>
        )}

        {!configError && !checking && !session && (
          <section className="admin-login" aria-labelledby="admin-login-title">
            <p className="micro" lang="en">
              Restricted access
            </p>
            <h2 id="admin-login-title">
              സംഘാടക
              <br />
              ലോഗിൻ.
            </h2>
            <p className="admin-login-copy">
              രജിസ്ട്രേഷൻ വിവരങ്ങൾ കാണാനും ഹാജർ രേഖപ്പെടുത്താനും
              അംഗീകൃത സംഘാടക അക്കൗണ്ട് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക.
            </p>
            <form onSubmit={handleLogin} noValidate>
              <div className="field">
                <label htmlFor="admin-email">ഇമെയിൽ</label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-password">പാസ്‌വേഡ്</label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <button className="button" type="submit" disabled={authBusy}>
                <span>{authBusy ? "പരിശോധിക്കുന്നു…" : "ലോഗിൻ ചെയ്യുക"}</span>
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
              </button>
              <p className="admin-error" role="alert">
                {authError}
              </p>
            </form>
          </section>
        )}

        {!configError && session && (
          <section aria-labelledby="dashboard-title">
            <div className="admin-title-row">
              <div>
                <p className="micro" lang="en">
                  Live overview
                </p>
                <h2 id="dashboard-title">രജിസ്ട്രേഷനുകൾ.</h2>
              </div>
              <div className="admin-tools">
                <Link className="button button-highlight" href="/admin/scan">
                  <span>ക്യൂ ആർ സ്കാൻ</span>
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
                </Link>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => session && loadData(session)}
                  disabled={loading}
                >
                  പുതുക്കുക
                </button>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={handleCsv}
                  disabled={!rows.length}
                >
                  CSV ഡൗൺലോഡ്
                </button>
                <button
                  className="button button-outline"
                  type="button"
                  onClick={handleLogout}
                >
                  ലോഗൗട്ട്
                </button>
              </div>
            </div>

            <p className="admin-status" role="status" aria-live="polite">
              {loading
                ? "വിവരങ്ങൾ എടുക്കുന്നു…"
                : error ||
                  (lastUpdated
                    ? `അവസാനം പുതുക്കിയത്: ${lastUpdated}`
                    : "")}
            </p>
            {authError && (
              <p className="admin-error" role="alert">
                {authError}
              </p>
            )}

            <div className="admin-stats" aria-label="രജിസ്ട്രേഷൻ സംക്ഷിപ്തം">
              <div className="admin-stat">
                <span className="admin-stat-value">{rows.length}</span>
                <span className="admin-stat-label">ആകെ രജിസ്ട്രേഷൻ</span>
              </div>
              <div className="admin-stat">
                <span className="admin-stat-value">{branches.length}</span>
                <span className="admin-stat-label">ആകെ ശാഖകൾ</span>
              </div>
              <div className="admin-stat">
                <span className="admin-stat-value">{completed}</span>
                <span className="admin-stat-label">
                  അഞ്ച് പൂർത്തിയായ ശാഖകൾ
                </span>
              </div>
              <div className="admin-stat">
                <span className="admin-stat-value">{checkedIn}</span>
                <span className="admin-stat-label">ഹാജർ രേഖപ്പെടുത്തിയത്</span>
              </div>
            </div>

            <section className="admin-section" aria-labelledby="branch-table-title">
              <h3 id="branch-table-title">ശാഖ തിരിച്ച്</h3>
              <div
                className="table-scroll"
                tabIndex={0}
                aria-label="ശാഖാ വിവര പട്ടിക; കൂടുതൽ കാണാൻ വലത്തേക്ക് സ്ക്രോൾ ചെയ്യുക"
              >
                <table className="branch-table admin-branch-table">
                  <thead>
                    <tr>
                      <th>ശാഖ</th>
                      <th>എണ്ണം</th>
                      <th>ഹാജർ</th>
                      <th>അഞ്ച് സ്ലോട്ട്</th>
                      <th>നില</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && !rows.length ? (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          ശാഖ വിവരങ്ങൾ എടുക്കുന്നു…
                        </td>
                      </tr>
                    ) : error && !rows.length ? (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          {error}
                        </td>
                      </tr>
                    ) : branches.length ? (
                      branches.map((branch) => (
                        <tr key={branch.key}>
                          <td>
                            <button
                              className="branch-link"
                              type="button"
                              aria-expanded={selectedBranch === branch.key}
                              aria-controls="branch-detail"
                              onClick={() =>
                                setSelectedBranch((current) =>
                                  current === branch.key ? null : branch.key,
                                )
                              }
                            >
                              <span>{branch.name}</span>
                              <svg
                                className="icon"
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M10 3v14M3 10h14"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                />
                              </svg>
                            </button>
                          </td>
                          <td>
                            <strong>{branch.count}</strong>
                          </td>
                          <td>{branch.checked}</td>
                          <td>
                            <span
                              className="admin-slots"
                              aria-label={`5-ൽ ${Math.min(
                                branch.count,
                                5,
                              )} സ്ലോട്ടുകൾ പൂർത്തിയായി`}
                            >
                              {Array.from({ length: 5 }).map((_, index) => (
                                <span
                                  className={`admin-slot${
                                    index < branch.count ? " is-filled" : ""
                                  }`}
                                  key={index}
                                />
                              ))}
                            </span>
                          </td>
                          <td>
                            {branch.count >= TARGET_PER_BRANCH ? (
                              <span className="status-met">ലക്ഷ്യം കൈവരിച്ചു</span>
                            ) : (
                              <span className="status-pending">
                                ഇനി {TARGET_PER_BRANCH - branch.count} പേർ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          രജിസ്ട്രേഷനുകൾ ഇതുവരെ ഇല്ല.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedBranchDetail && (
              <section
                className="branch-detail"
                id="branch-detail"
                ref={branchDetailRef}
                aria-labelledby="branch-detail-title"
              >
                <div className="branch-detail-head">
                  <div>
                    <p className="micro" lang="en">
                      Branch roster
                    </p>
                    <h4 id="branch-detail-title">
                      {selectedBranchDetail.name}
                    </h4>
                    <p className="branch-detail-meta">
                      {selectedBranchDetail.count} രജിസ്ട്രേഷൻ ·{" "}
                      {selectedBranchDetail.checked} ഹാജർ
                    </p>
                  </div>
                  <button
                    className="text-button branch-detail-close"
                    type="button"
                    onClick={() => setSelectedBranch(null)}
                  >
                    അടയ്ക്കുക
                  </button>
                </div>

                <div
                  className="table-scroll"
                  tabIndex={0}
                  aria-label={`${selectedBranchDetail.name} ശാഖയിലെ രജിസ്ട്രേഷനുകൾ; കൂടുതൽ കാണാൻ വലത്തേക്ക് സ്ക്രോൾ ചെയ്യുക`}
                >
                  <table className="branch-roster-table">
                    <thead>
                      <tr>
                        <th>പേര്</th>
                        <th>ചുമതല</th>
                        <th>മൊബൈൽ</th>
                        <th>ഹാജർ</th>
                        <th>ഹാജർ സമയം</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBranchDetail.rows.length ? (
                        selectedBranchDetail.rows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.full_name}</strong>
                            </td>
                            <td>{row.role}</td>
                            <td className="cell-phone">{row.phone}</td>
                            <td>
                              {row.checked_in_at ? (
                                <span className="status-met">ഹാജർ</span>
                              ) : (
                                <span className="status-pending">ഇല്ല</span>
                              )}
                            </td>
                            <td className="cell-time">
                              {row.checked_in_at
                                ? formatMalayalamDate(row.checked_in_at)
                                : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="empty-row">
                            ഈ ശാഖയിൽ ഇതുവരെ രജിസ്ട്രേഷനുകൾ ഇല്ല.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="admin-section" aria-labelledby="full-table-title">
              <h3 id="full-table-title">മുഴുവൻ പട്ടിക</h3>
              <div
                className="table-scroll"
                tabIndex={0}
                aria-label="മുഴുവൻ രജിസ്ട്രേഷൻ പട്ടിക; കൂടുതൽ കാണാൻ വലത്തേക്ക് സ്ക്രോൾ ചെയ്യുക"
              >
                <table className="full-table admin-full-table">
                  <thead>
                    <tr>
                      <th>രജിസ്ട്രേഷൻ ID</th>
                      <th>പേര്</th>
                      <th>മൊബൈൽ</th>
                      <th>ശാഖ</th>
                      <th>ചുമതല</th>
                      <th>ഫോട്ടോ</th>
                      <th>പാസ്</th>
                      <th>ഹാജർ</th>
                      <th>ഹാജർ സമയം</th>
                      <th>രജിസ്ട്രേഷൻ സമയം</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((row) => (
                        <tr key={row.id}>
                          <td className="cell-id">{row.registration_code}</td>
                          <td>{row.full_name}</td>
                          <td className="cell-phone">{row.phone}</td>
                          <td>{row.branch_name}</td>
                          <td>{row.role}</td>
                          <td>{row.photo_key ? "ഉണ്ട്" : "—"}</td>
                          <td>
                            <Link
                              className="table-link"
                              href={`/pass/${row.qr_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              തുറക്കുക
                            </Link>
                          </td>
                          <td>
                            {row.checked_in_at ? (
                              <span className="status-met">ഹാജർ</span>
                            ) : (
                              <span className="status-pending">ഇല്ല</span>
                            )}
                          </td>
                          <td className="cell-time">
                            {row.checked_in_at
                              ? formatMalayalamDate(row.checked_in_at)
                              : "—"}
                          </td>
                          <td className="cell-time">
                            {formatMalayalamDate(row.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="empty-row">
                          രജിസ്ട്രേഷനുകൾ ഇതുവരെ ഇല്ല.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
