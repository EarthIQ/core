# EarthIQ Core — Pluggable Monolith Framework

EarthIQ Core is a pluggable-monolith geospatial platform powered by FastAPI (Backend), React/Vite (Frontend shell), PostGIS, Redis, and RustFS (S3-compatible Object Storage). Modules can be dynamically added or removed via the `setup` CLI tool.

---

## 🚀 Quick Start & Setup

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [uv](https://github.com/astral-sh/uv) (Python package and environment manager)
- [Node.js](https://nodejs.org/) (v20+) & [pnpm](https://pnpm.io/) (v8+)

---

## 🛠️ CLI Setup & Module Management

The project includes a CLI tool (`setup-cli`) to manage module installation, dependency resolution, frontend route codegen, and Docker Compose configuration.

### 1. Interactive Setup
Run interactive module selection, workspace wiring, image build, and container startup:
```bash
uv run --project setup setup init
```

### 2. Add a Module
Add a new module from the registry without manually updating docker-compose or workspace paths:
```bash
uv run --project setup setup add <module-name>
```

### 3. Remove a Module (Without permission issues)
Remove an installed module safely even while Docker containers are running:
```bash
uv run --project setup setup remove <module-name>
```
> **Note:** Directory deletion fallback handles root/Docker-owned files in volume mounts cleanly so you don't face `Permission error`.

### 4. Sync Workspaces & Install Frontend Packages
If frontend packages or routes ever get out of sync, run:
```bash
uv run --project setup setup sync
```
This automatically updates `alembic.ini`, dynamic Vite paths (`modules.paths.json`), dynamic TypeScript paths (`tsconfig.paths.json`), frontend route registry (`module-registry.generated.ts`), Docker compose configuration, and triggers `pnpm install`.

### 5. List & Update Modules
- List all available modules & installation status:
  ```bash
  uv run --project setup setup list
  ```
- Pull latest changes for a module:
  ```bash
  uv run --project setup setup update <module-name>
  ```

---

## 🌐 Services Architecture & Ports

When services are running via Docker Compose (`docker compose up -d`), the following services are available:

| Service | Port | Description | Healthcheck / Endpoint |
| :--- | :--- | :--- | :--- |
| **Frontend Shell** | `3000` | React + Vite Monorepo UI | http://localhost:3000 |
| **Backend API** | `8000` | FastAPI Server & OpenAPI Docs | http://localhost:8000/docs |
| **PostgreSQL / PostGIS** | `5432` | Geospatial Database (`earthiq`) | `pg_isready -U earthiq` |
| **Redis** | `6379` | In-memory cache & pub/sub | Port 6379 |
| **RustFS S3 Storage** | `9000` / `9001` | S3 Storage API & Web Console | http://localhost:9001 (Console) |

---

## 📁 Repository Structure

```
.
├── backend/                # FastAPI Core Application & Alembic migrations
├── frontend/               # Pnpm Workspace Monorepo
│   ├── apps/web/           # Main React web shell (Vite)
│   └── packages/           # Shared UI, charts, map components & config
├── modules/                # Pluggable feature modules (hydrology, ai, resources, etc.)
├── setup/                  # CLI setup tool (`setup-cli` powered by Typer & uv)
├── modules.registry.yaml   # Registry of available remote module repos
├── modules.lock.yaml       # Lockfile tracking currently installed modules
└── docker-compose.yaml     # Dynamically generated Docker Compose manifest
```

---

## 💻 Manual Frontend Development

To run the frontend locally outside of Docker for fast hot reloading:
```bash
cd frontend
pnpm install
pnpm --filter web dev
```
The frontend shell will proxy API requests to `http://localhost:8000`.
