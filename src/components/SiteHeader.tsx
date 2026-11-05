"use client";

import Link from "next/link";
import { toggleTheme, useTheme } from "@/lib/theme";

export default function SiteHeader() {
  const theme = useTheme();

  return (
    <header className="site-header" aria-label="പ്രധാന തലക്കെട്ട്">
      <Link
        className="brand"
        href="/#top"
        aria-label="SKSSF PAYYANUR / 2026 — ലിഖാഅ് ആദ്യത്തേക്ക്"
      >
        <span className="brand-main" lang="en">
          SKSSF
        </span>
        <span className="brand-place" lang="en">
          PAYYANUR / 2026
        </span>
      </Link>
      <nav className="header-actions" aria-label="പ്രധാന നാവിഗേഷൻ">
        <button
          className="header-action"
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "LIGHT — വെളുത്ത പശ്ചാത്തലം ഉപയോഗിക്കുക"
              : "DARK — ഇരുണ്ട പശ്ചാത്തലം ഉപയോഗിക്കുക"
          }
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? "LIGHT" : "DARK"}
        </button>
        <Link className="header-action" href="/admin">
          ADMIN
        </Link>
        <Link className="header-action header-register" href="/#register">
          <span lang="en">REGISTER</span>
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
      </nav>
    </header>
  );
}
