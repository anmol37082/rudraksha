# Mobile UI, theme, admin dashboard, and system audit

Audit date: 16 October 2026
Scope: source-code review of the Next.js app in this repository. Sizes below are CSS declarations/classes, not measurements from a live browser screenshot. `1rem` normally equals 16 CSS px. Tailwind `sm:` starts at 640 px and `lg:` at 1024 px.

## Executive summary

This is a single Next.js 15 App Router recruitment app for wedding/event staff. Public job pages feed into candidate registration, profile/document completion, applications, interview scheduling, selection, and permanent staff records. Admin and candidate pages share a responsive shell on desktop; on mobile the admin gets a drawer and the candidate shell has compact navigation treatment. MongoDB/Mongoose stores records and Cloudinary stores private files.

The strongest parts are the clear end-to-end domain workflow, server/API authorization checks, schema validation, private file access, duplicate-application prevention, and a cohesive forest-green/cream/gold visual identity. The main mobile UI concern is inconsistent density: the candidate dashboard has several tiny labels (roughly 7–10 px) and three-column quick links, while other mobile pages use 11–14 px text. The global stylesheet has accumulated many page-specific overrides, so it is hard to keep typography and spacing consistent. Some icon/text glyphs in source display as mojibake (for example `âŒ‚`, `Ã—`, and `â†’`), which should be checked in the rendered UI.

## Theme and typography

### Brand tokens

| Token/use | Value |
|---|---|
| Main forest | `#09251B` |
| Secondary forest | `#164332` |
| Cream page background | `#F7F2E8` |
| Soft cream | `#E8DDC9` |
| Neutral border | `#D5C4A4` |
| Gold accent | `#C6A15B` |
| Bronze accent | `#90713B` |
| Body font | Inter, then system sans-serif fallbacks |
| Heading/display font | Cormorant Garamond, then Georgia-style serif fallbacks |

`app/layout.tsx` loads Inter 400–700 and Cormorant Garamond 500–700 from Google Fonts. The body uses Inter; all `h1`–`h6` use Cormorant Garamond at 600 weight by default. Most body copy is dark forest or muted stone green. Buttons are generally 44 px high; inputs are 44 px high; base cards have 14 px corners and 20 px padding. Small buttons are about 36 px high. These shared primitives live in `app/globals.css` and `components/ui.tsx`.

### Shared text scale

| Style | CSS size |
|---|---:|
| `text-xs` | 12 px |
| `text-sm` | 14 px |
| default/body (`text-base`) | 16 px |
| `text-lg` | 18 px |
| `text-xl` | 20 px |
| `text-2xl` | 24 px |
| `text-3xl` | 30 px |
| `text-4xl` | 36 px |

The shared `PageTitle` uses a 24 px heading on narrow screens and 30 px from 640 px upward. Some custom mobile screens replace that scale with hand-tuned pixel/rem sizes, listed below. Browser fallback font rendering can differ if Google Fonts fail to load.

## Page-by-page mobile UI and typography

Font families in the table refer to the global rule: headings = Cormorant Garamond; normal copy = Inter, unless a page explicitly overrides it. The stylesheet does not declare a single uniform mobile size for every text element; card copy and metadata have their own sizes.

### Public pages

