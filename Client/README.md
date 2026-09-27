# RightGo Frontend

Next.js 15, TypeScript, and Tailwind CSS client application for the RightGo Logistics Platform.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The loader dashboard is at [http://localhost:3000/loader](http://localhost:3000/loader).
It reproduces the supplied Assigned Trips design and includes responsive navigation,
trip selection, loading checklists, issue resolution, and pre-departure checks.
Trip data and order checklists are frontend demos; changes last until the page reloads.
The existing store manager remains available at `/` and `/store-manager`.
Next.js uses its own build tooling, so a separate Vite setup is not needed.

## Structure

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages |
| `src/components/` | Shared UI & common components |
| `src/layouts/` | Page layout wrappers |
| `src/services/` | API service layer |
| `src/hooks/` | Custom React hooks |
| `src/store/` | Global state management |
| `src/types/` | TypeScript type definitions |
| `src/lib/` | Third-party library configs |
| `src/utils/` | Utility functions |
| `src/offline/` | PWA / offline support |
