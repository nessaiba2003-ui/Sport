# ALJAWARIH GYM TAROUDANT Platform

A production-oriented first version of the ALJAWARIH GYM digital ecosystem: public website, member portal, staff tools, admin dashboard, bookings, attendance, memberships, memories, equipment, progress tracking, gamification, notifications, analytics, PWA foundations, multilingual architecture, and future AI/3D extension points.

The application runs on Node.js 20+. Local development uses an atomic JSON adapter; production uses PostgreSQL through `DATABASE_URL`. Railway deployment settings, health checks, persistent uploads and graceful shutdown are included.

## Run

```bash
npm run dev
```

Open `http://localhost:3100`.

## Development demo accounts

Development credentials are seeded only when `NODE_ENV !== "production"`:

- Admin: `admin@aljawarih.demo` / `AdminDemo2026!`
- Coach: `coach@aljawarih.demo` / `CoachDemo2026!`
- Client: `sara@aljawarih.demo` / `ClientDemo2026!`

Production never seeds the known coach/client demo accounts. Set the owner account and secrets with environment variables:

- `PORT`
- `APP_SESSION_SECRET`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_COACH_EMAIL`
- `DEMO_COACH_PASSWORD`

## Railway production

1. Create a Railway project from this GitHub repository.
2. Add a PostgreSQL service and reference its `DATABASE_URL` from the web service.
3. Paste the variables listed in `.env.example` into the web service, using real secrets.
4. Generate a public domain, then set `PUBLIC_BASE_URL` to that HTTPS URL.
5. For persistent admin uploads, attach a volume at `/app/storage` and set `UPLOAD_DIR=/app/storage/uploads`.

Railway injects `PORT`; `/api/health` is the deployment health check. Keep the web service at one replica because the current persistence adapter stores the application state as one transactional JSON document in PostgreSQL.

## Architecture Notes

See [docs/architecture.md](C:/Users/HP%20PRO/Videos/Sport/docs/architecture.md) for system architecture, database schema summary, folder structure, route map, roles, permissions, and roadmap.
