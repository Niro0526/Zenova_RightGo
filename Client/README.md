# RightGo Frontend

Next.js 15, TypeScript, and Tailwind CSS client application for the RightGo Logistics Platform.

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

All existing workspaces are integrated on `develop`. Use the sidebar role selector
to switch between Store Manager, Dispatcher, and Loader.

| Workspace | Route |
| --- | --- |
| Store Manager | `/` or `/store-manager` |
| Dispatcher | `/dispatcher` |
| Assigned Trips | `/loader` |
| Load Sequence | `/loader/load-sequence` |
| Report Issue | `/loader/report-issue` |
| Trip Readiness | `/loader/trip-readiness` |

The loader pages use sample data. Only trip S1-T001 has a loading details demo;
other trip actions stay disabled. The Assigned Trips sidebar links to the integrated
loading and readiness pages.

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