| Route | Mobile layout and typography |
|---|---|
| `/` | Custom promotional landing page with hero, role/service content, CTAs and public navigation. Hero heading size is page CSS-specific; heading family is the global serif. Background artwork uses `landingbg.webp`. Inspect live at target device widths before treating the hero size as fixed; it is not expressed as the shared `PageTitle`. |
| `/about` | Main heading `text-3xl` = 30 px on mobile, 36 px at `sm`; paragraphs 16 px, 18 px at `sm`, relaxed line-height. Serif heading, sans body. |
| `/contact` | Custom compact contact composition. Heading 30 px serif; contact method headings 16 px serif; descriptions 10 px sans; address/email/phone 11 px; action labels 9 px. Contact rows and help card are custom CSS. This is unusually small for contact details on phones. |
| `/faq` | FAQ content is public. Uses shared site structure and normal body sizing; heading/content utility classes should be retained page-specific if adjusted. |
| `/jobs` | Custom job-list heading is 27 px serif on mobile. Position card title 16 px serif. Position metadata/body/actions use compact custom CSS; controls and primary actions retain touch-sized button primitives. Cards include location, experience, posted date and deadline. |
| `/jobs/[id]` | Position title 30 px mobile / 36 px `sm`, serif. Description/list copy defaults to 16 px with relaxed line height. Fact panel text 14 px. Apply action fills the available width on mobile. |
| `/login` | Full-height mobile login artwork (`loginbg.webp`), logo/back button and rounded fields. Intro heading 36 px (2.25rem); intro description about 14.4 px; labels about 12.5 px; fields 46 px tall; submit 50 px. Input family/body is Inter. |
| `/register` | Same visual family as login, but tighter to fit more fields and OTP. Heading 30.4 px; subtitle ~13.8 px; labels ~12.2 px; fields 46 px; submit 48 px. OTP uses six single-character inputs. |
| `/admin/login` | Shared auth layout with admin-specific form/card styling. Global auth title defaults to 36 px and mobile auth override is 36 px for the base class; input/button sizes are touch-friendly. Review visually alongside candidate auth because this route does not use the exact login/register body background variant. |

### Candidate pages

Candidate pages use the shared shell. On mobile, the desktop sidebar is hidden; there is a compact forest header, with notification and logout affordances. Candidate navigation items are declared in `app/candidate/layout.tsx` (home, positions, applications, profile, documents, interviews, help, notifications, joining letter). The stylesheet has a compact candidate dashboard treatment; other pages use their own mobile designs and shared components.

| Route | Mobile layout and typography |
|---|---|
| `/candidate/dashboard` | Custom dashboard. Welcome base line ~16 px; candidate name 24 px serif; welcome helper 10.7 px. Promo title 18 px serif; promo copy 9.1 px. Three-column shortcut cards use 10.6 px titles, 8.5 px descriptions and 8 px small labels. Quick stats use 11.5 px values and 7.5 px labels. Activity copy is about 9.1 px, secondary 8 px, dates 7.5 px. This is the densest/least readable phone page. |
| `/candidate/profile` | Has distinct saved-profile mobile presentation: page title 21.6 px serif, summary/group labels are generally 13–16 px, with some 13.1 px tiny helper text. Unsaved/edit form uses common 14 px labels/inputs and 44 px controls. Desktop presentation is a separate layout. |
| `/candidate/apply/[positionId]` | Shared `PageTitle`: 24 px title mobile. Two-step form/review. Shared labels/inputs are 14 px with 44 px minimum input height; explanatory text and agreement terms 14 px, version/helper metadata 12 px. |
| `/candidate/applications` | Custom mobile heading 28 px serif; application card role heading 16 px serif; status and metadata are compact (mainly 12–14 px). Status history is visible. |
| `/candidate/applications/[id]` | Shared `PageTitle` 24 px. Section headings 20 px serif. Application details 14 px, agreement metadata 12 px, timeline labels 14 px and dates 12 px. |
| `/candidate/documents` | Custom mobile title 27 px serif. Document card headings 14 px serif. Upload/manage controls use the shared 14 px input/control scale. |
| `/candidate/interviews` | Custom mobile title 27 px serif. Interview card title 16 px serif; supporting schedule details use compact 10–14 px CSS. |
| `/candidate/notifications` | Shared title 24 px mobile. Notification content is component-rendered with compact body/meta text (typically 14/12 px). |
| `/candidate/staff` | Joining letter/status view. Shared title is 24 px; content uses card, document-link and printable-letter components. Print has its own styles. |

### Admin pages

