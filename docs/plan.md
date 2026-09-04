# EarthIQ Core — 2026 Geospatial Strategy & Build Roadmap

> A durable, implementation-ready plan that turns the industry's 2026 geospatial
> trends into concrete work for **this repo**. Written for engineers **and** AI
> agents: every claim maps to a real file, and the backlog (§6) is ticket-ready.

| Field    | Value |
| -------- | ----- |
| Status   | Draft v0.1 (living document — append, don't rewrite) |
| Scope    | `core/` (backend, frontend, modules, setup, infra) |
| Author   | EarthIQ Core team (assisted) |
| Companion | `docs/test_plan.md`, `.clinerules`, `README.md` |
| Trend source | [BioMedware — *5 Geospatial Trends and Use Cases Shaping the Industry* (Jul 2026)](https://biomedware.com/5-geospatial-trends/) |

---

## Table of contents

1. [How to use this document](#0-how-to-use-this-document-long-run)
2. [Executive summary](#1-executive-summary)
3. [Deep-dive: the 5 trends (article analysis)](#2-deep-dive-the-5-trends)
4. [Where EarthIQ Core stands today (capability matrix + concrete problems)](#3-where-earthiq-core-stands-today)
5. [Strategic pillars](#4-strategic-pillars)
6. [Phased roadmap (Now / Next / Later)](#5-phased-roadmap)
7. [Implementation backlog (ticket-ready)](#6-implementation-backlog)
8. [Target architecture](#7-target-architecture)
9. [Technology & standards choices](#8-technology--standards-choices)
10. [Testing & quality (long-run)](#9-testing--quality)
11. [Governance, security & provenance](#10-governance-security--provenance)
12. [Risks & mitigations](#11-risks--mitigations)
13. [Success metrics / KPIs](#12-success-metrics)
14. [Open decisions](#13-open-decisions)
15. [References](#14-references)

---

## 0. How to use this document (long-run)

**Audience.** Platform engineers, module authors, and AI coding agents working in
`core/`. If you are an agent, §6 is your task list: each item has an ID, affected
files, and acceptance criteria — pick one, implement it, and run the Definition of
Done in `.clinerules`.

**How to keep it honest.**
- Treat §3 (capability matrix) as the *source of truth* for "what exists". Update
  a row the moment a capability ships.
- Every backlog item in §6 must be converted into a tracked issue/ticket **before**
  work starts, and the ticket link written back here.
- This is a *living* doc: append dated addenda at the bottom rather than silently
  rewriting history.
- Nothing here overrides `.clinerules` (the repo's non-negotiable working rules).
  Where they differ, `.clinerules` wins.

**Reading order for a new contributor:** §1 → §3 → §5 → §6 (their pillar) → §7.

---

## 1. Executive summary

**The industry signal.** The geospatial analytics market is projected to grow from
~**$123B (2026)** to **>$243B (2030)** (~**19% CAGR**). The defining shift is a
*role* change: from **data acquisition → decision support**. Two numbers frame the
opportunity: **87.5%** of practitioners call data cleaning/formatting their most
time-consuming step, and only **~17%** of agencies report their spatial data fully
integrated across systems. The #1 practical drag is **tool fragmentation** (teams
juggle **3–8** tools).

**EarthIQ Core's position (honest).** We are a *strong, coherent shell* — a
pluggable monolith (core + swappable modules) that directly attacks the
fragmentation problem, backed by PostGIS + MVT vector tiling, an S3 object store,
a module contract, a `setup` CLI, and hermetic tests. **But** against the 5
trends we are *ahead* on interoperability-adjacent plumbing and *behind* on the
four high-value frontiers:

| Trend (2026) | EarthIQ Core today | Gap |
| ------------ | ------------------ | ---- |
| 1. GeoAI & vision foundation models | LLM **chat** harness only (`ai-module`) | **Large** — no ML on imagery, no inference pipeline |
| 2. Cloud-native spatial analytics | Vector→MVT works; **rasters are stored, not computed** | **Large** — no raster compute, no STAC/OGC, no job engine |
| 3. Real-time streaming | Real-time **collab** only (in-memory) | **Medium** — no data streaming; Redis idle; no scale-out |
| 4. 3D reality capture / Gaussian Splatting | 2D MapLibre + a **terrain toggle** only | **Large** — no 3D Tiles, point clouds, splatting |
| 5. Digital twins | Projects/maps/share (static) | **Large** — no live asset/telemetry model |

Cross-cutting platform gaps that limit *all* of the above: **no CI/CD**, **no
background-job engine** (heavy ingest runs in-request), **no data provenance/audit
log**, **in-memory WebSockets that can't scale horizontally**, **presigned-URL host
mismatch**, and **raster is a dead-end** in the data model.

**Three strategic bets (the whole plan in one line each):**
1. **Become the interoperability hub.** Add open standards (OGC API
   Features/Tiles/Records, STAC, COG) + a raster compute path so *any* producer can
   feed us and *any* consumer can read us. This is the moat and it compounds.
2. **Make AI *spatial*, not just conversational.** A provider-agnostic inference
   pipeline (segmentation/classification/change-detection) that runs *on our
   imagery and datasets*, exposed through the existing module + Map Toolbox
   contracts — so it's a pluggable capability, not a hard-coded feature.
3. **Close the real-time + 3D loop.** Redis-backed, scale-out streaming ingest and
   a 3D/digital-twin layer (3D Tiles, asset/telemetry model) that turns "maps"
   into a *live, queryable, decision-support* platform — exactly the role shift the
   article predicts.

**Sequencing.** We fix *trust & foundations* first (CI, the latent bugs, job
engine), then *interoperability + raster* (fastest compounding, unblocks GeoAI),
then *GeoAI inference*, then *real-time streaming*, and finally *3D + digital
twin*. Details, entry/exit criteria, and a ticket-ready backlog are in §§5–7.

---

## 2. Deep-dive: the 5 trends

> Source: BioMedware (2026), authored by Geoffrey Jacquez, Ph.D. Each trend is
> analyzed as: **what it is → why it matters → implication for EarthIQ → our
> current state → target state.** This is the "analyse in detail" the strategy builds on.

### Overarching theme
The center of gravity is moving from **getting/processing data** to **asking better
questions and supporting decisions**. "Now, AI is absorbing much of that routine
processing, and the center of gravity is shifting toward judgment: which questions
to ask, which patterns matter, what decisions the analysis should inform." Every
trend below is an expression of that shift. **Implication:** EarthIQ should optimize
for *decision-support surfaces* (analysis results, alerts, simulations, answers), not
just *data storage and 2D map rendering*.

### Trend 1 — GeoAI & vision foundation models
- **What:** ML trained on spatial/imagery data (feature extraction, anomaly detection,
  predictive modeling); the new twist is **general-purpose vision foundation models
  fine-tuned per mission** (land-use, environmental monitoring, disaster damage).
- **Why it matters:** *Leverage.* Tasks needing a specialist labeling data for weeks
  can now be adapted from a pretrained model with a fraction of the examples. The
  bottleneck shifts from *processing imagery* to *asking better questions of it*.
- **Implication for us:** `ai-module` is a **text LLM harness** (`/api/ai/chat`,
  provider-agnostic OpenAI/Anthropic/Ollama, tool-calling). That is *conversational
  AI over data*, **not** GeoAI over imagery. The high-value gap is an **inference
  pipeline on our rasters/vectors** (segmentation, change detection, classification,
  anomaly) + **RAG over our datasets**, exposed as a pluggable capability.
- **Target:** provider-agnostic inference workers (ONNX/Ollama/vLLM), a model
  registry, batch + on-demand endpoints, and "ask the map" grounded in *our* data —
  all through the existing `module.yaml` + Map Toolbox (`lib/tools.ts`) contracts.

### Trend 2 — Cloud-native spatial analytics
- **What:** analysis happens **inside** cloud warehouses/lakehouses rather than
  copying/syncing data across systems; unlocks **petabyte-scale, near-daily**
  satellite questions (continental/global) that were impractical to move/store.
- **Why it matters:** removes the move/store/process bottleneck; changes what is
  *feasible to study* at scale.
- **Implication for us:** we already have the *cloud-native substrate* (S3/RustFS +
  PostGIS + MVT). The gap is that **rasters are a dead-end** — `GeoTIFF/COG/
  GeoPackage/GeoParquet` are registered as *stored assets, not parsed*
  (`data/service.py`, `STORED_ASSET_FORMATS`), because we avoid GDAL. We also lack
  open interop (STAC / OGC API) and a batch job engine.
- **Target:** treat S3 as the *source of truth* (COG as the native raster format),
  a **raster compute path** (rasterio/rio-tilers or DuckDB/PostGIS-RASTER),
  **STAC catalog + OGC API Records**, **OGC API Features/Tiles** over PostGIS, and a
  **background job engine** so big work doesn't block requests.

### Trend 3 — Real-time streaming data
- **What:** replacement of **static file delivery** with **real-time streaming**;
  "real-time streaming is becoming the default"; archival imagery is increasingly
  treated as a **live dataset** (query history in real time).
- **Why it matters:** freshness is a first-class product dimension — monitoring,
  dashboards, and alerts depend on it.
- **Implication for us:** our real-time layer is **collaboration only**
  (`collab/manager.py`, `notifications/hub.py`) and both are **in-memory singletons —
  not Redis-backed**, so they can't scale past one process and state is lost on
  restart. **Redis is in `docker-compose.yaml` but unused** by the backend. We have
  **no data streaming** (sensor/IoT/telemetry ingest, live layer updates, time-series
  into PostGIS).
- **Target:** Redis (pub/sub or **Redis Streams**) as the transport for cross-node
  presence *and* data events; a **stream ingest** API (webhooks, MQTT/Kafka bridge,
  time-series upserts); **live layers** that update over the socket; and a
  **replay/history** story so the past is queryable like the present.

### Trend 4 — 3D reality capture (incl. Gaussian Splatting)
- **What:** maturation of **3D reality capture**; **3D Gaussian Splatting** is called
  out by name as a key rendering/capture technique.
- **Why it matters:** richer, physically-grounded context for urban, asset, and
  environmental decisions; better before/after and damage assessment.
- **Implication for us:** the map is **2D MapLibre** with a **terrain toggle**
  (MapTern webp) in `components/map/MapBottomBar.tsx`. We have **no 3D Tiles / glTF,
  no building extrusion, no point clouds, no splatting**.
- **Target:** a 3D layer stack (MapLibre 3D terrain + **3D Tiles**), building
  extrusion, then **point cloud** and finally **Gaussian Splatting** viewers as
  pluggable modules — each gated on the ingest story (Trend 2).

### Trend 5 — Digital twins (asset management & compliance)
- **What:** **digital twins** tied to **asset management and compliance**; capture →
  interpretation → action converge into interoperable systems with fewer handoffs.
- **Why it matters:** a twin is a *live, authoritative model of a real asset/place*
  you can query, simulate, and hold accountable (compliance) — the end-state of
  "decision support".
- **Implication for us:** today "twin-like" = **projects + maps + share** (static
  documents). We have **no asset registry, no telemetry binding, no state model, no
  simulation, no audit/compliance** loop.
- **Target:** an **asset/twin model** (entity → geometry → live state → telemetry
  stream → compliance checks) built *on* Trend 2 (data), Trend 3 (streaming),
  Trend 4 (3D), with a **provenance/audit log** so state changes are explainable.
  This is the capstone the other pillars feed.

### Article "challenges slowing adoption" → our mapping
- **Data standardization & interoperability** (~17% fully integrated) → our
  *opportunity*: be the STAC/OGC interop hub (Trend 2). **Gap today:** no OGC/STAC
  endpoints, naive CRS handling, no GDAL.
- **Tool fragmentation** (3–8 tools) → our *moat*: the pluggable monolith (core +
  `setup` CLI + module contract). **Protect and extend this.**
- **Public-sector funding/procurement** → our *advantage*: self-hostable Docker
  Compose; **add** procurement-grade governance (§10).
- **Governance** (provenance, fairness, privacy) → **gap today:** no audit log, no
  data lineage, no retention policy.

### "What's next" → our north star
1. Capture, interpretation, action converge → **fewer handoffs** (modules should
   compose without a human glue layer).
2. **Real-time streaming becomes the default.**
3. **Archival imagery as a live, queryable dataset.**
→ **North star:** *a live, standards-based, self-hostable spatial decision-support
platform where every module composes onto shared data, real-time, and AI
capabilities.*

---

## 3. Where EarthIQ Core stands today

> "Status" legend: **In place** / **Partial** / **Absent**. Evidence is a real path
> in this repo (verified). Update this table as capabilities ship.

| # | Capability | Serves trend | Status | Evidence / notes |
|---|-----------|-------------|--------|------------------|
| 1 | Pluggable-monolith shell + module contract | all (anti-fragmentation) | **In place** | `module_loader.py`, `App.tsx`, `module-registry.generated.ts`, `lib/tools.ts` |
| 2 | Setup CLI (registry→lock→codegen) | all | **In place** | `setup/src/setup_cli/*` |
| 3 | PostGIS vector store + **MVT tiling** | 2 | **In place** | `data/router.py:435` `/tiles/{id}/{z}/{x}/{y}.mvt` (`ST_AsMVT`) |
| 4 | S3 object store (RustFS) | 2 | **In place** | `core/storage.py` |
| 5 | Auth / RBAC / groups / sharing / access-request | 5, governance | **In place** | `auth/*`, `maps/share/*`, `profile/*` |
| 6 | Real-time **collaboration** (presence/cursors) | 3 | **Partial** | `collab/manager.py` — in-memory, single-process, no Redis |
| 7 | Real-time **notifications** | 3 | **Partial** | `notifications/hub.py` — in-memory, single-process |
| 8 | **Raster** ingest & compute | 2, 4 | **Absent** (dead-end) | `data/schemas.py` `STORED_ASSET_FORMATS` = stored, not parsed; no GDAL/rasterio in `pyproject.toml` |
| 9 | **GeoAI** (ML on imagery/vectors, RAG) | 1 | **Absent** | `ai-module` is a text LLM harness only (`/api/ai/chat`) |
| 10 | Open interop: **STAC / OGC API Features/Tiles/Records** | 2 | **Absent** | no OGC/STAC endpoints found in backend |
| 11 | **Background job engine** for heavy work | 2, 1 | **Absent** | ingest runs in-request (`data/router.py` `upload_dataset`) |
| 12 | **Real-time data streaming** (sensors/time-series) | 3 | **Absent** | no stream ingest API; **Redis idle** (`docker-compose.yaml` has `redis`, unused) |
| 13 | **3D** beyond 2D terrain | 4 | **Partial** | `components/map/MapBottomBar.tsx` terrain toggle (MapTern); no 3D Tiles/splatting |
| 14 | **Digital twin** (asset/telemetry/compliance) | 5 | **Absent** | projects/maps/share are static docs; no asset/telemetry model |
| 15 | **CI/CD** | quality | **Absent** | no `.github/` (despite `docs/test_plan.md` referencing CI) |
| 16 | Hermetic backend tests (L1–L4 plan) | quality | **Partial** | `backend/tests`, `docs/test_plan.md`; e2e mostly absent |

### Concrete problems found (the "cope with problems" list)
Grouped by severity. Each becomes a ticket in §6.

**P0 — latent bugs / production risks (fix first)**
- **P1. Presigned-URL host mismatch.** `core/storage.py:presign_url` builds URLs from
  `settings.storage_endpoint`; in Compose the backend sets that to `http://rustfs:9000`,
  which the **browser cannot resolve**. Likely breaks `/api/storage/download/*`
  redirects for external clients. (Verify: hit a presigned URL from a non-Compose
  browser.) Fix: a public base URL + signed path, or a same-origin proxy.
- **P2. No CI.** `docs/test_plan.md` targets CI (coverage gate, docker stage) that
  doesn't exist. Risk: regressions ship unnoticed.
- **P3. In-memory real-time state.** Collab + notification registries are per-process;
  a second backend replica breaks presence and drops pushes. Redis is available but
  unused.
- **P4. Heavy ingest in the request path.** 500 MB cap exists (`data/router.py:30`),
  but parsing/PostGIS insert run synchronously → timeouts/OOM on large or many-file
  uploads. Needs a job engine.

**P1 — capability gaps vs. the 2026 trends**
- **P5. Raster dead-end.** Rasters are downloadable but not analyzable/tilable;
  blocks GeoAI, 3D, and most "cloud-native analytics".
- **P6. No open interop.** No STAC/OGC API surface; CRS handling is naive
  (default EPSG:4326; `pyshp` without GDAL); limits the "interoperable hub" bet.
- **P7. GeoAI is conversational only.** No inference on our own data → can't deliver
  the #1 trend credibly.
- **P8. No real-time data story.** Only presence; no telemetry/time-series ingest.
- **P9. No 3D/twin.** 2D + terrain only.

**P2 — maintainability / hygiene**
- **P10. `data/service.py` is a ~1000-line god-file** (ingest dispatcher + many
  helpers + SQL). Extract per-format strategies + a `raster/` subpackage.
- **P11. Basemaps hardcoded** in `viz/router.py`; `MAPTILER_KEY` in `.env` is unused.
  Move to config/data-driven.
- **P12. Module version drift.** `modules.registry.yaml` (hydrology 1.0.0, resources
  1.0.0) vs `modules.lock.yaml` (both 0.1.0). Keep in sync via `setup sync`.
- **P13. Default secrets.** `.env`/Compose default to `earthiq/earthiq`; `.env.example`
  says "change-me-in-production". Add a startup guardrail for prod.
- **P14. No API versioning / rate limiting.** `/api/*` is unversioned; no throttling
  on upload/AI endpoints.

---

## 4. Strategic pillars

> Five pillars map 1:1 to the trends + the platform-engineering debt that blocks
> them. Each pillar lists **goal → workstreams → effort** (S < 1 wk, M 1–3 wk,
> L 1–3 mo, XL 3–6 mo) → **exit criteria**.

### Pillar A — Interoperability & cloud-native spatial analytics  *(Trend 2; fixes P4, P5, P6, P10, P14)*
**Goal:** be the *interop hub*: any producer feeds us, any consumer reads us, and
rasters are first-class and computable.
- **A1. Background job engine** (M). Add a worker (Celery/Arq + Redis) so ingest,
  reproject, tile-prep, and analysis run async. `upload_dataset` returns a job id →
  status → result. Fixes P4; unblocks everything below.
- **A2. Raster path** (L). Add `rasterio`/`rio-tilers` (+GDAL in the backend image);
  on ingest, convert to **COG** in S3, extract real metadata (bands, CRS, extent,
  resolution) into `GeoDataset.meta`, and serve **raster tiles** (COG XYZ) +
  overviews. Raster becomes `type=raster` *and* analyzable.
- **A3. Open interop surface** (L). **OGC API Features** over PostGIS (GeoJSON +
  queryables), **OGC API Tiles** (MVT + COG), **STAC + OGC API Records** so our
  `GeoDataset`/resources-module catalogue is a queryable catalog. This is the moat.
- **A4. Robust CRS/format handling** (M). Detect CRS (PROJ), reproject on ingest;
  replace `pyshp`-only path with GDAL for large/encoded shapefiles; accept GeoParquet.
- **A5. Refactor `data/service.py`** (M). Per-format strategy classes + `raster/`
  subpackage; keep the public API stable. Fixes P10.
- **A6. API hygiene** (S). `/api/v1` alias, upload/AI rate limits, consistent errors.
- **Exit:** upload a GeoTIFF → it appears in STAC, tiles render, and is queryable via
  OGC API Features/Tiles; a 1 GB GeoPackage ingests without a request timeout.

### Pillar B — GeoAI (spatial, not just conversational)  *(Trend 1; builds on A2)*
**Goal:** an inference pipeline that runs **on our imagery and datasets**, delivered
through the existing module + Map Toolbox contracts (so it stays pluggable).
- **B1. Inference runtime** (L). Provider-agnostic runner (ONNX Runtime / Ollama /
  vLLM) in a separate worker; model registry (version, task, I/O, license, provenance).
- **B2. Core tasks first** (L). Segmentation / land-cover **classification**,
  **change detection** (time-series COGs), and **anomaly detection** — the exact
  missions the article names.
- **B3. RAG over our data** (M). Ground the existing LLM harness in *our*
  `GeoDataset` metadata + queryable features, so "ask the map" answers are traceable
  to a dataset/feature (provenance, see §10).
- **B4. Expose as tools** (S–M). Add GeoAI ops as `tools` (`lib/tools.ts` contract)
  and `/api/ai/tools` actions, so the Map Toolbox can run them with live map context.
- **B5. Model governance** (M). Provenance + fairness/eval harness + cost/limits.
- **Exit:** "classify this COG" + "detect change between these two dates" produce
  GeoJSON/predictions, rendered on the map, with a cited model + input dataset.

### Pillar C — Real-time & streaming  *(Trend 3; fixes P3, P8)*
**Goal:** make freshness a first-class dimension — live presence **and** live data,
scale-out, with replay.
- **C1. Redis-backed real-time** (M). Move `collab/manager.py` + `notifications/hub.py`
  to Redis pub/sub (or **Redis Streams**) so N backend replicas share presence and
  pushes. Fixes P3; uses the idle `redis` service.
- **C2. Stream ingest** (L). A `POST /api/streams` (webhook / MQTT / Kafka bridge)
  that upserts telemetry into PostGIS time-series (`_timetravel` or Postgres
  TimescaleDB) and fans out over the socket. New `type=time-series` dataset.
- **C3. Live layers** (M). Frontend "live" layer type that subscribes to the socket
  and patches features in place (no full reload).
- **C4. Replay/history** (M). Query the past at any timestamp (article: "archival as
  a live dataset"); a "time scrubber" on the map.
- **Exit:** a sensor stream updates a live layer in < 1 s across two backend replicas,
  and the same series is queryable for past timestamps.

### Pillar D — 3D & digital twins  *(Trends 4 + 5; capstone on A, B, C)*
**Goal:** turn "maps" into a *live, queryable, decision-support* model of the world.
- **D1. 3D layer stack** (L). MapLibre 3D terrain (already partially there) +
  **3D Tiles (Cesium/MapLibre extension)** + building extrusion; as a pluggable module.
- **D2. Point cloud → Gaussian Splatting** (XL). Ingest `.splat`/`.ply`, a splatting
  viewer (e.g. a `splat` WebGL module). Gated on A2/A4 ingest.
- **D3. Asset/twin model** (L). `Asset` entity → geometry → **live state** →
  **telemetry** (from C2) → **compliance rules**; a "twin" page that binds any asset
  to its data, streams, 3D, and AI predictions.
- **D4. Compliance & simulation** (L). Rule checks over live state (thresholds,
  permits, SLAs) + lightweight "what-if" simulations; every change written to the
  audit log (§10).
- **Exit:** a real asset has a live 2D/3D twin showing telemetry, AI predictions, and
  compliance status, all traceable to sources.

### Pillar E — Platform engineering & governance (the enabler)  *(fixes P1, P2, P11–P14)*
**Goal:** make the platform *trustworthy* enough to host trends 1–5 at scale.
- **E1. CI/CD** (S–M). GitHub Actions: lint + `pytest` (L1–L3) + coverage gate,
  docker stage for L4/integration, frontend `build`/lint, `setup sync` check.
- **E2. Fix P1 presigned-URL host** (S). Public storage base URL or same-origin proxy.
- **E3. Governance** (L). **Audit log** (who/what/when on data+maps+access),
  **data provenance/lineage** (dataset → derived layers → AI output → twin state),
  **retention** policies, **PII/privacy** review, RBAC completeness audit.
- **E4. Security hardening** (M). Prod secret guardrail (P13), rate limiting (P14),
  upload validation, security headers, dependency scanning.
- **E5. Observability** (M). Structured logs, metrics, health beyond `/api/health`
  (db/storage/redis), tracing on long jobs.
- **E6. Hygiene** (S). Basemaps data-driven (P11), module version sync via `setup sync`
  (P12), API versioning (A6).
- **Exit:** a PR can't merge without green tests + coverage; any data change is
  auditable; no default secrets in a `prod` boot.

---

## 5. Phased roadmap

> Sequenced so each phase *unblocks* the next and produces shippable value. Entry/exit
> criteria make phases auditable. Rough, not a Gantt — size with real estimates.

### Phase 0 — Trust & foundations  *(now · ~2–4 wks · Pillar E, P1)*
- **Do:** E1 CI/CD · E2 presigned-URL fix · E4 secrets guardrail + rate limits · E6
  module-version sync + basemaps data-driven · split `data/service.py` (A5, partial).
- **Entry:** any state. **Exit:** green CI on main; downloads work from a browser;
  no default-secret boot in `prod`; `data/service.py` decomposed with stable API.
- **Why first:** removes the highest-risk latent bugs and makes every later phase
  verifiable. *Cheap, high-leverage, low-blast-radius.*

### Phase 1 — Interoperability + raster  *(next · ~1–3 mo · Pillar A)*
- **Do:** A1 job engine → A2 raster/COG/tiles → A4 CRS/format → A3 STAC/OGC API.
- **Entry:** Phase 0 exit. **Exit:** Pillar A "Exit" met (GeoTIFF → STAC → tiles →
  OGC query; 1 GB GeoPackage ingests async).
- **Why:** fastest *compounding* win — it is the moat and it unblocks GeoAI + 3D.

### Phase 2 — Real-time & streaming  *(next, parallelizable with Phase 1 · Pillar C)*
- **Do:** C1 Redis-backed presence → C2 stream ingest → C3 live layers → C4 replay.
- **Entry:** Phase 0 exit (needs CI + a second-replica story). **Exit:** Pillar C "Exit"
  met (< 1 s live update across 2 replicas + timestamp queries).
- **Why:** cheap to start (C1 reuses idle Redis), high perceived value (live maps).

### Phase 3 — GeoAI  *(then · ~2–6 mo · Pillar B, needs Phase 1 raster)*
- **Do:** B3 RAG (quick win, no raster needed) → B1 runtime → B2 tasks → B4 tools →
  B5 governance.
- **Entry:** A2 (COG) + E3 provenance. **Exit:** Pillar B "Exit" met (classify +
  change-detection with cited model & input).
- **Why:** the #1 trend; deferred until we can *feed it real imagery* and *prove*
  provenance.

### Phase 4 — 3D & digital twins  *(later · ~3–6+ mo · Pillar D, the capstone)*
- **Do:** D1 3D stack → D3 twin model → D4 compliance/simulation → D2 splatting.
- **Entry:** Phases 1–3 (data + streaming + AI). **Exit:** Pillar D "Exit" met (a live
  asset twin with telemetry, predictions, compliance, all traceable).
- **Why:** highest ceiling, highest cost — must ride on A/B/C. Don't build on sand.

### Dependencies (the "fewer handoffs" principle)
```
Phase 0 (CI, fixes) ─┬─► Phase 1 (interop+raster) ─┬─► Phase 3 (GeoAI) ─┐
                     └─► Phase 2 (real-time)  ──────┴──► Phase 4 (3D+twin) ◄─┘
```
Parallelism: Phase 1 and Phase 2 are independent after Phase 0 — run both if staffing
allows. Phase 4 only starts when 1 + 3 (and ideally 2) are solid.

---

## 6. Implementation backlog (ticket-ready)

> Copy each row into a tracker. **ID · Title · Pillar · Est · Key files · Acceptance
> criteria.** "Key files" are starting points — verify against `.clinerules` (never
> hand-edit generated files; reuse `@packages/ui`; verify via Compose or hermetic pytest).

### Phase 0 — foundations
| ID | Title | Pillar | Est | Key files | Acceptance criteria |
|----|-------|--------|-----|-----------|--------------------|
| T-01 | GitHub Actions CI (lint+pytest+build) | E1 | M | new `.github/workflows/ci.yml` | main is red if lint/tests fail; L1–L3 run; artifact `coverage.xml` |
| T-02 | Coverage gate (≥80% per module) | E1 | S | `backend/pyproject.toml`, `conftest.py` | `pytest-cov` wired; PR blocked below threshold |
| T-03 | Fix presigned-URL host for browser | E2 | S | `core/storage.py`, `api/storage/router.py` | presigned download opens in an external browser; unit test asserts host = public base |
| T-04 | Prod secret guardrail | E4 | S | `core/config.py`, `main.py` lifespan | boot fails fast if default secrets + `APP_ENV=prod` |
| T-05 | Rate limit upload + AI endpoints | E4 | M | `main.py` (middleware), `data/router.py`, `ai` router | 429 on burst; documented limits |
| T-06 | `/api/v1` alias + consistent errors | A6/E6 | S | `main.py`, error model | v1 routes live; uniform error envelope |
| T-07 | Basemaps → data-driven | E6 | S | `viz/router.py`, `.env` | basemaps from config/env incl. optional MapTiler key |
| T-08 | Module version sync + `setup sync` CI check | E6 | S | `modules.registry.yaml`, `modules.lock.yaml`, `setup` | registry/lock match; CI fails on drift |
| T-09 | Decompose `data/service.py` | A5 | M | `api/data/service.py` → `ingest/`, `raster/` | public API unchanged; existing tests green; no file > ~400 lines |
| T-10 | Health expands to db/storage/redis | E5 | S | `main.py` `/api/health` | reports component status; 200 only when deps healthy |

### Phase 1 — interoperability + raster
| ID | Title | Pillar | Est | Key files | Acceptance criteria |
|----|-------|--------|-----|-----------|--------------------|
| T-11 | Background job engine (Redis + worker) | A1 | M | new `backend/worker/*`, `core/jobs.py`, compose | long job returns job id; status poll; survives request close |
| T-12 | Ingest runs as a job (async) | A1/A4 | M | `api/data/router.py upload_dataset` | 1 GB GeoPackage uploads → 202 job → success; no request timeout |
| T-13 | Raster ingest → COG + real metadata | A2 | L | `api/data/ingest/raster.py`, `core/storage.py`, `pyproject.toml` | GeoTIFF → COG in S3; `meta` has bands/CRS/extent/res |
| T-14 | COG tile service (raster XYZ) | A2 | L | new `api/data/raster_tiles.py` | `/tiles/{id}/{z}/{x}/{y}.png` renders in MapLibre for a raster dataset |
| T-15 | OGC API Features over PostGIS | A3 | L | new `api/ogc/features.py` | `/collections`, `/collections/{id}/items`, `queryables`; CITE-style tests |
| T-16 | OGC API Tiles (MVT + COG) | A3 | M | new `api/ogc/tiles.py` | tile matrix set + tile endpoints; conforms to OGC API Tiles |
| T-17 | STAC + OGC API Records (catalog) | A3 | L | new `api/ogc/records.py`, `resources-module` | `GeoDataset` exposed as STAC items; `/search` works (bbox, time, tags) |
| T-18 | Robust CRS detection + reproject | A4 | M | `api/data/ingest/*` (GDAL), `pyproject.toml` | uploads in EPSG:32633/3857 store as 4326 with correct `crs`; GeoParquet accepted |
| T-19 | GDAL in backend image (rasterio/rio-tilers) | A2/A4 | M | `infra/docker/backend.*.Dockerfile`, `pyproject.toml` | `gdalinfo`/`rasterio` import OK in container; wheel builds clean |
| T-20 | `type=time-series` dataset + time index | A2/C2 | M | `data/models.py`, `alembic` | time-indexed features queryable by `datetime` range |

### Phase 2 — real-time & streaming
| ID | Title | Pillar | Est | Key files | Acceptance criteria |
|----|-------|--------|-----|-----------|--------------------|
| T-21 | Redis pub/sub transport | C1 | M | `collab/manager.py`, `notifications/hub.py`, `core/redis.py` | presence + pushes shared across 2 backend replicas (test) |
| T-22 | Stream ingest API (webhook/MQTT) | C2 | L | new `api/streams/*` | `POST /api/streams` upserts telemetry; fans out to live subscribers |
| T-23 | Time-series upsert + retention | C2 | M | `api/streams/*`, `alembic` | duplicate readings idempotent; old points pruned per policy |
| T-24 | Live layer type (frontend) | C3 | M | `components/map/*`, `lib/useCollaboration.ts` | live layer patches features in place; no full reload; backoff on disconnect |
| T-25 | Replay/time scrubber | C4 | M | `api/data` time query, map UI | scrub to a past timestamp; layer reflects that instant |

### Phase 3 — GeoAI
| ID | Title | Pillar | Est | Key files | Acceptance criteria |
|----|-------|--------|-----|-----------|--------------------|
| T-26 | RAG over datasets (grounded answers) | B3 | M | `ai-module` `context.py`, `app.api.data` | answers cite a dataset id + feature; hallucination reduced |
| T-27 | Inference runtime (ONNX/Ollama/vLLM) | B1 | L | new `ai-module` inference worker | provider-agnostic run; warm cache; timeout + cost guard |
| T-28 | Model registry + provenance | B1/B5 | M | new `ai` models, `alembic` | model version/task/I-O/license stored; each run links input+model |
| T-29 | Land-cover classification task | B2 | L | inference job + `api/ai` | classify a COG → GeoJSON classes on the map |
| T-30 | Change detection (time-series COG) | B2 | L | inference job + `data` time query | two dates → change polygons; report with confidence |
| T-31 | Anomaly detection | B2 | L | inference job | flag anomalous features/tiles with reasons |
| T-32 | GeoAI ops as Map Toolbox tools | B4 | S | `lib/tools.ts`, `ai` `tools.py` | run classify/change from Toolbox with live map context |

### Phase 4 — 3D & digital twins
| ID | Title | Pillar | Est | Key files | Acceptance criteria |
|----|-------|--------|-----|-----------|--------------------|
| T-33 | 3D Tiles layer + building extrusion | D1 | L | new `3d` module (`module.yaml`), map | 3D Tiles layer renders alongside 2D; toggles cleanly |
| T-34 | Asset/twin domain model | D3 | L | new `twin` module (models, router, alembic) | asset → geometry → state → telemetry → rules; CRUD + API |
| T-35 | Twin page (data+stream+3D+AI) | D3 | L | `twin` frontend, `@packages/ui` | one screen shows all four, each with a source link |
| T-36 | Compliance rules engine | D4 | L | `twin` service | rule checks over live state; pass/fail + reasons; audited |
| T-37 | What-if simulation (lightweight) | D4 | L | `twin` service | adjust a param → predicted state delta, versioned |
| T-38 | Gaussian Splatting viewer | D2 | XL | new `splat` module (WebGL) | load + orbit a `.splat`/`.ply`; perf on mid-range GPU |

### Cross-cutting spikes (do early, de-risk later phases)
| ID | Spike | De-risks | Est |
|----|-------|----------|-----|
| S-1 | "Raster proof-of-concept": one COG → tile in the map | A2, T-13/14 | S |
| S-2 | "Interop probe": conform to OGC API Features read-only | A3, T-15 | S |
| S-3 | "2-replica presence": run 2 backends, verify collab via Redis | C1, T-21 | S |
| S-4 | "GeoAI spike": run one ONNX segmentation on a sample COG | B1/B2 | S |

---

## 7. Target architecture

> Goal: a clean, layered, **standards-exposing** platform where every module
> composes onto shared **data**, **real-time**, and **AI** capabilities. Nothing
> here changes the module contract — new capabilities are *core services* that
> modules call, plus *optional modules* (3D, twin, splat) that add UI.

```
                                   ┌─────────────────────────────────────────────┐
  Producers ──►  INGEST            │   API LAYER (FastAPI)                       │  ──► Consumers
  (files, STAC,   │  parse·reproj · │  ┌────────────────────────────────────────┐ │   (maps, dashboards,
   streams, AI)   │  validate·COG  │  │ REST: /api/v1/data · /api/v1/maps ...  │ │    STAC clients, GIS,
                  ▼                │  │ OGC : Features · Tiles · Records(STAC) │ │    BI, other systems)
            ┌───────────────────┐  │  │ WS  : /ws collab · streams · notif    │ │
            │  JOBS  (worker)   │  │  └────────────────────────────────────────┘ │
            │  ingest·analysis· │  │  ┌────────────────────────────────────────┐ │
            │  inference·tile   │  │  │  GEOAI: inference · RAG · tasks        │ │
            │  (Redis queue)    │  │  └────────────────────────────────────────┘ │
            └─────────┬─────────┘  └─────────────────────────────────────────────┘
                      │
   ┌──────────────────┼───────────────────────────────────────────────────────────┐
   │  SHARED DATA PLANE                                                         │
   │  ┌────────────┐  ┌───────────────┐  ┌─────────────────────────────────┐     │
   │  │ PostGIS    │  │ S3 / RustFS   │  │ Redis                            │     │
   │  │ vectors ·  │  │ COG · files · │  │ pub/sub · streams · job queue ·  │     │
   │  │ time-series│  │ STAC store    │  │ cache                            │     │
   │  └────────────┘  └───────────────┘  └─────────────────────────────────┘     │
   │  + provenance/lineage + audit log + retention policies                       │
   └──────────────────────────────────────────────────────────────────────────────┘
        ▲
        │  composes onto the above (no bespoke plumbing)
   MODULES (pluggable): hydrology · urban-planning · resources · ai · 3d · twin · splat
        shell: React/MapLibre (2D + 3D) · Map Toolbox (lib/tools.ts) · live layers
```

**Key invariants (what the design protects):**
1. **One data plane.** Vectors (PostGIS) + rasters (COG in S3) + time-series +
   metadata/STAC all live in shared storage; modules never copy data around.
2. **Standards at the edge.** OGC/STAC endpoints are *thin adapters* over the data
   plane — adding a standard ≠ adding a data model.
3. **Everything async where it's heavy.** Jobs for ingest/analysis/inference/tiles.
4. **Real-time via Redis.** Presence, notifications, and data events share one bus.
5. **Provenance is structural.** Every derived artifact (tile, prediction, twin
   state) records its input dataset + model + who ran it.
6. **Modules stay pluggable.** New capabilities are core services or new modules;
   the shell still mounts nothing by name.

---

## 8. Technology & standards choices

> Principles: **standards over bespoke**, **provider-agnostic**, **self-hostable**,
> **reuse the existing stack** (FastAPI, SQLAlchemy, React/MapLibre, pnpm workspace).
> Prefer the smallest addition that conforms to a standard.

| Area | Choose | Why | Avoid / later |
|------|--------|-----|---------------|
| Vector interop | **OGC API Features**, PostGIS `ST_AsMVT` (existing) | queryable + tileable, broad GIS support | rolling our own query API |
| Raster format | **Cloud Optimized GeoTIFF (COG)** in S3 | cloud-native, tileable, "archival = live" | non-standard rasters |
| Raster compute | **rasterio + rio-tilers** (Python) first; **PostGIS-RASTER / DuckDB** for heavy analytics | minimal deps, works in worker | a full lakehouse until scale demands |
| Catalog | **STAC** (+ **OGC API Records**) | industry standard for imagery discovery | opaque catalogue only |
| Tiling | **OGC API Tiles** (MVT vector + COG raster) | standard tile matrix sets | ad-hoc tile endpoints |
| Jobs | **Redis + Arq** (or Celery) | we already run Redis; async ingest/analysis | adding Kafka until needed |
| Time-series | PostGIS + `datetime` index first; **TimescaleDB** if volume grows | reuse PostGIS, low ops | a separate TSDB prematurely |
| Real-time bus | **Redis pub/sub / Streams** | single bus for presence + data + jobs | separate MQTT broker unless edge devices |
| Inference | **ONNX Runtime** (local) + **Ollama/vLLM** (LLM/VLM), behind the existing provider-agnostic harness | keep provider-agnostic; local-first | hard-wiring one cloud provider |
| GeoAI models | open weights (e.g. SAM/SegFormer/land-cover) as **ONNX**, fine-tuned per mission | matches the "foundation model" trend | black-box SaaS only |
| 3D | **MapLibre 3D** + **3D Tiles (Cesium)** extension; later point cloud, **Gaussian Splatting** (a splat WebGL renderer) | progressive, standards-based | a full Cesium-only rewrite |
| API | keep **FastAPI**; add `/api/v1`, OpenAPI, rate limits | already in use | framework swap |
| Testing | **pytest** (L1–L4) + **Playwright** e2e + OGC/STAC **conformance** tests | hermetic + standards proof | skip conformance (it's the moat) |
| Secrets | **sops/age** or a secret store; fail-fast in prod | governance | defaults in prod |

**Rationale for COG + STAC as the spine.** They are the two formats the industry
converging on, they make "archival imagery = a live, queryable dataset" (the
article's #3 durable direction) trivial, and they let us be an *interop hub* with
thin adapters — the compounding moat.

---

## 9. Testing & quality (long-run)

> Extends the L1–L4 model in `docs/test_plan.md` (which is sound) and adds the
> standards + reliability layers the new pillars require. Keep hermetic (in-memory
> SQLite / fakes) as the default; real infra only in a gated docker stage.

- **L1 unit / L2 in-process / L3 API (ASGI) / L4 real-infra** — keep, enforce in CI.
- **Conformance (new, the moat).** OGC API **Features** & **Tiles** + **STAC**
  conformance test suites (or CITE) in the L4 stage. *If it's a standard, prove it.*
- **Raster golden tests.** Fixed sample COG → expected tile bytes/metadata; pin
  rio-tilers/rasterio versions to avoid silent output drift.
- **Time-series tests.** Idempotent upsert, ordering, retention pruning, replay.
- **Real-time tests.** Two-process presence via Redis (test fixture spins a second
  manager); backpressure + disconnect/reconnect on the socket.
- **GeoAI eval harness.** Fixed inputs → deterministic (seeded) outputs; regression
  thresholds on a small labeled set; provenance recorded per run.
- **E2E (Playwright).** Login → upload → layer on map → share → public view; a
  "live layer" scenario; a "twin" scenario (Phase 4). Run in the Compose stack.
- **Load/soak.** Concurrent uploads (job queue), sustained stream ingest, tile
  throughput (target: p95 tile < 200 ms for vector, < 400 ms for raster).
- **Contract tests.** Frontend ↔ backend OpenAPI types; module `tools` contract
  validator already in `lib/tools.ts` — add a test that asserts valid exports.
- **Coverage & gates.** ≥ 80% line per module (core + each module); PR-blocking.

---

## 10. Governance, security & provenance

> The article is explicit: as AI grows, **provenance, fairness, and privacy** become
> table stakes. For a self-hosted platform these are also the *procurement* unlock.

- **Audit log (T, new).** Append-only `audit_events` (who, what, when, resource,
  action, before/after hash) for data, maps, access, sharing, and AI runs. Queryable
  + exportable (CSV/JSON).
- **Provenance / lineage (B5/E3).** Every derived artifact records: source
  dataset(s) → transform → output; AI outputs record model + version + inputs; twin
  state records its telemetry + rules. A "lineage" view per asset/dataset.
- **Access & RBAC.** Complete the permission matrix (ensure *every* endpoint enforces
  it — audit); keep the `ai:use`-style capability gates as the pattern for new
  capabilities (inference, streaming write, twin admin).
- **Privacy & PII.** Review geolocation + identity coupling; field-level redaction in
  exports; consent/retention defaults; a privacy checklist per release.
- **Fairness/eval (GeoAI).** Bias/coverage eval across regions/classes; document
  model limitations; no silent "black box" predictions in compliance decisions.
- **Secrets & hardening (E4).** Fail-fast on default creds in prod; rate limiting;
  upload validation (type/size/magic bytes); security headers (CSP, HSTS); dep
  scanning in CI; minimal container images.
- **Retention & compliance (D4).** Configurable retention per dataset/stream;
  compliance rule engine with pass/fail + reasons (ties to digital-twin "compliance").
- **Openness.** OGC/STAC conformance = external auditability; publish a compliance
  & security page for procurement.

---

## 11. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Scope sprawl (5 trends, 1 team) | High | High | One phase at a time (§5); each has exit criteria; spikes de-risk before commits |
| Raster/GDAL complexity + image size | Med | Med | Start with rasterio/rio-tilers (S-1 spike); pin versions; golden tests |
| OGC/STAC conformance is fiddly | Med | Med | Adopt early (S-2); use reference conformance suites; treat as the moat |
| In-memory real-time limits scale | Med | Med | Redis-backed (C1) in Phase 2; 2-replica test (S-3) |
| GeoAI cost/quality (GPU, model drift) | High | Med | Provider-agnostic + local ONNX first; eval harness + limits (B5) |
| 3D/splatting perf on low-end | Med | Med | Progressive enhancement; keep 2D as the floor; perf budget in e2e |
| Governance seen as "slow" | Med | Med | Frame as the *procurement* unlock; do in small increments (E3) |
| Presigned-URL / network egress surprises | Low | Med | Fix in Phase 0 (T-03) + external-browser test |
| Module drift / generated-file conflicts | Med | Low | `setup sync` in CI (T-08); never hand-edit generated files |

---

## 12. Success metrics

- **Adoption / interop:** # of external producers/consumers via STAC/OGC; # of
  datasets ingested; # of module↔core compositions (should be zero bespoke glue).
- **Value:** # of decision-support surfaces (live dashboards, alerts, twin states);
  time-to-insight (upload → usable analysis) — target: minutes, not sessions.
- **Reliability:** p95 tile latency (vec < 200 ms, raster < 400 ms); stream update
  < 1 s; job success rate > 99%; uptime.
- **Quality:** coverage ≥ 80% per module; conformance suites green; e2e pass rate.
- **Trust:** % data actions auditable; provenance present on 100% of AI outputs.
- **North-star check:** can a user go *data → analysis → live state → decision* in
  one session without leaving the platform? (The article's role shift, delivered.)

---

## 13. Open decisions (need a call)

1. **Job engine:** Arq vs Celery (both on Redis) — pick one (A1).
2. **Time-series:** native PostGIS `datetime` index vs **TimescaleDB** extension now
   vs later (C2/T-23).
3. **Raster analytics:** rasterio/rio-tilers vs PostGIS-RASTER vs DuckDB — and at
   what scale (A2/T-14).
4. **GeoAI hosting:** self-host ONNX/Ollama vs allow cloud VLMs behind the harness
   (B1, and the privacy posture in §10).
5. **3D approach:** MapLibre 3D + Cesium 3D Tiles vs full CesiumJS — and whether
   splatting is Phase 4 or a separate "later" (D1/D2).
6. **Public storage URL** strategy for presigned downloads (T-03): public base URL
   vs same-origin proxy vs object storage CDN.
7. **Public release posture:** open-source the standards surface (good for adoption)
   vs keep it private — affects the "help people in the long run" goal.

---

## 14. References

- **Trend source:** BioMedware, *5 Geospatial Trends and Use Cases Shaping the
  Industry* (Jul 2026), G. Jacquez — https://biomedware.com/5-geospatial-trends/
- **Market data cited therein:** The Business Research Company, *Geospatial Analytics
  Global Market Report* (~$123B 2026 → >$243B 2030, ~19% CAGR).
- **Standards (targets):** OGC API Features · OGC API Tiles · OGC API Records /
  **STAC** · Cloud Optimized GeoTIFF (COG) · 3D Tiles · MapLibre GL JS.
- **Repo (ground truth):** `.clinerules`, `docs/test_plan.md`, `README.md`,
  `backend/app/api/data/*`, `backend/app/core/*`, `modules/*/module.yaml`,
  `frontend/apps/web/src/lib/tools.ts`.

---

### How to start *this week*
1. Create tickets **T-01 → T-04** (CI + presigned-URL + secret guardrail) and ship
   them (Phase 0). This is small, safe, and makes everything else verifiable.
2. Run the **spikes S-1 (raster→tile)** and **S-3 (2-replica presence)** in parallel
   to de-risk the two highest-value pillars.
3. Decide items **1, 6, 7** in §13 so Phase 1 can proceed without rework.

*Living document — add a dated addendum below instead of rewriting history.*

<!-- ADDENDUMS (append dated notes here) -->

---

## Addendum — 2026-09-04 · Phase 0 foundations (non-CI, non-AI) — IMPLEMENTED

Per request, **CI (T-01/T-02) and the GeoAI pillar (Phase 3 / B*) were deferred**.
The remaining Phase 0 "trust & foundations" tickets were implemented, with the
public API kept stable and the module contract untouched.

| Ticket | Status | What shipped | Key files |
|--------|--------|--------------|-----------|
| T-03 | ✅ | Presigned GET URLs rewritten to a browser-reachable host via new `STORAGE_PUBLIC_BASE_URL` (path-style S3 signature is host-independent, so only scheme+netloc+base-path are swapped; query/signature preserved). No-op when unset. | `app/core/storage.py` (`presign_url`, `_apply_public_base`), `config.py` |
| T-04 | ✅ | Fail-fast guardrail: when `APP_ENV=prod`, boot raises `RuntimeError` listing every credential still at a default (`JWT_SECRET`, `STORAGE_ACCESS_KEY/SECRET_KEY`, `DATABASE_URL`), with `change-me-in-production` treated as weak. No-op in dev. Wired into `lifespan`. | `app/core/guardrail.py`, `main.py` |
| T-05 | ✅ | In-process sliding-window rate limiter (pure stdlib, zero deps, no Redis needed) applied to heavy/sensitive prefixes (`/api[/v1]/data/datasets/upload`, `/api[/v1]/ai/`, `/api[/v1]/storage/upload`). 429 + `Retry-After` + uniform envelope. | `app/core/rate_limit.py`, `main.py` |
| T-06 | ✅ | `/api/v1` 1:1 alias over **all** core + module routers, plus a uniform error envelope (`{error:{code,message,details}, detail}`) for HTTP/422/500. `module_loader` now honours its `prefix` arg (was hard-coded `/api`). | `main.py`, `app/core/errors.py`, `module_loader.py` |
| T-07 | ✅ | Basemaps are now data-driven: `BASEMAPS_CONFIG` (JSON list) overrides, optional MapTiler entry appended when `MAPTILER_KEY` set, built-in defaults otherwise. Invalid JSON falls back gracefully. | `app/api/viz/router.py` |
| T-09 | ✅ | `data/service.py` (~1000-line god-file) decomposed into `data/ingest/{common,geojson,shapefile,kml,georss,csv,dispatcher}.py` + `data/crud.py`. `service.py` is now a thin re-export shim → **public API unchanged**, all existing callers/tests pass. | `app/api/data/*` |
| T-10 | ✅ | Health expanded to component status: `GET /api/health` (liveness, 200) + `GET /api/health/ready` (readiness, 503 on degradation) probing **database / storage / redis** (best-effort, never crashes). | `app/core/health.py`, `main.py` |
| T-08 | ⏭️ | Module registry/lock version sync + `setup sync` CI check — **skipped** (CI-deferred). | — |
| T-01/T-02 | ⏭️ | CI + coverage gate — **skipped** (CI-deferred per request). | — |

**Also fixed (pre-existing, unrelated to Phase 0 scope):** the ai-module test
harness failed to import `app.api.profile.models`, so `users.primary_organization_id`
FK → `organizations` broke `Base.metadata.create_all` (16 errors). Added the missing
import in `modules/ai-module/backend/tests/conftest.py`.

**Verification (hermetic pytest, no venv per `.clinerules`):**
- `backend/`: **144 passed** (117 pre-existing + 27 new `tests/test_phase0_foundation.py`).
- `modules/ai-module/backend`: **123 passed, 1 skipped** (was 16 errors → fixed).
- urban-planning / hydrology / resources: no backend test suites present (nothing to run).

**Deliberately NOT done (deferred):** CI/CD, GeoAI inference (Pillar B), raster/STAC/OGC
(Phase 1), real-time streaming (Phase 2), 3D/twin (Phase 4). Open decision **§13-1
(job engine)** and **§13-6 (public storage URL strategy)** remain open — the T-03
implementation supports *either* a public base URL **or** (next) a same-origin proxy.

**Note on verification method:** tests were run via `uv run` in a throwaway
`/tmp` env (`UV_PROJECT_ENVIRONMENT`), **not** a project `venv` and **not** the
Compose stack — consistent with `.clinerules` §6 (hermetic pytest allowed). A full
`docker compose up --build` browser verification of the presigned-URL/download
flow is recommended before merge (see T-03 acceptance criterion).