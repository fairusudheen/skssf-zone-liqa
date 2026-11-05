"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PassCard from "@/components/PassCard";
import PhotoField from "@/components/PhotoField";
import { BRANCHES, ROLES, TARGET_PER_BRANCH } from "@/lib/constants";
import type { PassData } from "@/lib/types";

type FieldKey = "fullName" | "phone" | "branch" | "role";
type FieldErrors = Record<FieldKey, string>;

interface RegisterResult {
  registrationId: string;
  registrationCode: string;
  token: string;
  name: string;
  branch: string;
  role: string;
  branchTotal: number;
  createdAt: string;
  passUrl: string;
  qrDataUrl: string;
  photoUrl: string | null;
}

const emptyErrors: FieldErrors = {
  fullName: "",
  phone: "",
  branch: "",
  role: "",
};

function countLetters(value: string) {
  return (value.match(/[\p{L}\p{M}]/gu) || []).length;
}

function validate(fullName: string, phone: string, branch: string, role: string): FieldErrors {
  const errors = { ...emptyErrors };

  if (!fullName.trim()) {
    errors.fullName = "ദയവായി നിങ്ങളുടെ പൂർണ്ണമായ പേര് നൽകുക.";
  } else if (countLetters(fullName.trim()) < 2) {
    errors.fullName = "പേര് കുറഞ്ഞത് രണ്ട് അക്ഷരങ്ങളെങ്കിലും ഉൾപ്പെടുത്തുക.";
  }

  if (!phone.trim()) {
    errors.phone = "ദയവായി മൊബൈൽ നമ്പർ നൽകുക.";
  } else if (!/^[6-9]\d{9}$/.test(phone.trim())) {
    errors.phone =
      "മൊബൈൽ നമ്പർ 6, 7, 8 അല്ലെങ്കിൽ 9 എന്നിവയിൽ ഒന്നിൽ തുടങ്ങി കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം.";
  }

  if (!branch) {
    errors.branch = "ദയവായി ശാഖ തിരഞ്ഞെടുക്കുക.";
  } else if (!(BRANCHES as readonly string[]).includes(branch)) {
    errors.branch = "പട്ടികയിൽ നിന്ന് ശരിയായ ശാഖ തിരഞ്ഞെടുക്കുക.";
  }

  if (!role) {
    errors.role = "ദയവായി SKSSF-ലെ ചുമതല തിരഞ്ഞെടുക്കുക.";
  } else if (!(ROLES as readonly string[]).includes(role)) {
    errors.role = "പട്ടികയിൽ നിന്ന് ശരിയായ ചുമതല തിരഞ്ഞെടുക്കുക.";
  }

  return errors;
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, index) => (
        <span
          className="confetti-piece"
          key={index}
          style={
            {
              left: `${(index * 37) % 100}%`,
              animationDelay: `${(index % 8) * 0.045}s`,
              "--drift": `${((index * 29) % 140) - 70}px`,
              "--spin": `${180 + ((index * 47) % 420)}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function RegistrationSection() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [role, setRole] = useState("");
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    fullName: false,
    phone: false,
    branch: false,
    role: false,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoWorking, setPhotoWorking] = useState(false);
  const previewRef = useRef<string | null>(null);

  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [phoneServerError, setPhoneServerError] = useState("");
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [success, setSuccess] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const branchRef = useRef<HTMLSelectElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);

  const errors = useMemo(
    () => validate(fullName, phone, branch, role),
    [fullName, phone, branch, role],
  );

  useEffect(() => {
    let active = true;

    async function loadQuotas() {
      try {
        const response = await fetch("/api/branch-quota", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          branches?: { name: string; registered: number }[];
        };
        if (!active || !Array.isArray(payload.branches)) return;
        setQuotas(
          Object.fromEntries(
            payload.branches.map((item) => [item.name, item.registered]),
          ),
        );
      } catch {
        // The meter simply stays at its last known value.
      }
    }

    loadQuotas();
    const timer = window.setInterval(() => {
      if (!document.hidden) loadQuotas();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      successTitleRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [success]);

  const branchCount = branch ? quotas[branch] ?? 0 : 0;
  const filledSlots = Math.min(branchCount, TARGET_PER_BRANCH);

  function fieldError(key: FieldKey) {
    if (key === "phone" && phoneServerError) return phoneServerError;
    return errors[key];
  }

  function fieldClass(key: FieldKey) {
    const error = fieldError(key);
    const value =
      key === "fullName"
        ? fullName
        : key === "phone"
          ? phone
          : key === "branch"
            ? branch
            : role;
    return [
      "field",
      touched[key] && value && !error ? "is-valid" : "",
      touched[key] && error ? "is-invalid" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function note(key: FieldKey) {
    if (!touched[key]) return "";
    const error = fieldError(key);
    if (error) return error;
    const value =
      key === "fullName"
        ? fullName
        : key === "phone"
          ? phone
          : key === "branch"
            ? branch
            : role;
    return value ? "ശരിയായി." : "";
  }

  function markTouched(key: FieldKey) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  function handlePhoto(file: File, previewUrl: string) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setPhotoError("");
  }

  function clearPhoto() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError("");
  }

  function resetFields(keepBranch: boolean) {
    setFullName("");
    setPhone("");
    setRole("");
    if (!keepBranch) setBranch("");
    setTouched({ fullName: false, phone: false, branch: false, role: false });
    setStatus("");
    setPhoneServerError("");
    setPhotoError("");
    clearPhoto();
    setResult(null);
    setSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (photoWorking) {
      setStatus("ഫോട്ടോ തയ്യാറാക്കുന്നു. അൽപ്പസമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.");
      return;
    }

    setTouched({ fullName: true, phone: true, branch: true, role: true });
    setPhoneServerError("");
    setStatus("");

    const currentErrors = validate(fullName, phone, branch, role);
    const keys: FieldKey[] = ["fullName", "phone", "branch", "role"];
    const firstInvalid = keys.find((key) => currentErrors[key]);

    if (firstInvalid) {
      const refs = {
        fullName: nameRef,
        phone: phoneRef,
        branch: branchRef,
        role: roleRef,
      };
      refs[firstInvalid].current?.focus();
      setStatus("ചില വിവരങ്ങൾ ശരിയാക്കുക. തുടർന്ന് വീണ്ടും ശ്രമിക്കുക.");
      return;
    }

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("fullName", fullName.trim());
      form.append("phone", phone.trim());
      form.append("branch", branch);
      form.append("role", role);
      if (photoFile) form.append("photo", photoFile, photoFile.name);

      const response = await fetch("/api/register", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as
        | (RegisterResult & { code?: string; message?: string })
        | null;

      if (!response.ok || !payload) {
        if (payload?.code === "DUPLICATE_PHONE") {
          const message =
            "ഈ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് രജിസ്ട്രേഷൻ നടത്തിയിട്ടുണ്ട്. മറ്റൊരു നമ്പർ ഉപയോഗിക്കുക.";
          setPhoneServerError(message);
          setStatus(message);
          phoneRef.current?.focus();
          return;
        }

        if (payload?.code === "DATABASE_NOT_CONFIGURED") {
          setStatus(
            "ഡാറ്റാബേസ് ബന്ധം ഇതുവരെ ക്രമീകരിച്ചിട്ടില്ല. ദയവായി സംഘാടകരെ ബന്ധപ്പെടുക.",
          );
          return;
        }

        if (
          payload?.code === "PHOTO_TOO_LARGE" ||
          payload?.code === "INVALID_PHOTO" ||
          payload?.code === "INVALID_PHOTO_TYPE" ||
          payload?.code === "PHOTO_UPLOAD_FAILED" ||
          payload?.code === "PHOTO_STORAGE_NOT_CONFIGURED"
        ) {
          setPhotoError(payload.message || "ഫോട്ടോ ശരിയല്ല. മറ്റൊരു ഫോട്ടോ തിരഞ്ഞെടുക്കുക.");
          setStatus(payload.message || "ഫോട്ടോ ശരിയല്ല.");
          return;
        }

        setStatus(
          payload?.message ||
            "രജിസ്ട്രേഷൻ പൂർത്തിയായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
        );
        return;
      }

      setResult(payload);
      setQuotas((current) => ({
        ...current,
        [payload.branch]: payload.branchTotal,
      }));
      setSuccess(true);
    } catch (error) {
      if (error instanceof TypeError) {
        setStatus("ഇന്റർനെറ്റ് ബന്ധം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.");
      } else {
        setStatus("രജിസ്ട്രേഷൻ പൂർത്തിയായില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddAnother() {
    resetFields(true);
    window.setTimeout(() => nameRef.current?.focus(), 60);
  }

  function handleNewBranch() {
    resetFields(false);
    window.setTimeout(() => nameRef.current?.focus(), 60);
  }

  const passData: PassData | null = result
    ? {
        name: result.name,
        branch: result.branch,
        role: result.role,
        token: result.token,
        code: result.registrationCode,
        photoUrl: result.photoUrl || photoPreview,
        qrDataUrl: result.qrDataUrl,
        createdAt: result.createdAt,
      }
    : null;

  return (
    <section
      className="registration main-section"
      id="register"
      aria-labelledby="registration-title"
    >
      <div className="shell">
        <div className="section-top">
          <span className="micro" lang="en">
            03 / Your name here
          </span>
          <span className="micro" lang="en">
            Registration / 2026
          </span>
        </div>
        <div className="registration-heading reveal">
          <h2 id="registration-title">
            നിങ്ങളുടെ പേര്
            <br />
            ചേർക്കൂ.
          </h2>
          <p>
            ഒരു ശാഖ, അഞ്ച് പേർ. ഒരാളെ രജിസ്റ്റർ ചെയ്ത ശേഷം അതേ ശാഖയിൽ
            നിന്ന് അടുത്തയാളെ എളുപ്പം ചേർക്കാം.
          </p>
        </div>

        <div className="registration-layout">
          <aside
            className="quota-panel"
            aria-label="ശാഖയുടെ അഞ്ച് പേർ എന്ന ലക്ഷ്യം"
          >
            <div className="quota-number" aria-hidden="true">
              5
            </div>
            <div className="quota-info">
              <p className="quota-title">
                ഈ ശാഖയിൽ
                <br />
                ആകെ ചേർത്തത്
              </p>
              <p className="quota-copy">
                {branch
                  ? "ഈ ശാഖയിൽ നിന്ന് ആകെ രജിസ്റ്റർ ചെയ്ത പേർ."
                  : "ശാഖ തിരഞ്ഞെടുക്കുമ്പോൾ ആകെ രജിസ്റ്റർ ചെയ്ത എണ്ണം ഇവിടെ കാണാം."}
              </p>
            </div>
            <div className="five-slots" aria-hidden="true">
              {Array.from({ length: TARGET_PER_BRANCH }).map((_, index) => (
                <span
                  className={`slot${index < filledSlots ? " is-filled" : ""}`}
                  key={index}
                >
                  0{index + 1}
                </span>
              ))}
            </div>
            <p
              className="quota-count"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{branchCount}</span> / {TARGET_PER_BRANCH}{" "}
              <span className="micro" lang="en">
                Added
              </span>
            </p>
          </aside>

          <div className="form-wrap">
            {success && passData && result ? (
              <section
                className="success is-new"
                aria-labelledby="success-title"
                ref={successRef}
              >
                <Confetti />
                <h2
                  className="success-heading"
                  id="success-title"
                  tabIndex={-1}
                  ref={successTitleRef}
                >
                  പേര് ചേർത്തു.
                </h2>

                <PassCard data={passData} withActions />

                <div className="success-progress">
                  <div className="success-progress-head">
                    <h3>ഈ ശാഖയിൽ നിന്ന് ആകെ</h3>
                    <span className="success-count">
                      {result.branchTotal} / {TARGET_PER_BRANCH}
                    </span>
                  </div>
                  <div className="five-slots" aria-hidden="true">
                    {Array.from({ length: TARGET_PER_BRANCH }).map((_, index) => (
                      <span
                        className={`slot${
                          index < Math.min(result.branchTotal, TARGET_PER_BRANCH)
                            ? " is-filled"
                            : ""
                        }`}
                        key={index}
                      >
                        0{index + 1}
                      </span>
                    ))}
                  </div>
                  <p className="success-note">
                    {result.branchTotal >= TARGET_PER_BRANCH
                      ? "ഈ ശാഖയുടെ അഞ്ച് പേരുടെ ലക്ഷ്യം പൂർത്തിയായി. ആവശ്യമെങ്കിൽ കൂടുതൽ പേരെ ചേർക്കാം."
                      : `ഈ ശാഖയിൽ നിന്ന് അഞ്ച് പേർ എന്ന ലക്ഷ്യം പൂർത്തിയാക്കാൻ ഇനി ${
                          TARGET_PER_BRANCH - result.branchTotal
                        } പേർ വേണം.`}
                  </p>
                </div>

                <div className="success-actions">
                  <button
                    className="button button-highlight"
                    type="button"
                    onClick={handleAddAnother}
                    data-magnetic
                  >
                    <span>ഇതേ ശാഖയിൽ നിന്ന് മറ്റൊരാളെ ചേർക്കുക</span>
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
                  <button
                    className="text-button"
                    type="button"
                    onClick={handleNewBranch}
                  >
                    വേറൊരു ശാഖ തിരഞ്ഞെടുക്കുക
                  </button>
                </div>
              </section>
            ) : (
              <form id="registration-form" onSubmit={handleSubmit} noValidate>
                <div className="form-intro">
                  <span>
                    പേര്, നമ്പർ, ശാഖ, ചുമതല നിർബന്ധം. ഫോട്ടോ ഐച്ഛികം.
                  </span>
                  <span className="micro" lang="en">
                    Secure registration
                  </span>
                </div>

                <div className="field-grid">
                  <div className={fieldClass("fullName")} data-field="fullName">
                    <div className="field-head">
                      <span className="field-index" lang="en">
                        01
                      </span>
                      <label className="field-label" htmlFor="full-name">
                        പൂർണ്ണമായ പേര്
                      </label>
                    </div>
                    <div className="field-control">
                      <input
                        ref={nameRef}
                        id="full-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        maxLength={100}
                        placeholder="നിങ്ങളുടെ പേര്"
                        aria-describedby="full-name-note"
                        aria-invalid={
                          touched.fullName && Boolean(fieldError("fullName"))
                        }
                        required
                        value={fullName}
                        disabled={submitting}
                        onChange={(event) => setFullName(event.target.value)}
                        onBlur={() => markTouched("fullName")}
                      />
                      <span className="valid-mark" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <path
                            d="m4 10 4 4 8-9"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                    </div>
                    <p
                      className="field-note"
                      id="full-name-note"
                      aria-live="polite"
                    >
                      {note("fullName")}
                    </p>
                  </div>

                  <div className={fieldClass("phone")} data-field="phone">
                    <div className="field-head">
                      <span className="field-index" lang="en">
                        02
                      </span>
                      <label className="field-label" htmlFor="phone">
                        മൊബൈൽ നമ്പർ
                      </label>
                    </div>
                    <div className="field-control">
                      <input
                        ref={phoneRef}
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        pattern="[6-9][0-9]{9}"
                        placeholder="10 അക്ക നമ്പർ"
                        aria-describedby="phone-note"
                        aria-invalid={
                          touched.phone && Boolean(fieldError("phone"))
                        }
                        required
                        value={phone}
                        disabled={submitting}
                        onChange={(event) => {
                          setPhone(
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          );
                          setPhoneServerError("");
                        }}
                        onBlur={() => markTouched("phone")}
                      />
                      <span className="valid-mark" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <path
                            d="m4 10 4 4 8-9"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </span>
                    </div>
                    <p className="field-note" id="phone-note" aria-live="polite">
                      {note("phone")}
                    </p>
                  </div>
                </div>

                <div className={fieldClass("branch")} data-field="branch">
                  <div className="field-head">
                    <span className="field-index" lang="en">
                      03
                    </span>
                    <label className="field-label" htmlFor="branch">
                      ശാഖയുടെ പേര്
                    </label>
                  </div>
                  <div className="field-control">
                    <select
                      ref={branchRef}
                      className="branch-select"
                      id="branch"
                      name="branch"
                      aria-describedby="branch-note"
                      aria-invalid={
                        touched.branch && Boolean(fieldError("branch"))
                      }
                      required
                      value={branch}
                      disabled={submitting}
                      onChange={(event) => {
                        setBranch(event.target.value);
                        markTouched("branch");
                      }}
                      onBlur={() => markTouched("branch")}
                    >
                      <option value="">ശാഖ തിരഞ്ഞെടുക്കുക</option>
                      {BRANCHES.map((name) => (
                        <option value={name} key={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <span className="valid-mark" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path
                          d="m4 10 4 4 8-9"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    <svg
                      className="select-arrow icon"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m4 7 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  </div>
                  <p className="field-note" id="branch-note" aria-live="polite">
                    {note("branch")}
                  </p>
                </div>

                <div className={fieldClass("role")} data-field="role">
                  <div className="field-head">
                    <span className="field-index" lang="en">
                      04
                    </span>
                    <label className="field-label" htmlFor="role">
                      SKSSF-ലെ ചുമതല
                    </label>
                  </div>
                  <div className="field-control">
                    <select
                      ref={roleRef}
                      id="role"
                      name="role"
                      aria-describedby="role-note"
                      aria-invalid={touched.role && Boolean(fieldError("role"))}
                      required
                      value={role}
                      disabled={submitting}
                      onChange={(event) => {
                        setRole(event.target.value);
                        markTouched("role");
                      }}
                      onBlur={() => markTouched("role")}
                    >
                      <option value="">ചുമതല തിരഞ്ഞെടുക്കുക</option>
                      {ROLES.map((name) => (
                        <option value={name} key={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <span className="valid-mark" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path
                          d="m4 10 4 4 8-9"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    <svg
                      className="select-arrow icon"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m4 7 6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  </div>
                  <p className="field-note" id="role-note" aria-live="polite">
                    {note("role")}
                  </p>
                </div>

                <PhotoField
                  preview={photoPreview}
                  error={photoError}
                  onFile={handlePhoto}
                  onClear={clearPhoto}
                  onBusyChange={setPhotoWorking}
                  disabled={submitting}
                />

                <div className="form-footer">
                  <button
                    className="button button-highlight submit-button"
                    id="submit-button"
                    type="submit"
                    disabled={submitting || photoWorking}
                    aria-busy={submitting || photoWorking}
                    data-magnetic
                  >
                    <span>
                      {photoWorking
                        ? "ഫോട്ടോ തയ്യാറാക്കുന്നു…"
                        : submitting
                          ? "രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുന്നു…"
                          : "രജിസ്ട്രേഷൻ പൂർത്തിയാക്കുക"}
                    </span>
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
                  <p className="form-privacy">
                    നിങ്ങളുടെ വിവരങ്ങളും ഫോട്ടോയും സംഘാടകർക്ക് മാത്രം
                    കാണാവുന്ന രീതിയിൽ സൂക്ഷിക്കും.
                  </p>
                </div>
                <p
                  className={`form-status${status ? " is-error" : ""}`}
                  id="form-status"
                  role="alert"
                  aria-live="assertive"
                >
                  {status}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