At desktop width, admin pages use a fixed 240 px forest sidebar and shared content max-width of 1152 px. On mobile the sidebar is hidden and replaced by an admin drawer opened from a 44 px menu button. The admin navigation includes Dashboard, Applications, Candidates, Positions, Interviews, Staff, Notifications and Account settings. Application badge counts `NEW` records; notification badge counts unread items.

| Route | Mobile layout and typography |
|---|---|
| `/admin/dashboard` | Custom responsive dashboard; heading 25 px serif on mobile (30 px desktop). Stat values 23 px serif; labels 11 px. Section headings 21 px serif. Recent rows: names 12 px, status badge 9 px, metadata/action about 10 px. Stats are a three-column grid even on phones; at narrow widths it may be crowded. |
| `/admin/applications` | Shared `PageTitle` 24 px mobile. Filter controls and table follow shared 14 px body / 12 px table header. `Table` uses a 640 px minimum table width inside horizontal scrolling, rather than reflowing each record as a card. |
| `/admin/applications/[id]` | Multi-panel detail/actions/history. Shared section headings commonly 20 px; a mobile rule compresses `.text-sm` to 11 px and `.text-xs` to 10 px on this page. That override helps fit but makes detail/history copy notably small. |
| `/admin/candidates` | Shared `PageTitle` 24 px. Search field, table and pagination; table horizontally scrolls at mobile width (640 px minimum). Main data text 14 px, phone/helper text 12 px. |
| `/admin/candidates/[id]` | Candidate profile/detail and applications; shared heading 24 px mobile, card headings commonly 20 px, body 14 px and metadata 12 px. |
| `/admin/positions` | Shared title 24 px; listing uses the horizontally scrollable shared table. Position title/body 14 px; secondary metadata 12 px. |
| `/admin/positions/new`, `/admin/positions/[id]` | Shared title 24 px. Position form uses shared 14 px labels/inputs and 44 px minimum controls; multi-line fields are standard shared textareas. |
| `/admin/interviews` | Shared title 24 px and table/list controls; schedule information primarily 14 px, muted metadata 12 px. Check mobile overflow due to shared table behavior. |
| `/admin/staff` | Shared title 24 px and horizontally scrollable table. Employee ID/secondary contact is 12 px. |
| `/admin/staff/[id]` | Staff record and joining letter view; shared 24 px title and reusable detail cards. Letter has print styling. |
| `/admin/notifications` | Shared title 24 px; notification list component, generally 14 px copy and 12 px metadata. |
| `/admin/settings` | Shared title 24 px; settings section headings 20 px, explanatory copy 14 px, forms 14 px. |

## How the app works and where each piece is implemented

### Candidate hiring lifecycle

1. Visitors browse public positions at `/jobs` and `/jobs/[id]`. `lib/data.ts` queries active positions from MongoDB, applies title/location/type filters and hides expired openings.
2. Candidate registration uses `/register` and `/api/auth/register`; an OTP is sent via `lib/email.ts`, stored as a hash in `PendingRegistration`, and expires automatically. Verification and resend use `/api/auth/register/verify` and `/api/auth/register/resend`.
3. Login uses `/api/auth/login`. JWT session is carried in an HTTP-only cookie. `middleware.ts` is the first route gate; `lib/guard.ts` and `lib/api.ts` re-check session/user/role for server pages and API handlers.
4. Candidate profile updates use `/candidate/profile` and `/api/candidates/profile`. Completion requirements are calculated in `lib/profile.ts`. Applying is `/candidate/apply/[positionId]` and `/api/applications`; input rules live in `lib/validators.ts`. Application records contain profile/document snapshots, cover note, accepted agreement/version, status and history.
5. Admin reviews applications in `/admin/applications` and `/admin/applications/[id]`. `lib/transitions.ts` defines allowed status transitions; `lib/applications.ts` changes status, writes history, completes scheduled interviews when marked interviewed, emits candidate notifications and creates audit entries.
6. Admin can schedule/manage interviews through `/admin/interviews`, `/api/interviews`, and the application action component. Candidate sees schedule and status in candidate interview/application pages.
7. Selected candidates can be converted to staff; staff and immutable joining-letter data use staff models and admin/candidate staff pages.
8. Notifications are persisted in MongoDB and shown in candidate/admin notification lists. App install prompt/service worker add basic PWA installation/offline shell support, but do not imply full offline data workflows.

