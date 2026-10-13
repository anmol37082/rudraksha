# Wedding / Event Staff Recruitment App

One Next.js app (App Router + TypeScript) with API Route Handlers, MongoDB (Mongoose), Tailwind CSS and Cloudinary.
Flow: candidate applies → admin reviews → shortlist → interview → select → permanent staff.

## Stack
Next.js 15, React 19, TypeScript, MongoDB + Mongoose, Tailwind CSS 4, Cloudinary, Zod, bcryptjs, jsonwebtoken.
(`@tailwindcss/postcss` is the PostCSS plugin Tailwind 4 needs. There are no other packages.)

## Setup
```bash
npm install
cp .env.example .env           # then fill in the values
npm run seed:admin -- admin@yourcompany.com --generate 'Admin Name'  # or provide a password (10+ characters)
npm run dev                    # http://localhost:3000
```
Admin login: `/admin/login`. Candidates register at `/register`.

## Environment
```env
MONGODB_URI=                  # MongoDB Atlas connection string
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
JWT_SECRET=                   # 32+ random chars: openssl rand -base64 48
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Customise
- Company name, contact details and FAQ: `lib/site.ts`
- Colours: `app/globals.css` (`@theme`)

## Project layout
```
app/(site)/        public pages (/, /about, /jobs, /jobs/[id], /faq, /contact, /login, /register)
app/candidate/     dashboard, profile, apply, applications, interviews, notifications
app/admin/         /admin/login + (panel)/ dashboard, applications, candidates, positions, interviews, staff
app/api/           Route Handlers (auth, positions, candidates, applications, interviews, notifications, admin, files)
models/index.ts    Mongoose models (User, CandidateProfile, Position, Application, Interview, Staff, Notification, AuditLog)
lib/               mongodb, auth (JWT cookie), api helpers, Zod validators, cloudinary, data queries
middleware.ts      first-gate route protection for /admin/* and /candidate/*
scripts/seed-admin.mjs
```

## Security notes
- JWT in an HTTP-only, SameSite=Lax cookie (Secure in production). Never in localStorage.
- Every API route re-verifies the cookie, loads the live user (must be active), checks role, and checks ownership inside the query. Middleware is only a first gate.
- Files go to Cloudinary as **authenticated** assets (not publicly reachable). They open through `/api/files`, which allows only the owner or an admin and then redirects to a signed URL. File type is detected from the file bytes (JPG/PNG/WEBP, plus PDF for documents). Limits: 3 MB photo, 5 MB documents.
- Cloudinary folders: `wedding-staff/candidates/{id}/profile` and `.../documents`. MongoDB stores only metadata.
- Admin notes and status-change comments are never returned to candidates.
- Duplicate applications are blocked by a unique `(candidateId, positionId)` index.

## Production (Vercel + MongoDB Atlas + Cloudinary)
1. Atlas: create a cluster and a database user, and allow network access from Vercel.
2. Cloudinary: copy the cloud name, API key and secret.
3. Vercel: import the repo, add the five environment variables, deploy.
4. Create the production admin from your machine: `npm run seed:admin -- email 'password' 'Name'` with the production `MONGODB_URI` in `.env.local`.
5. Set `NEXT_PUBLIC_APP_URL` to your real domain (used for sitemap and metadata).

## Known limits
- No login rate limiting. Add one before a large public launch.
- Signed file links do not expire. They are only handed out after an auth check.
- Mongoose models are loosely typed (`any`) because strict schema inference made the TypeScript compiler run out of memory. Input is validated with Zod.
- Notifications are in-app only (no email/SMS), as specified.
