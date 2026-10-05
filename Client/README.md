# RightGo Frontend

Next.js 15, TypeScript, and Tailwind CSS client application for the RightGo Logistics Platform.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`/` is a role-selection homepage; `/login` signs in with one of four demo accounts (see the
root `README.md`) and routes to that role's workspace. Run the backend (`Server/`) on
`http://localhost:8000` (or set `NEXT_PUBLIC_API_URL`) for data to load.

| Workspace | Routes |
| --- | --- |
| Store Manager | `/store-manager` (+ `place-order`, `my-orders`, `order-detail`, `deliveries`, `degradation`) |
| Dispatcher | `/dispatcher` (+ `orders`, `planning`, `plan-review`, `live-operations`, `future-capacity`, `reports`) |
| Loader | `/loader` (+ `load-sequence`, `report-issue`, `review-changes`, `trip-readiness`) |
| Driver | `/driver` (+ `today-run`, `current-stop`, `history`, `offline`, `report`) |

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

Tests: `npm test` (Vitest). Production build: `npm run build`.
