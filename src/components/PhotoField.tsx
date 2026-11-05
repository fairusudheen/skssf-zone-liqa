"use client";

/* eslint-disable @next/next/no-img-element */

import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export default function PhotoField({
  preview,
  error,
  onFile,
  onClear,
  onBusyChange,
  disabled = false,
}: {
  preview: string | null;
  error: string;
  onFile: (file: File, previewUrl: string) => void;
  onClear: () => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState("");

  function updateWorking(value: boolean) {
    setWorking(value);
    onBusyChange?.(value);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLocalError("");

    if (!ALLOWED.includes(file.type)) {
      setLocalError("JPG, PNG, WebP അല്ലെങ്കിൽ HEIC ഫോട്ടോ തിരഞ്ഞെടുക്കുക.");
      return;
    }

    if (file.size > MAX_INPUT_BYTES) {
      setLocalError("ഫോട്ടോയുടെ വലുപ്പം 12 MB-യിൽ കുറവായിരിക്കണം.");
      return;
    }

    updateWorking(true);
    let candidate = file;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2.4,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.84,
      });
      candidate = new File(
        [compressed],
        `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`,
        { type: "image/webp" },
      );
    } catch {
      candidate = file;
    }

    if (candidate.size > MAX_UPLOAD_BYTES) {
      updateWorking(false);
      setLocalError("ഫോട്ടോ ചെറുതാക്കാനായില്ല. മറ്റൊരു ഫോട്ടോ തിരഞ്ഞെടുക്കുക.");
      return;
    }

    onFile(candidate, URL.createObjectURL(candidate));
    updateWorking(false);
  }

  const shownError = localError || error;

  return (
    <div className={`field photo-field${shownError ? " is-invalid" : ""}`}>
      <div className="field-head">
        <span className="field-index" lang="en">
          05
        </span>
        <label className="field-label" htmlFor="photo">
          ഫോട്ടോ <span className="optional-tag">ഐച്ഛികം</span>
        </label>
      </div>

      <div className="photo-upload">
        <div className="photo-preview" aria-hidden="true">
          {preview ? (
            <img src={preview} alt="" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          )}
        </div>

        <div className="photo-copy">
          <div className="photo-actions">
            <label
              className="button photo-pick"
              htmlFor="photo"
              aria-disabled={disabled || working}
            >
              <span>
                {working
                  ? "ഫോട്ടോ തയ്യാറാക്കുന്നു…"
                  : preview
                    ? "ഫോട്ടോ മാറ്റുക"
                    : "ഫോട്ടോ തിരഞ്ഞെടുക്കുക"}
              </span>
              <svg
                className="icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 15V5h3l1.4-2h5.2L14 5h3v10H3Zm9-4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </label>
            <input
              ref={inputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="photo-input"
              onChange={handleChange}
              disabled={working || disabled}
            />
            {preview && (
              <button
                className="text-button photo-remove"
                type="button"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = "";
                  setLocalError("");
                  onClear();
                }}
                disabled={disabled}
              >
                ഒഴിവാക്കുക
              </button>
            )}
          </div>
          <p className="photo-note">
            പാസിലും സംഘാടകരുടെ ഹാജർ പട്ടികയിലും ഈ ഫോട്ടോ
            ഉപയോഗിക്കും. JPG, PNG അല്ലെങ്കിൽ WebP.
          </p>
        </div>
      </div>

      <p className="field-note photo-note-status" aria-live="polite">
        {shownError}
      </p>
    </div>
  );
}
