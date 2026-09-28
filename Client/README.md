# RightGo Frontend

Next.js 15, TypeScript, and Tailwind CSS client application for the RightGo Logistics Platform.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Assigned Trips opens at both `/` and [http://localhost:3000/loader](http://localhost:3000/loader).
This branch implements only the responsive Assigned Trips page and its four sample trip cards.
Load Sequence and Trip Readiness are implemented in separate branches. Their sidebar
items and trip action buttons are disabled until those pages are integrated.

When merging the loader branches, keep Assigned Trips at `/loader`, give Load Sequence
and Trip Readiness their own routes (for example `/loader/load-sequence` and
`/loader/trip-readiness`), and connect the navigation and trip buttons with the selected
trip ID. Resolve any competing changes to `src/app/loader/page.tsx`; merging alone does
not connect the pages.

The existing store manager remains available at `/store-manager`.
After switching branches, stop and restart the development server. If using
`npm start`, run `npm run build` first so it serves the current branch's pages.
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
