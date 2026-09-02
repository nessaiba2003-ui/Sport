# ALJAWARIH GYM TAROUDANT Platform

A production-oriented first version of the ALJAWARIH GYM digital ecosystem: public website, member portal, staff tools, admin dashboard, bookings, attendance, memberships, memories, equipment, progress tracking, gamification, notifications, analytics, PWA foundations, multilingual architecture, and future AI/3D extension points.

This repository is dependency-free for the current environment, so it runs immediately with Node.js. The backend uses native Node HTTP APIs and a JSON persistence adapter, while `prisma/schema.prisma` defines the production PostgreSQL model for the preferred Next.js/Prisma migration.

## Run

```bash
npm run dev
```

Open `http://localhost:3100`.

## Demo Accounts

Development credentials are seeded only when `NODE_ENV !== "production"`:

- Admin: `admin@aljawarih.demo` / `AdminDemo2026!`
- Coach: `coach@aljawarih.demo` / `CoachDemo2026!`
- Client: `sara@aljawarih.demo` / `ClientDemo2026!`

For production, set credentials and secrets with environment variables:

- `PORT`
- `APP_SESSION_SECRET`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_COACH_EMAIL`
- `DEMO_COACH_PASSWORD`

## Architecture Notes

See [docs/architecture.md](C:/Users/HP%20PRO/Videos/Sport/docs/architecture.md) for system architecture, database schema summary, folder structure, route map, roles, permissions, and roadmap.