### Main route/data areas

| Area | Screens | Main data/APIs |
|---|---|---|
| Public recruitment | Home, About, FAQ, Contact, Jobs, Position detail | `Position`; `/api/positions` and `/api/positions/[id]` |
| Candidate account | Register, verify email, login, profile | `User`, `PendingRegistration`, `CandidateProfile`; `/api/auth/*`, `/api/candidates/profile` |
| Applications | Apply, application list/detail, admin queue/detail | `Application`, `Position`, `CandidateProfile`; `/api/applications*`, `/api/admin/applications` |
| Files | Profile photo, candidate documents, application attachments | Private Cloudinary files, metadata in profile/application/staff models; `/api/candidates/documents`, `/api/files` |
| Interviews | Admin schedule/list, candidate schedule | `Interview`; `/api/interviews*` |
| Hiring outcome | Admin staff list/detail, candidate joining letter | `Staff`; `/api/admin/staff*` |
| Dashboard/communication | Admin dashboard, notifications, settings | counts and recent `Application`/`Interview`; `Notification`, `AuditLog`; `/api/admin/dashboard`, `/api/notifications*`, `/api/admin/account` |

### Persistence and file handling

MongoDB/Mongoose models are in `models/index.ts`: User, CandidateProfile, Position, Application, Interview, Staff, Notification, AuditLog and PendingRegistration. Uploaded bytes go to Cloudinary; MongoDB keeps file metadata and Cloudinary public IDs. `lib/cloudinary.ts` checks file signatures, caps photos at 3 MB and documents at 5 MB, and uses authenticated/private assets. `/api/files` performs an owner/admin authorization check before redirecting to a Cloudinary signed URL.

## What is strong

- **Complete hiring lifecycle is represented:** positions, verified candidate accounts, profile readiness, applications, interview, selection, staff conversion and joining letters are all modeled.
- **Authorization is layered:** middleware is explicitly only a first gate; API handlers and server layouts use `requireAuth`/`requirePage` to re-check live account state and role. Candidate data queries are expected to scope to owner IDs.
- **Good application integrity:** unique candidate/position index blocks duplicate applications; transition rules centralize valid status movement; agreement version/time and status history are persisted.
- **Private document design:** uploaded file types are sniffed from bytes, size-limited and stored as private Cloudinary resources; access is mediated by an authenticated route.
- **Validation and UI primitives exist:** Zod request schemas, shared inputs/buttons/cards/table, loading/error feedback, empty states, focus-visible outlines and minimum-height buttons give a useful foundation.
- **Brand consistency:** forest/cream/gold tokens, two-font hierarchy and recurring card/button treatments are recognizable across public, admin and candidate surfaces.
- **Operational documentation is useful:** README describes stack, setup, env names, deployment shape and known limitations. No secrets from `.env` were read for this audit.

## Weak spots and risks visible in source

### Mobile UI and accessibility

