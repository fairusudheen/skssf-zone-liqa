# ലിഖാഅ് (LIQA') 2026 — Next.js

Registration, photo pass, QR check-in, and organiser dashboard for the SKSSF
Payyanur regional meet on 13 November 2026 at 6 PM.

The original static site in the parent folder (`index.html`) is untouched while
this replacement is prepared.

## What is included

- Malayalam registration form with the 22 branches and 8 roles
- Shared per-branch count with a target of five
- Optional delegate photo (compressed in the browser, processed with `sharp`)
- Private Cloudflare R2 photo storage
- ID-card style pass with QR code
- PNG and PDF pass downloads
- Public pass page at `/pass/[token]`
- Organiser login, live dashboard, CSV export, and attendance counts
- Camera QR scanner at `/admin/scan` with manual token fallback
- Atomic, duplicate-safe attendance marking for multiple organisers

## Stack

- Next.js App Router + TypeScript on Vercel
- Supabase Postgres + Auth
- Cloudflare R2 (private bucket) through `@aws-sdk/client-s3`
- `qrcode` for QR generation, `html-to-image` + `jspdf` for downloads
- `@zxing/browser` for camera scanning

## 1. Create the Supabase project

1. Create a new Supabase project.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. Go to **Authentication → Users → Add user** and create each organiser
   account with an email and password. Confirm the email if confirmation is
   enabled.
4. Copy the user's UUID and register it as an organiser:

```sql
insert into public.organisers (user_id)
values ('THE-USER-UUID')
on conflict (user_id) do nothing;
```

No RLS policies are created on purpose. The browser never reads these tables
directly; the Next.js server uses the service-role key and verifies organiser
membership before returning any data.

## 2. Create the R2 bucket

1. In Cloudflare, open **R2 → Create bucket** and name it
   `skssf-zone`. Keep public access **disabled**.
2. Open **R2 → Manage R2 API Tokens → Create API token**.
3. Give it **Object Read & Write** permission limited to this bucket.
4. Note the **Access Key ID**, **Secret Access Key**, and the account ID from
   the Cloudflare dashboard URL.

Photos are uploaded and read only by the server. The bucket does not need a
public hostname or CORS rules.

## 3. Environment variables

Copy `.env.example` to `.env.local` for development and add the same values in
Vercel under **Project → Settings → Environment Variables**.

```sh
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key; never expose it |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | `skssf-zone` |
| `NEXT_PUBLIC_SITE_URL` | Final public URL used inside QR codes |

`NEXT_PUBLIC_SITE_URL` must be the production domain before delegates register,
because the QR code encodes a link to `/pass/[token]`.

## 4. Run locally

```sh
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```sh
npm run build
npm run start
npm run lint
```

## 5. Deploy to Vercel

1. Push this folder to a Git repository.
2. In Vercel, **Add New → Project** and import the repository.
3. Framework preset: **Next.js** (build and output settings are automatic).
4. Add every environment variable from `.env.local`.
5. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.

Do not use the service-role key or R2 credentials in any `NEXT_PUBLIC_`
variable.

## How check-in works

- The QR code contains only
  `https://your-domain/pass/<random-uuid>`.
- An organiser opens `/admin/scan`, signs in, and scans the pass.
- `/api/attendance` verifies the organiser's Supabase session and calls
  `mark_attendance(token, organiser_id)`.
- `attendance.registration_id` is a primary key, so a second scan returns
  **already checked in** with the original timestamp instead of creating a
  duplicate.
- Multiple organisers can scan at the same time; Postgres resolves races.

## Photo handling

- The browser resizes and compresses the image before upload.
- The server validates the MIME type and 4 MB request limit, then uses `sharp`
  to auto-rotate, crop to 720 × 900, strip metadata, and write WebP.
- Objects are stored under `photos/<uuid>.webp` in the private R2 bucket.
- The pass page and scanner fetch the image server-side and return it as a data
  URL, so the bucket stays private.

## Fresh data

This schema starts empty. Do not import rows from the old static-site project
unless you also migrate their generated QR tokens; the old rows have no pass
tokens or photo keys.

## Useful checks before launch

- Register one delegate with and one without a photo.
- Download both PNG and PDF passes on a phone.
- Open the pass link on another device.
- Scan the same pass twice and confirm the second result says already checked in.
- Scan from two organiser phones at the same time.
- Export CSV and confirm Malayalam text opens correctly in Excel/Sheets.
- Run `npm run build` and `npm run lint`.
