# RightGo – Logistics Intelligence Platform

## Structure
| Folder | Purpose |
|--------|---------|
| ackend/ | FastAPI REST API |
| ml/ | ML services (lateness prediction & demand forecasting) |
| docs/ | Architecture diagrams, data-model docs, AI disclosure |

## Quick Start
\\\ash
cp .env.example .env
docker compose up --build
\\\

## Services
| Service | Port |
|---------|------|
| Backend API | 8000 |
| PostgreSQL | 5432 |
