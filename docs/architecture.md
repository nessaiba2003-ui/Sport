# ALJAWARIH GYM TAROUDANT Architecture

## A. System Architecture

The target production stack is Next.js + React + TypeScript + Tailwind/shadcn, backed by PostgreSQL via Prisma, Auth.js/session security, object storage for media, and Recharts for analytics. This first runnable version is implemented without external dependencies so it can work in the current workspace immediately:

- Public SPA served from `public/`
- Native Node.js REST API in `server.js`
- JSON persistence adapter in `data/db.json`
- Built-in `crypto` password hashing and signed bearer sessions
- Role-based guards for admin, staff, coach, content manager, and client workflows
- PWA manifest and service worker
- Data-driven pricing, schedule, content, virtual gym floors, zones, and equipment
- Multilingual UI foundation for French, Arabic, and English with RTL support

The JSON adapter is intentionally shaped around relational entities so it can be swapped for Prisma repositories later.

## B. Database Schema

The full production schema lives in `prisma/schema.prisma`. Core entities:

- `User`, `Role`, `ClientProfile`, `Family`, `FamilyMember`
- `MembershipPlan`, `Membership`, `Payment`
- `ClassSession`, `Booking`, `Attendance`
- `Coach`, `Event`, `EventRegistration`
- `MemoryAlbum`, `MemoryItem`, `Post`, `Comment`, `Like`
- `GymFloor`, `GymZone`, `Equipment`
- `Workout`, `WorkoutExercise`, `Achievement`, `UserAchievement`
- `Challenge`, `ChallengeProgress`, `Notification`, `ClubSetting`, `MediaAsset`

All price, schedule, capacity, event, memory, and gym data is editable through admin APIs.

## C. Application Folder Structure

```text
.
├─ server.js                 # REST API, auth, RBAC, data adapter, static server
├─ public/
│  ├─ index.html             # SEO/PWA shell
│  ├─ styles.css             # Premium responsive UI system
│  ├─ app.js                 # SPA router, screens, API client, i18n, dashboards
│  ├─ manifest.webmanifest   # PWA metadata
│  └─ sw.js                  # App shell cache
├─ data/
│  └─ db.json                # Created/updated automatically from seed data
├─ prisma/
│  └─ schema.prisma          # PostgreSQL production contract
└─ docs/
   └─ architecture.md
```

## D. Page / Route Map

Public:

- `/`, `/about`, `/memberships`, `/schedule`, `/events`, `/memories`, `/virtual-gym`, `/contact`, `/login`, `/register`

Client:

- `/portal`, `/portal/membership`, `/portal/schedule`, `/portal/bookings`, `/portal/attendance`, `/portal/progress`, `/portal/workouts`, `/portal/achievements`, `/portal/challenges`, `/portal/memories`, `/portal/gym`, `/portal/notifications`, `/portal/profile`

Staff:

- `/staff`, `/staff/sessions`, `/staff/check-in`, `/staff/participants`

Admin:

- `/admin`, `/admin/members`, `/admin/memberships`, `/admin/payments`, `/admin/bookings`, `/admin/attendance`, `/admin/schedule`, `/admin/events`, `/admin/memories`, `/admin/posts`, `/admin/gym`, `/admin/equipment`, `/admin/challenges`, `/admin/analytics`, `/admin/notifications`, `/admin/settings`

API:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/membership-plans`
- `GET/POST/PUT/DELETE /api/classes`
- `GET/POST/DELETE /api/bookings`
- `GET/POST /api/attendance`
- `GET/POST /api/events`, `POST /api/events/:id/register`
- `GET/POST /api/memories`
- `GET /api/gym/floors`, `GET/POST /api/gym/zones`
- `GET/POST /api/equipment`
- `GET/POST /api/workouts`
- `GET/POST /api/notifications`
- `GET /api/admin/analytics`, `GET /api/admin/clients`, `GET /api/admin/payments`
- `GET /api/search?q=...`

## E. Roles And Permissions

- `SUPER_ADMIN`: full system access, settings, users, destructive admin actions
- `ADMIN`: members, memberships, payments, bookings, attendance, content, analytics
- `MANAGER`: operational admin views, revenue, schedule, attendance, reporting
- `COACH`: assigned classes, participants, attendance, workout notes
- `CONTENT_MANAGER`: events, memories, posts, galleries, media
- `CLIENT`: personal profile, bookings, progress, family visibility, memories, notifications

Authorization is enforced in the API. Client calls only receive data scoped to the authenticated user unless the role permits broader access.

## F. Development Roadmap

1. Current runnable foundation: native Node API, seeded data, SPA dashboards, PWA, RBAC.
2. Migrate persistence to PostgreSQL with Prisma using `prisma/schema.prisma`.
3. Move frontend to Next.js App Router with TypeScript, Tailwind, shadcn/ui, server actions/API routes.
4. Replace local media placeholders with Cloudinary, S3, or Supabase Storage.
5. Add production Auth.js provider, CSRF protection, refresh/session rotation, rate limiting middleware.
6. Add QR scanner camera integration and printable member/equipment QR sheets.
7. Add real payment provider or Moroccan gateway when chosen.
8. Add React Three Fiber digital twin once real floor photos, measurements, and zones are provided.
9. Add AI coach endpoint behind an environment-configured model provider.
10. Add full test suite, CI, observability, backups, and deployment pipelines.