- **Candidate dashboard text is too small:** several key details are 7.5–10.6 px and shortcut cards are squeezed into three columns. This is the clearest mobile readability issue.
- **Mobile table usability relies on horizontal scrolling:** admin tables have `min-w-[640px]`; this is functional but can hide columns and require sideways movement on phones. Consider mobile row cards or prioritize columns.
- **Admin application detail shrinks copy to 10–11 px:** status history and supporting text become difficult to scan.
- **Contact actions/details are 9–11 px:** email/phone may wrap, and the map action label is particularly small.
- **Glyph encoding deserves a pass:** some source strings appear as mojibake (`âŒ‚`, `Ã—`, `â†’`, `Didnâ€™t`). If rendered as-is, navigation/action icons and English punctuation look broken. Replace with SVG icons or normalize UTF-8 strings and inspect actual browser output.
- **Global CSS is a large styling surface:** `app/globals.css` mixes tokens, reusable primitives, auth, candidate screens, contact, and admin page-specific rules. Competing CSS overrides make regressions likely. Move page rules into modules or group around components and define a shared typography scale.
- **Font loading is external:** Google Fonts availability affects intended typography and can add initial render delay; fallback is specified, but no self-hosted font optimization is apparent.
- **Responsive evidence is source-only:** no screenshot/browser viewport audit was performed, so actual fold, overflow, contrast, keyboard and screen-reader behavior still need device/browser review.

### Workflow and technical operations

- **No login rate limiting is documented:** README itself lists this as a pre-launch limit. Add IP/account-based throttling and monitoring before broad public exposure.
- **Signed file URLs do not expire:** README says signed links do not expire. Auth is checked before issuing them, but a copied URL can live longer than desired; use short TTLs where supported.
- **Notification delivery is in-app only:** there is registration email, but no email/SMS for application/interview status changes according to README. Candidates may miss time-sensitive updates unless they check the portal.
- **Types are loose in places:** model helper casts through `any`, query utilities use broad `any`, and some pages deal with populated records as `any`; this lowers refactor safety.
- **Dashboard counts are useful but narrow:** admin dashboard reports aggregate hiring stages, active positions/staff, recent applications and interviews. No export, bulk triage, assignment, or deeper funnel analytics is evident in the reviewed UI map.
- **Audit coverage should be checked end-to-end:** status changes call `audit`, but verify settings/position/staff/interview mutations are similarly audited if operational traceability is required.
- **Date/time handling should be standardized:** screens use a mix of formatting helpers, `toLocaleString("en-IN")`, and stored date + separate time fields. Confirm app timezone expectations for interviews and deadlines.
- **Testing exists but is limited by visible file inventory:** `tests/core.test.ts` and `tests/validators.test.ts` are present. No browser-level responsive/accessibility suite was apparent in the inventory. This audit did not run tests or build.
- **PWA scope is limited:** service worker/install prompt are present, but the app relies on network APIs and authenticated data. Treat it as installable web UI, not an offline-first system.

## Suggested priority order

1. Raise candidate dashboard secondary copy to at least 12 px (prefer 13–14 px for actionable content); change three-column shortcuts to two columns on narrow screens.
2. Review all mobile pages at 320/360/390/430 px and tablet/desktop widths; capture overflow, fold and tap-target issues. Convert high-use admin tables to mobile cards or add a clear prioritized row view.
3. Fix suspect mojibake strings and use SVG icons consistently; verify in the rendered browser.
4. Normalize typography to named tokens (body, helper, metadata, heading levels) and reduce page-specific override collisions.
5. Add login/OTP abuse controls and make private file signatures time-limited.
6. Decide whether application/interview notifications need email/SMS and whether audit log coverage should include all admin mutations.
7. Add responsive visual and accessibility checks after the UI adjustments are agreed.

## Source map

- Theme and most custom mobile CSS: `app/globals.css`
- Root metadata/font loading: `app/layout.tsx`
- Shared candidate/admin navigation and responsive shell: `components/Shell.tsx`, `app/candidate/layout.tsx`, `app/admin/(panel)/layout.tsx`
- Shared UI primitives/table/title: `components/ui.tsx`
- Domain persistence: `models/index.ts`
- Data reads/dashboard aggregates: `lib/data.ts`
- Authentication/authorization: `middleware.ts`, `lib/auth.ts`, `lib/api.ts`, `lib/guard.ts`
- Application workflow and status changes: `lib/applications.ts`, `lib/transitions.ts`, `components/AdminActions.tsx`
- File storage/access: `lib/cloudinary.ts`, `app/api/files/route.ts`
- Setup and known limits: `README.md`
