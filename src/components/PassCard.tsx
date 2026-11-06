/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { EVENT } from "@/lib/constants";
import type { PassData } from "@/lib/types";

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

export default function PassCard({
  data,
  withActions = false,
}: {
  data: PassData;
  withActions?: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const initial = Array.from(data.name.trim())[0] || "L";
  const fileBase = `liqa-2026-pass-${safeFilename(data.code || data.token)}`;

  async function renderCard(format: "png" | "jpeg"): Promise<string> {
    if (!cardRef.current) throw new Error("PASS_NOT_READY");
    if (document.fonts?.ready) await document.fonts.ready;
    const { toJpeg, toPng } = await import("html-to-image");
    const options = {
      pixelRatio: 2,
      backgroundColor: "#F1F3F7",
      cacheBust: true,
    };
    return format === "png"
      ? toPng(cardRef.current, options)
      : toJpeg(cardRef.current, { ...options, quality: 0.92 });
  }

  async function downloadPng() {
    setBusy("png");
    setMessage("");
    try {
      const dataUrl = await renderCard("png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileBase}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setMessage("PNG ഡൗൺലോഡ് പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    setMessage("");
    try {
      const dataUrl = await renderCard("jpeg");
      const { jsPDF } = await import("jspdf");

      const image = new Image();
      image.src = dataUrl;
      await image.decode();

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const ratio = Math.min(
        (pageWidth - margin * 2) / image.naturalWidth,
        (pageHeight - margin * 2) / image.naturalHeight,
      );
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;

      pdf.addImage(
        dataUrl,
        "JPEG",
        (pageWidth - width) / 2,
        margin,
        width,
        height,
      );
      pdf.save(`${fileBase}.pdf`);
    } catch {
      setMessage("PDF ഡൗൺലോഡ് പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/pass/${data.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setMessage("ലിങ്ക് പകർത്താനായില്ല. വിലാസം സ്വമേധയാ പകർത്തുക.");
    }
  }

  return (
    <div className="pass-block">
      <article
        className="pass"
        ref={cardRef}
        aria-label={`${data.name} — രജിസ്ട്രേഷൻ പാസ്`}
      >
        <div className="pass-top">
          <span className="micro" lang="en">
            LIQA&apos; 2026 / Entry pass
          </span>
          <span className="micro" lang="en">
            13 NOV / Payyanur
          </span>
        </div>
        <div className="pass-body">
          <p className="pass-label">രജിസ്ട്രേഷൻ പാസ്</p>

          <div className="pass-headline">
            <div className="pass-photo">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt="" />
              ) : (
                <span aria-hidden="true">{initial}</span>
              )}
            </div>

            <div className="pass-headline-info">
              <h3 className="pass-name">{data.name}</h3>
              <p className="pass-role-line">
                {data.role} <span aria-hidden="true">·</span> {data.branch}
              </p>
              <p className="pass-code-label" lang="en">
                Delegate / 2026
              </p>
            </div>

            <div className="pass-qr">
              <img
                src={data.qrDataUrl}
                alt="ചെക്ക്-ഇൻ ക്യൂ ആർ കോഡ്"
                width={132}
                height={132}
              />
              <span lang="en">SCAN TO CHECK IN</span>
            </div>
          </div>

          <div className="pass-grid">
            <div>
              <p className="pass-label">ശാഖ</p>
              <p className="pass-value">{data.branch}</p>
            </div>
            <div>
              <p className="pass-label">ചുമതല</p>
              <p className="pass-value">{data.role}</p>
            </div>
            <div>
              <p className="pass-label">തീയതി</p>
              <p className="pass-value">{EVENT.dateLabel}</p>
            </div>
            <div>
              <p className="pass-label">സ്ഥലം</p>
              <p className="pass-value">{EVENT.venue}</p>
            </div>
          </div>

          <div className="pass-code-row">
            <span className="pass-code-label" lang="en">
              Registration ID
            </span>
            <p className="pass-id">{data.code}</p>
          </div>
        </div>
        <div className="pass-footer">
          <span>SKSSF പയ്യന്നൂർ മേഖലാ കമ്മിറ്റി</span>
          <span lang="en">liqa 2026</span>
        </div>
      </article>

      {withActions && (
        <div className="pass-actions">
          <div className="pass-downloads">
            <button
              className="button button-highlight"
              type="button"
              onClick={downloadPng}
              disabled={busy !== null}
            >
              <span>{busy === "png" ? "തയ്യാറാക്കുന്നു…" : "PNG ഡൗൺലോഡ്"}</span>
              <svg
                className="icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 3v10m-4-4 4 4 4-4M3 16h14"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </button>
            <button
              className="button"
              type="button"
              onClick={downloadPdf}
              disabled={busy !== null}
            >
              <span>{busy === "pdf" ? "തയ്യാറാക്കുന്നു…" : "PDF ഡൗൺലോഡ്"}</span>
              <svg
                className="icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 2h7l3 3v13H5V2Zm7 0v4h4M8 11h4M8 14h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
          <button className="text-button pass-copy" type="button" onClick={copyLink}>
            {copied ? "ലിങ്ക് പകർത്തി." : "പാസ് ലിങ്ക് പകർത്തുക"}
          </button>
          {message && (
            <p className="pass-action-status" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
