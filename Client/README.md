# RightGo Frontend

Next.js 15, TypeScript, and Tailwind CSS client application for the RightGo Logistics Platform.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`/` is a role-selection homepage linking to each workspace. Use the role switcher inside
any workspace to jump between Store Manager, Dispatcher, Loader, and Driver — there is no
sign-in yet, so every workspace is open for demonstration.

| Workspace | Route |
| --- | --- |
| Home / role picker | `/` |
| Store Manager | `/store-manager` |
| Dispatcher | `/dispatcher` |
| Loader — Assigned Trips | `/loader` |
| Loader — Load Sequence | `/loader/load-sequence` |
| Loader — Report Issue | `/loader/report-issue` |
| Loader — Trip Readiness | `/loader/trip-readiness` |
| Driver | `/driver` |

The loader pages use sample data. Only trip S1-T001 has a loading details demo;
other trip actions stay disabled. Driver is a navigation shell and empty state only —
no trip data, backend, or workflow is implemented yet.

After switching branches, stop and restart the development server. If using
`npm start`, run `npm run build` first so it serves the current branch's pages.
Next.js uses its own build tooling, so a separate Vite setup is not needed.

## Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router routes (`layout.tsx`/`page.tsx` per URL segment) |
| `src/components/ui/` | Reusable UI primitives (Button, StatusBadge) |
| `src/components/common/` | Shared app components (Logo, NavItem, RoleSwitcher, PageHeader, EmptyState, RoleCard, ConfirmDialog) |
| `src/components/<role>/` | Role-specific components and nav config (dispatcher, store-manager, loader, driver) |
| `src/hooks/` | Custom React hooks |
| `src/store/` | Global/context state (e.g. dispatcher planning context) |
| `src/types/` | Shared TypeScript type definitions |
| `src/lib/` | Integrations and business-rule logic (e.g. dispatcher checker-parity validation) |
| `src/data/` | Mock/demo datasets |

`src/layouts/`, `src/services/`, `src/utils/`, and `src/offline/` aren't present yet —
nothing in the current codebase needs them (no shared layout wrapper beyond each role's
own chrome, no real API/service layer, no extracted pure helpers, no offline/PWA support).
Reintroduce them when that work begins rather than keeping them as empty placeholders.
