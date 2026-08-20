# EarthIQ Core — Test Case Plan

> Scope: **Backend** (`backend/app`) and key **Frontend** shared packages.
> Convention (already in place): tests are layered **L1 → L4**.
>
> | Layer  | Name                                         | Tooling                 | Notes                                            |
> | ------ | -------------------------------------------- | ----------------------- | ------------------------------------------------ |
> | **L1** | Pure unit (no I/O)                           | `pytest`                | Security, permission math, schemas, pure helpers |
> | **L2** | In-process unit (mocked I/O)                 | `pytest` + fakes        | `ConnectionManager`, services against fakes      |
> | **L3** | API integration (in-memory SQLite)           | `httpx.ASGITransport`   | FastAPI routers over SQLite                      |
> | **L4** | Real-infra integration (PostGIS / S3 / SMTP) | `pytest -m integration` | Requires `docker compose up -d`                  |
>
> **Frontend** uses `vitest` + `@testing-library/react` (already wired in `packages/map`).

---

## 0. Global Test-Infrastructure Hardening (prerequisites)

Before module tests, strengthen the harness:

1. **`pytest.ini_options`** — add markers `unit`, `api`, `integration`, `slow`, `network`. Gate CI on `unit + api` by default; `integration` runs in a docker stage.
2. **`conftest.py`** —
   - Add fixtures: `owner_headers`, `editor_headers`, `viewer_headers`, `anonymous`, `group_admin_headers`, `group_member_headers`.
   - Add a `superuser_client` fixture (JWT with `is_superuser=True`).
   - Add `fake_s3` (`pytest-mock` over `app.core.storage`) and `fake_smtp` (capture outbound mail).
   - Add `fake_websocket_client` that wraps `ConnectionManager` for L2/L3 WebSocket tests.
3. **`test_data/`** directory of canonical fixtures:
   - `sample_point.geojson`, `sample_linestring.geojson`, `sample_polygon.geojson`, `sample_mixed.geojson`, `invalid.geojson`, `huge.geojson` (for size limits).
   - `sample_users.json`, `sample_groups.json`, `sample_project.json`, `sample_map.json`.
4. **Coverage** — add `pytest-cov` and a `coverage.xml` upload to CI. Target **≥ 80% line coverage** per module.
5. **Test isolation** — every L3 test must pass with **parallel `pytest-xdist`** (verify no cross-test state via `Base.metadata.sorted_tables` wipe).
6. **Determinism** — pin `time.time` / `freezegun` where timestamps are asserted.

---

## 1. `app.core` (foundation)

### 1.1 `app.core.security` — **L1** (already 113 lines, mostly covered)

| ID     | Case                                  | Expected                                     |
| ------ | ------------------------------------- | -------------------------------------------- |
| SEC-01 | `hash_password("short")`              | starts with `$2b$`, no plaintext             |
| SEC-02 | `verify_password` round-trip          | `True`                                       |
| SEC-03 | `verify_password` wrong pw            | `False`                                      |
| SEC-04 | 200-byte password (bcrypt 72 B limit) | verifies correctly (SHA-256 pre-hash)        |
| SEC-05 | Same pw → 2 different hashes          | both verify                                  |
| SEC-06 | Garbage hash                          | returns `False`, no raise                    |
| SEC-07 | Empty password                        | hashes, does not crash                       |
| SEC-08 | Unicode / emoji password              | round-trips                                  |
| SEC-09 | JWT round-trip `sub`                  | payload matches                              |
| SEC-10 | JWT with extra claims                 | claims preserved                             |
| SEC-11 | JWT custom expiry                     | `exp` set                                    |
| SEC-12 | Expired token                         | `ExpiredSignatureError`                      |
| SEC-13 | Tampered signature                    | `JWTError`                                   |
| SEC-14 | Token signed with different secret    | `JWTError`                                   |
| SEC-15 | Token missing `sub`                   | `KeyError` or `JWTError` (decided behaviour) |
| SEC-16 | `alg: none` attack                    | rejected                                     |

### 1.2 `app.core.config` — **L1**

| ID     | Case                                | Expected                           |
| ------ | ----------------------------------- | ---------------------------------- |
| CFG-01 | Defaults load                       | sensible defaults for all fields   |
| CFG-02 | Env overrides (e.g. `DATABASE_URL`) | `get_settings()` reflects override |
| CFG-03 | `lru_cache` stability               | same instance twice                |
| CFG-04 | Invalid enum-ish field              | pydantic raises                    |
| CFG-05 | `.env` file loaded when present     | values applied                     |

### 1.3 `app.core.db` — **L1/L2**

| ID    | Case                                              | Expected                         |
| ----- | ------------------------------------------------- | -------------------------------- |
| DB-01 | `get_db` yields session, commits on success       | row persisted                    |
| DB-02 | `get_db` rolls back on exception                  | no partial writes                |
| DB-03 | `Base.metadata.sorted_tables` includes all models | all 4 migrations' tables present |
| DB-04 | FK enforcement (SQLite pragma)                    | orphan delete rejected           |

### 1.4 `app.core.storage` — **L2 (fake S3) + L4 (real RustFS)**

| ID     | Case                                                  | Expected                          |
| ------ | ----------------------------------------------------- | --------------------------------- |
| STO-01 | `ensure_bucket` when bucket exists                    | no-op                             |
| STO-02 | `ensure_bucket` when bucket missing                   | created                           |
| STO-03 | `ensure_bucket` on 403                                | re-raises                         |
| STO-04 | `upload_file(bytes)`                                  | URL returned with bucket/key      |
| STO-05 | `upload_file(BytesIO)`                                | same result                       |
| STO-06 | `upload_file` client error                            | `ClientError` propagated          |
| STO-07 | `download_file` existing key                          | returns bytes                     |
| STO-08 | `download_file` missing key                           | `ClientError(NoSuchKey)`          |
| STO-09 | `delete_file` missing key                             | no-op (idempotent)                |
| STO-10 | `presign_url` with `expires_in=60`                    | valid URL, 60 s TTL               |
| STO-11 | `list_objects(prefix="")`                             | all objects                       |
| STO-12 | `list_objects(prefix="user1/")`                       | filtered                          |
| STO-13 | `list_objects` paginator > 1 page                     | all objects returned              |
| STO-14 | **L4**: real `docker compose up -d rustfs` round-trip | upload → list → download → delete |

---

## 2. `app.api.auth` — **L3 (mostly covered) + L1 schemas**

### 2.1 Schemas — **L1**

| ID     | Case                                                       |
| ------ | ---------------------------------------------------------- |
| AUA-01 | `RegisterIn` rejects bad email                             |
| AUA-02 | `RegisterIn` rejects pw < 8                                |
| AUA-03 | `RegisterIn` accepts valid                                 |
| AUA-04 | `UserOut` excludes `hashed_password` (serialisation guard) |
| AUA-05 | `GroupIn.permissions` dedupes IDs                          |
| AUA-06 | `TokenIn` normalises email to lowercase                    |

### 2.2 Service — **L2 (DB fake) — optional**, since L3 covers them.

### 2.3 Router / API — **L3** (extend `test_auth_api.py`)

| ID     | Case                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| AUB-01 | `POST /register` 201 (existing)                                                   |
| AUB-02 | `POST /register` duplicate → 409 (existing)                                       |
| AUB-03 | `POST /register` invalid email → 422 (existing)                                   |
| AUB-04 | `POST /token` valid → 200 + bearer (existing)                                     |
| AUB-05 | `POST /token` wrong pw → 401 (existing)                                           |
| AUB-06 | `POST /token` unknown user → 401 (existing)                                       |
| AUB-07 | `GET /me` no auth → 401/403 (existing)                                            |
| AUB-08 | `GET /me` admin → 200, `*` perm (existing)                                        |
| AUB-09 | `GET /me` non-superuser → no `*` perm                                             |
| AUB-10 | **NEW**: `GET /me` reflects updated group permissions after `PUT /groups/{id}`    |
| AUB-11 | `GET /users` admin → 200, non-admin → 403 (existing)                              |
| AUB-12 | `POST /users` admin → 201, non-admin → 403 (existing)                             |
| AUB-13 | `PUT /users/{id}` toggles `is_active`                                             |
| AUB-14 | `PUT /users/{id}` password reset (must be re-verified at `/token`)                |
| AUB-15 | `DELETE /users/{id}` cascades group memberships                                   |
| AUB-16 | **NEW**: `DELETE /users/{id}` refuses to delete self                              |
| AUB-17 | **NEW**: `DELETE /users/{id}` refuses to delete last superuser                    |
| AUB-18 | `PUT /users/{id}` toggle `is_superuser`                                           |
| AUB-19 | `POST /groups` + `PUT /groups/{id}` round-trip (existing partial)                 |
| AUB-20 | `DELETE /groups/{id}` — members lose permissions immediately                      |
| AUB-21 | `PUT /users/{id}/groups` assign/unassign                                          |
| AUB-22 | **NEW**: `PUT /users/{id}/groups` refuses unknown group → 404                     |
| AUB-23 | **NEW**: Concurrency — two `POST /register` same email → exactly one 201, one 409 |
| AUB-24 | **NEW**: Token with expired `exp` rejected at `/me`                               |
| AUB-25 | **NEW**: Token signed with different `jwt_secret` rejected                        |

---

## 3. `app.api.maps` — **L3 (primary) + L4 (PostGIS)**

### 3.1 Permission matrix (`compute_user_permission`) — **L1**

Build a table-driven test (parametrised over `(user_state, map_state, expected)`):

| ID     | User                                   | Map                                                          | Expected              |
| ------ | -------------------------------------- | ------------------------------------------------------------ | --------------------- |
| MPA-01 | None                                   | `is_public=True`                                             | `read`                |
| MPA-02 | None                                   | `is_public=False, share_link_enabled=True, link_role=viewer` | `read`                |
| MPA-03 | None                                   | `is_public=False, share_link_enabled=True, link_role=editor` | `write`               |
| MPA-04 | None                                   | private, no link                                             | `None`                |
| MPA-05 | Owner                                  | any                                                          | `admin`               |
| MPA-06 | Superuser                              | any                                                          | `admin`               |
| MPA-07 | Member of group w/ `read`              | private                                                      | `read`                |
| MPA-08 | Member of group w/ `write`             | private                                                      | `write`               |
| MPA-09 | Member of group w/ `admin`             | private                                                      | `admin`               |
| MPA-10 | `user_access.role=editor`              | private                                                      | `write`               |
| MPA-11 | `user_access.role=pending`             | private                                                      | **ignored**           |
| MPA-12 | Combined public + group `write`        | —                                                            | `write`               |
| MPA-13 | Combined `user_access=viewer` + public | —                                                            | `read` (highest wins) |
| MPA-14 | Group `read` + `user_access=editor`    | —                                                            | `write`               |

### 3.2 Router — **L3**

| ID     | Case                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| MPB-01 | `GET /maps` anonymous, only public maps                                                    |
| MPB-02 | `GET /maps` owner sees private                                                             |
| MPB-03 | `GET /maps` member sees group-shared                                                       |
| MPB-04 | `GET /maps` sorted `updated_at desc`                                                       |
| MPB-05 | `POST /maps` auth required → 401/403                                                       |
| MPB-06 | `POST /maps` creates map + owner `user_access` row                                         |
| MPB-07 | `POST /maps` with `group_access` persists all                                              |
| MPB-08 | `GET /maps/{id}` unknown → 404                                                             |
| MPB-09 | `GET /maps/{id}` unauthorised → 403                                                        |
| MPB-10 | `PUT /maps/{id}` viewer → 403, editor → 200, owner → 200                                   |
| MPB-11 | `PUT /maps/{id}` partial update leaves other fields                                        |
| MPB-12 | `DELETE /maps/{id}` viewer → 403, editor → 403 (needs admin), owner → 204                  |
| MPB-13 | `DELETE /maps/{id}` cascades `map_group_access` + `map_user_access`                        |
| MPB-14 | `POST /maps/{id}/share` viewer → 403, owner → 200                                          |
| MPB-15 | `POST /maps/{id}/share` upserts groups (add, change, remove)                               |
| MPB-16 | **NEW**: `PUT /maps/{id}` cannot change `owner_id`                                         |
| MPB-17 | **NEW**: `GET /maps/{id}` with `share_link_enabled` returns `share_token` only to managers |
| MPB-18 | **NEW**: Validation — `center_lng` outside ±180 → 422                                      |
| MPB-19 | **NEW**: Validation — `zoom` outside [0, 22] → 422                                         |
| MPB-20 | **NEW**: `layers_config` non-list → 422                                                    |
| MPB-21 | **NEW**: `layers_config` items with unknown keys → 422                                     |

### 3.3 Share sub-module — **L3 + L2 for email**

| ID     | Case                                                                                         |
| ------ | -------------------------------------------------------------------------------------------- |
| SHR-01 | `GET /people?q=al` returns matching active users                                             |
| SHR-02 | `GET /people` empty q → `[]`                                                                 |
| SHR-03 | `GET /people?map_id=X` excludes already-invited                                              |
| SHR-04 | `POST /maps/{id}/share/invite` owner → 201                                                   |
| SHR-05 | `POST .../invite` with `role=owner` → 400                                                    |
| SHR-06 | `POST .../invite` editor (editorsCanShare=false) → 403                                       |
| SHR-07 | `POST .../invite` creates pending row + `invite_token`                                       |
| SHR-08 | `POST .../invite` to already-invited email → updates role                                    |
| SHR-09 | `POST .../invite` `notify=true` fires mail (mock)                                            |
| SHR-10 | `POST .../invite` `notify=false` no mail                                                     |
| SHR-11 | `PATCH .../share/{entry_id}` viewer → 403                                                    |
| SHR-12 | `PATCH .../share/{entry_id}` changing owner role → 400                                       |
| SHR-13 | `PATCH .../share/{entry_id}` editor promoting editor when actor non-owner → 403              |
| SHR-14 | `DELETE .../share/{entry_id}` owner entry → 400                                              |
| SHR-15 | `DELETE .../share/{entry_id}` removes row                                                    |
| SHR-16 | `POST .../share/transfer` non-owner → 403                                                    |
| SHR-17 | `POST .../share/transfer` to pending invitee → 400                                           |
| SHR-18 | `POST .../share/transfer` success: old owner → editor, new owner → owner, `owner_id` updated |
| SHR-19 | `PUT .../share/general` `type=link` generates `share_token`                                  |
| SHR-20 | `PUT .../share/general` `type=restricted` disables link, keeps token                         |
| SHR-21 | `PUT .../share/settings` partial update                                                      |
| SHR-22 | `GET /maps/invite/accept?token=...` correct email → 200                                      |
| SHR-23 | `GET /maps/invite/accept?token=...` wrong email → 403                                        |
| SHR-24 | `GET /maps/invite/accept?token=...` unknown token → 404                                      |
| SHR-25 | `GET /maps/invite/accept?token=...` already consumed → 404                                   |
| SHR-26 | `GET /maps/{id}/share` anonymous + `share_link_enabled` → 200 (viewer view)                  |
| SHR-27 | **NEW**: Email template renders (Jinja2) — snapshot test                                     |
| SHR-28 | **NEW**: `send_invite_email` SMTP failure → logged, request still succeeds                   |
| SHR-29 | **NEW**: Token entropy ≥ 256 bits                                                            |
| SHR-30 | **NEW**: Rate limit `POST .../invite` (e.g. 10/min per map)                                  |

### 3.4 `ConnectionManager` — **L2** (already covered — extend)

| ID     | Case                                                               |
| ------ | ------------------------------------------------------------------ |
| COL-01 | Connect emits empty snapshot, no self-join (existing)              |
| COL-02 | Second user receives join (existing)                               |
| COL-03 | Presence relay excludes sender (existing)                          |
| COL-04 | Disconnect notifies peers (existing)                               |
| COL-05 | Last user disconnect removes room (existing)                       |
| COL-06 | Malformed JSON ignored (existing)                                  |
| COL-07 | Unknown user msg ignored (existing)                                |
| COL-08 | Broken socket evicted during broadcast (existing)                  |
| COL-09 | **NEW**: Concurrent connects (N users) → each sees N-1 in snapshot |
| COL-10 | **NEW**: Heartbeat / liveness — manager evicts idle sockets        |
| COL-11 | **NEW**: Room namespacing — different projects isolated            |
| COL-12 | **NEW**: Reconnect same user → room state preserved                |
| COL-13 | **NEW**: Message size cap (e.g. 64 KB)                             |
| COL-14 | **NEW**: Presence payload validation (bad shape dropped)           |

---

## 4. `app.api.projects` — **L3**

| ID     | Case                                                                 |
| ------ | -------------------------------------------------------------------- |
| PRJ-01 | `GET /projects` anonymous → only public projects                     |
| PRJ-02 | `GET /projects` owner → all private                                  |
| PRJ-03 | `POST /projects` auth → 201                                          |
| PRJ-04 | `POST /projects` anonymous → 401/403                                 |
| PRJ-05 | `GET /projects/{id}` unknown → 404                                   |
| PRJ-06 | `GET /projects/{id}` no perm → 403                                   |
| PRJ-07 | `PUT /projects/{id}` editor → 200, viewer → 403                      |
| PRJ-08 | `DELETE /projects/{id}` owner only                                   |
| PRJ-09 | `DELETE /projects/{id}` cascades all child maps                      |
| PRJ-10 | `POST /projects/{id}/maps` viewer → 403                              |
| PRJ-11 | `POST /projects/{id}/maps` editor/owner → 201, map linked to project |
| PRJ-12 | `POST /projects/{id}/maps` with `group_access` persists              |
| PRJ-13 | **NEW**: `POST /projects/{id}/maps` unknown project → 404            |
| PRJ-14 | **NEW**: `PUT /projects/{id}` `title` empty → 422                    |
| PRJ-15 | **NEW**: Pagination — `limit`/`offset` on list                       |

---

## 5. `app.api.data` — **L3 (catalogue) + L4 (PostGIS ingest/MVT)**

### 5.1 Layer catalogue (in-memory stub) — **L1/L3**

| ID     | Case                                                       |
| ------ | ---------------------------------------------------------- |
| DAT-01 | `GET /data/vector` returns ≥ 3 layers                      |
| DAT-02 | `GET /data/vector/{id}` valid → FeatureCollection          |
| DAT-03 | `GET /data/vector/{id}` unknown → 404                      |
| DAT-04 | `GET /data/raster` returns ≥ 3 layers                      |
| DAT-05 | `GET /data/raster/{id}` valid → RasterLayerMeta + tile_url |
| DAT-06 | `GET /data/raster/{id}` unknown → 404                      |

### 5.2 Dataset catalogue — **L3**

| ID     | Case                                          |
| ------ | --------------------------------------------- |
| DTD-01 | `GET /datasets` empty → `{items:[], total:0}` |
| DTD-02 | `GET /datasets?type=vector` filters           |
| DTD-03 | `GET /datasets?search=foo` partial match      |
| DTD-04 | `GET /datasets?limit=1&offset=1` pagination   |
| DTD-05 | `DELETE /datasets/{id}` unknown → 404         |

### 5.3 Ingest — **L4 (PostGIS)**

| ID     | Case                                                              |
| ------ | ----------------------------------------------------------------- |
| DTI-01 | Upload valid Point GeoJSON → 201, feature stored                  |
| DTI-02 | Upload mixed-type FeatureCollection → each feature row            |
| DTI-03 | Upload invalid JSON → 422                                         |
| DTI-04 | Upload empty file → 400                                           |
| DTI-05 | Upload > 500 MB → 413 (use mocked `UploadFile`)                   |
| DTI-06 | Upload bad content type (`image/png`) → 415                       |
| DTI-07 | Upload with `text/csv` (allowed prefix) → accepted                |
| DTI-08 | Tags parsing — comma, spaces, empty → default `["uploaded"]`      |
| DTI-09 | **NEW**: Multi-CRS dataset (EPSG:3857) → correctly stored in 4326 |
| DTI-10 | **NEW**: `attributes` extracted from first feature's properties   |
| DTI-11 | **NEW**: Concurrency — two uploads, no id collision               |
| DTI-12 | **NEW**: Dataset deletion removes all features (FK cascade)       |

### 5.4 MVT tiles — **L4 (PostGIS)**

| ID     | Case                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| MVT-01 | `/tiles/{id}/0/0/0.mvt` returns bytes + `application/vnd.mapbox-vector-tile` |
| MVT-02 | Tile with no features → empty/valid MVT                                      |
| MVT-03 | Tile intersects a feature → MVT contains layer                               |
| MVT-04 | Unknown dataset → 404                                                        |
| MVT-05 | Headers: `Cache-Control` + `Access-Control-Allow-Origin` present             |
| MVT-06 | **NEW**: `z=18` zoom-out on global feature still returned                    |
| MVT-07 | **NEW**: Tile envelope at `z=0,x=0,y=0` covers world                         |
| MVT-08 | **NEW**: 1000-point dataset → response < 5 MB                                |

---

## 6. `app.api.storage` — **L2 (mock boto3) + L4 (RustFS)**

| ID     | Case                                                               |
| ------ | ------------------------------------------------------------------ |
| STG-01 | `POST /upload` 201, `key` matches `<uuid>/<filename>`              |
| STG-02 | `POST /upload` with `filename=None` → key ends `/upload`           |
| STG-03 | `POST /upload` content-type inferred from extension                |
| STG-04 | `POST /upload` ClientError → 502                                   |
| STG-05 | `GET /download/{key}` 307 → valid presigned URL                    |
| STG-06 | `GET /download/{key}` `expires_in=60`                              |
| STG-07 | `GET /download/{key}` `expires_in=10` → 422 (below `ge=60`)        |
| STG-08 | `GET /download/{key}` `expires_in=999999` → 422 (above `le=86400`) |
| STG-09 | `GET /download/{key}` NoSuchKey → 404                              |
| STG-10 | `DELETE /{key}` idempotent → 200                                   |
| STG-11 | `GET /list` returns `{bucket, prefix, objects, count}`             |
| STG-12 | `GET /list?prefix=user/` filtered                                  |
| STG-13 | `GET /list?presign=true` includes URLs                             |
| STG-14 | **NEW**: Path traversal attempt `../` rejected or sanitised        |
| STG-15 | **NEW**: Large file (e.g. 50 MB) upload → succeeds                 |
| STG-16 | **NEW**: Concurrent upload → distinct keys                         |
| STG-17 | **L4**: real RustFS round-trip                                     |

---

## 7. `app.api.viz` — **L1**

| ID     | Case                                                                           |
| ------ | ------------------------------------------------------------------------------ |
| VIZ-01 | `GET /viz/basemaps` returns ≥ 3 entries with `id`, `name`, `style_url`         |
| VIZ-02 | `GET /viz/config` returns `default_basemap` in list                            |
| VIZ-03 | **NEW**: Schema validation — no `preview_url` field on some entries (optional) |
| VIZ-04 | **NEW**: Stability test — IDs do not change across restarts                    |

---

## 8. `app.api.modules` — **L1 (file I/O mocked)**

| ID     | Case                                                                    |
| ------ | ----------------------------------------------------------------------- |
| MOD-01 | `GET /modules` with empty lock → `[]`                                   |
| MOD-02 | `GET /modules` with lock file → correct list                            |
| MOD-03 | `GET /modules` with `module.yaml` missing → defaults                    |
| MOD-04 | `GET /modules` with malformed `module.yaml` → logged warning, defaults  |
| MOD-05 | `GET /modules/registry` returns all registry entries                    |
| MOD-06 | `GET /modules/{name}` installed → 200                                   |
| MOD-07 | `GET /modules/{name}` not installed → 404                               |
| MOD-08 | **NEW**: `_build_module_info` caps parsing — `capabilities` extras list |
| MOD-09 | **NEW**: Registry read with missing file → `{}`                         |
| MOD-10 | **NEW**: Path traversal in `module.yaml` path rejected                  |

---

## 9. `app.module_loader` + `app.main` — **L2**

| ID     | Case                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| LDR-01 | `load_modules` no lock file → no modules mounted                                       |
| LDR-02 | `load_modules` with stub module (backend router) → routes registered                   |
| LDR-03 | `load_modules` module import error → logged, others still load                         |
| LDR-04 | `load_modules` module provides `frontend` manifest → codegen hook invoked              |
| LDR-05 | **NEW**: Lifespan: `ensure_bucket` failure → app still starts (logged)                 |
| LDR-06 | **NEW**: Lifespan: DB migration check → fails closed in CI                             |
| LDR-07 | **NEW**: `/api/health` returns `{status: "ok", version, modules: [...]}`               |
| LDR-08 | **NEW**: CORS preflight from whitelisted origin → 200                                  |
| LDR-09 | **NEW**: CORS preflight from non-whitelisted origin → no `Access-Control-Allow-Origin` |

---

## 10. Migrations (Alembic) — **L4**

| ID     | Case                                                         |
| ------ | ------------------------------------------------------------ |
| MIG-01 | `alembic upgrade head` on fresh DB → succeeds                |
| MIG-02 | `alembic downgrade -1` then `upgrade head` → idempotent      |
| MIG-03 | `alembic check` on production DB → no new operations pending |
| MIG-04 | **NEW**: Each migration has a `downgrade()`                  |
| MIG-05 | **NEW**: Migrations are reversible (verified on staging)     |

---

## 11. Frontend (`frontend/packages/*`)

Use **Vitest + Testing Library** (already wired in `packages/map`).

### 11.1 `packages/map/src/utils/formats.ts` — **L1** (already present)

Add: `formatLatLng`, `formatZoom`, `formatBasemapId` — table-driven over valid/invalid inputs.

### 11.2 `packages/ui` — **L1 / L2**

| ID    | Case                                                           |
| ----- | -------------------------------------------------------------- |
| UI-01 | Button `disabled` + `loading` renders spinner, blocks click    |
| UI-02 | Modal focus-trap: Tab cycles inside modal                      |
| UI-03 | Modal Escape closes                                            |
| UI-04 | Toast auto-dismiss on timeout                                  |
| UI-05 | **NEW**: A11y — all interactive elements have accessible names |
| UI-06 | **NEW**: Dark/light theme tokens swap correctly                |

### 11.3 `packages/accessibility` — **L1**

| ID      | Case                                                 |
| ------- | ---------------------------------------------------- |
| A11Y-01 | `useSkipLink` renders visible on Tab press           |
| A11Y-02 | `useReducedMotion` respects `prefers-reduced-motion` |
| A11Y-03 | **NEW**: `ContrastChecker` flags below-AA pairs      |

### 11.4 `apps/web` — **E2E (Playwright)**

| ID     | Case                                                     |
| ------ | -------------------------------------------------------- |
| E2E-01 | Login flow: register → login → sees dashboard            |
| E2E-02 | Map create → rename → share to group → second user sees  |
| E2E-03 | Upload GeoJSON → appears in dataset list → tile loads    |
| E2E-04 | Invite by email → accept via token link → role reflected |
| E2E-05 | Transfer ownership → old owner demoted                   |
| E2E-06 | Logout → protected routes redirect to login              |
| E2E-07 | **NEW**: 404 route shows friendly page                   |
| E2E-08 | **NEW**: Keyboard-only flow for share dialog             |

---

## 12. Security & Abuse (cross-cutting)

| ID      | Case                                                      | Tool                   |
| ------- | --------------------------------------------------------- | ---------------------- |
| SEC-G01 | Auth endpoints rate-limited                               | `locust` / `artillery` |
| SEC-G02 | JWT `alg=none` rejected                                   | `test_security`        |
| SEC-G03 | SQL-injection in `?search=`                               | `sqlmap` smoke         |
| SEC-G04 | Path traversal `/storage/../../etc/passwd`                | manual + test          |
| SEC-G05 | CORS bypass                                               | `curl` matrix          |
| SEC-G06 | Session fixation (no cookies used — verify)               | manual                 |
| SEC-G07 | XSS in `title` / `description` (HTML escaped)             | jsdom render           |
| SEC-G08 | **NEW**: Header `X-Content-Type-Options: nosniff` present | integration            |
| SEC-G09 | **NEW**: `Cache-Control: no-store` on `/me`               | integration            |
| SEC-G10 | **NEW**: Audit log emitted on role change                 | L3 (mock logger)       |

---

## 13. Performance / Load (L4, nightly)

| ID      | Case                                      | Target       |
| ------- | ----------------------------------------- | ------------ |
| PERF-01 | `GET /datasets` 1000 rows                 | p95 < 200 ms |
| PERF-02 | MVT tile `z=12` (heavy feature set)       | p95 < 150 ms |
| PERF-03 | 100 concurrent WS connections per project | no drops     |
| PERF-04 | 50 MB upload                              | p95 < 8 s    |
| PERF-05 | Auth `/token` p99                         | < 100 ms     |

---

## 14. CI / Release Gates

```
PR     : L1 + L3 (unit + api) + lint + type-check + coverage ≥ 80%
Nightly: L4 (integration with docker compose) + E2E (Playwright)
Release: PERF suite + MIG-03 (alembic check) + security smoke
```

---

## 15. Test-Maintenance Checklist

- Every new router must ship with **≥ 1 happy path + ≥ 3 error paths**.
- Every new service function must have **≥ 1 unit test with fakes**.
- Permission-related changes update the **permission matrix table** in §3.1.
- Any new Pydantic schema → add a **serialisation-guard test** (no secrets leak).
- Migration changes → add a **MIG-xx** case and update the checklist in §10.

---

## 16. Suggested File Layout

```
backend/tests/
├── __init__.py
├── conftest.py
├── data/                       # fixture geojson + json
├── fakes/
│   ├── __init__.py
│   ├── s3.py
│   ├── smtp.py
│   └── websocket.py
├── unit/                       # L1
│   ├── test_security.py
│   ├── test_config.py
│   ├── test_maps_permission.py
│   ├── test_schemas_auth.py
│   ├── test_schemas_maps.py
│   └── test_modules_loader.py
├── api/                        # L3 (ASGI + SQLite)
│   ├── test_auth_api.py
│   ├── test_maps_api.py
│   ├── test_maps_share_api.py
│   ├── test_projects_api.py
│   ├── test_data_catalogue_api.py
│   ├── test_storage_api.py     # (fake S3)
│   ├── test_viz_api.py
│   ├── test_modules_api.py
│   └── test_collab_manager.py
└── integration/                # L4 (docker, marker = integration)
    ├── test_data_postgis.py
    ├── test_mvt_tiles.py
    ├── test_storage_rustfs.py
    ├── test_smtp_invite.py
    ├── test_migrations.py
    └── test_e2e_smoke.py
```

---

---

## 17. Module Lifecycle (CLI / `setup_cli`) — **L1 + L2**

> Tests the full module lifecycle: install → wire → sync → remove.
> All tests use a **temp directory** as `ROOT` (monkeypatch `setup_cli.registry.ROOT`).

### 17.1 `setup_cli.registry` — **L1**

| ID     | Case                                                           |
| ------ | -------------------------------------------------------------- |
| REG-01 | `load_registry()` with valid YAML → list of module dicts       |
| REG-02 | `load_registry()` with empty file → `[]`                       |
| REG-03 | `load_registry()` with malformed YAML → raises / `[]`          |
| REG-04 | `load_lock()` no lock file → `{"selected": []}`                |
| REG-05 | `load_lock()` valid lock → parsed dict                         |
| REG-06 | `save_lock()` round-trip: save → load → equality               |
| REG-07 | `load_module_meta()` valid → parsed dict                       |
| REG-08 | `load_module_meta()` missing file → raises (FileNotFoundError) |

### 17.2 `setup_cli.installer` — **L2 (subprocess mocked)**

| ID      | Case                                                                  |
| ------- | --------------------------------------------------------------------- |
| INST-01 | `clone_module()` fresh clone → dest dir exists                        |
| INST-02 | `clone_module()` already exists → `git pull` called                   |
| INST-03 | `clone_module()` with `ref` → checkout called                         |
| INST-04 | `clone_module()` `file://` repo → path cleaned correctly              |
| INST-05 | `resolve_dependencies()` simple chain A→B→C → ordered [C, B, A]       |
| INST-06 | `resolve_dependencies()` circular A→B→A → `RuntimeError`              |
| INST-07 | `resolve_dependencies()` missing dep not in selected → `RuntimeError` |
| INST-08 | `resolve_dependencies()` diamond (A→B, A→C, B→D, C→D) → D once        |
| INST-09 | `install_selected()` clones all + writes lock with correct order      |
| INST-10 | `remove_module()` removes from lock + deletes directory               |
| INST-11 | `remove_module()` directory root-owned → docker fallback invoked      |
| INST-12 | `remove_module()` docker fallback fails → `shutil.rmtree` with chmod  |

### 17.3 `setup_cli.workspace` — **L2 (file I/O)**

| ID    | Case                                                                         |
| ----- | ---------------------------------------------------------------------------- |
| WS-01 | `update_backend_workspace()` no modules → only core path in alembic          |
| WS-02 | `update_backend_workspace()` 2 modules → both paths in `version_locations`   |
| WS-03 | `update_backend_workspace()` idempotent (run twice → no duplicates)          |
| WS-04 | `update_backend_workspace()` template missing `version_locations` → inserted |
| WS-05 | `update_frontend_workspace()` strips `@modules/*` from deps                  |
| WS-06 | `update_frontend_workspace()` writes `modules.paths.json` correctly          |
| WS-07 | `update_frontend_workspace()` writes `tsconfig.paths.json` with wildcards    |
| WS-08 | `update_frontend_workspace()` module without `frontend` → skipped            |
| WS-09 | `update_frontend_workspace()` custom `entry` path → correct rel path         |

### 17.4 `setup_cli.codegen` — **L1 (file I/O)**

| ID    | Case                                                            |
| ----- | --------------------------------------------------------------- |
| CG-01 | `generate_frontend_routes()` no frontend modules → empty object |
| CG-02 | `generate_frontend_routes()` 2 modules → valid TS with imports  |
| CG-03 | Output contains `ModuleBundle` interface (shape contract)       |
| CG-04 | Output file is syntactically valid TypeScript (parse check)     |
| CG-05 | Old `modules.generated.ts` tombstone written if it exists       |
| CG-06 | **NEW**: Generated file passes ESLint (no unused vars, etc.)    |

### 17.5 `setup_cli.compose` — **L2 (file I/O)**

| ID     | Case                                                                |
| ------ | ------------------------------------------------------------------- |
| CMP-01 | `generate_compose()` no infra modules → base unchanged              |
| CMP-02 | `generate_compose()` 1 module → service prefixed `mod_svc`          |
| CMP-03 | Volumes merged from module fragment                                 |
| CMP-04 | `extra_env` injected into backend service                           |
| CMP-05 | Compose fragment missing file → skipped, no crash                   |
| CMP-06 | **NEW**: Output is valid YAML (parse back successfully)             |
| CMP-07 | **NEW**: Service name collision (2 modules same svc) → both present |

### 17.6 `setup_cli.cli` — **L2 (subprocess + file I/O mocked)**

| ID     | Case                                                               |
| ------ | ------------------------------------------------------------------ |
| CLI-01 | `add "name"` → clone, resolve deps, rewire, pnpm install attempted |
| CLI-02 | `remove "name"` → lock updated, rewire, dir removed                |
| CLI-03 | `list` → prints installed + not-installed markers                  |
| CLI-04 | `sync` → rewire without clone (idempotent)                         |
| CLI-05 | `update "name"` → re-clone + rewire                                |
| CLI-06 | `init` with empty selection → no-op lock, rewire runs              |

---

## 18. Module Runtime Integration — **L2/L3**

> Verifies that a real (stub) module's backend router is correctly mounted and functional
> when loaded via `module_loader.load_modules()`.

| ID     | Case                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| MRT-01 | Stub module with `/api/hello` endpoint → reachable after `load_modules`                |
| MRT-02 | Module router at non-default prefix (e.g. `/custom`) → correct URL                     |
| MRT-03 | Module provides ORM models → `Base.metadata` includes module tables                    |
| MRT-04 | Two modules with overlapping route prefix → no crash, last wins (or error)             |
| MRT-05 | Module with `backend.models_attr` that imports a broken module → logged, app continues |
| MRT-06 | Module with `router_attr` pointing to non-existent attribute → skipped                 |
| MRT-07 | **NEW**: Module health check — `GET /api/{mod}/health` responds                        |
| MRT-08 | **NEW**: Module version mismatch (lock `ref` ≠ `module.yaml` version) → warning logged |
| MRT-09 | **NEW**: Hot-swap simulation — unload + reload module (no memory leak)                 |
| MRT-10 | **NEW**: Module with circular import → clean error, app unaffected                     |

---

## 19. Frontend Module Registry — **L1 (vitest)**

> Tests the generated `module-registry.generated.ts` and the runtime gating logic in `App.tsx`.

| ID     | Case                                                                                    |
| ------ | --------------------------------------------------------------------------------------- |
| FMR-01 | `moduleRegistry` keys match `modules.lock.yaml` selected names                          |
| FMR-02 | Each lazy import resolves to a module with `Page`, `routePath`, `navItem`               |
| FMR-03 | Empty registry → `moduleRegistry = {}` (no dangling imports)                            |
| FMR-04 | **NEW**: Runtime gate — `/api/modules` says module disabled → route NOT mounted         |
| FMR-05 | **NEW**: Runtime gate — module in registry but NOT in lock → NOT mounted                |
| FMR-06 | **NEW**: Nav bar shows only enabled modules' `navItem` entries                          |
| FMR-07 | **NEW**: Module `Page` component renders without crashing (smoke)                       |
| FMR-08 | **NEW**: Module lazy-load failure (import throws) → error boundary shown, app continues |
| FMR-09 | **NEW**: TypeScript — `ModuleBundle` interface enforced by type-check                   |

---

## 20. Module Suggested File Layout (additions)

```
setup/tests/                        # NEW: setup_cli test suite
├── __init__.py
├── conftest.py                     # fixtures: temp_root, stub_module, mock_subprocess
├── test_registry.py                # REG-01..08
├── test_installer.py               # INST-01..12
├── test_workspace.py               # WS-01..09
├── test_codegen.py                 # CG-01..06
├── test_compose.py                 # CMP-01..07
├── test_cli.py                     # CLI-01..06
└── fixtures/
    ├── stub_module/                # minimal module for integration
    │   ├── module.yaml
    │   ├── backend/
    │   │   ├── __init__.py
    │   │   ├── router.py
    │   │   └── models.py
    │   ├── frontend/
    │   │   └── src/index.ts
    │   └── infra/
    │       └── compose.yaml
    ├── circular_module/            # A depends on B, B depends on A
    └── broken_module/              # router imports non-existent

backend/tests/
├── ...
├── test_modules_api.py             # MOD-01..10 (already listed in §8)
├── test_module_loader.py           # LDR-01..09, MRT-01..10
└── fixtures/
    └── stub_module/                # shared stub for loader tests

frontend/apps/web/src/
├── module-registry.generated.ts    # tested via vitest
└── __tests__/
    ├── module-registry.test.ts     # FMR-01..03
    └── module-gating.test.tsx      # FMR-04..08 (render App, mock /api/modules)
```

---

## 21. Future Roadmap & Strategic Plan

### Phase 1: Immediate (Sprint 1–2)

| Priority | Item                                                       | Effort | Impact                                     |
| -------- | ---------------------------------------------------------- | ------ | ------------------------------------------ |
| P0       | Implement §0 infra hardening (markers, fixtures, coverage) | 2d     | Enables all downstream tests               |
| P0       | Module registry API tests (MOD-01..10)                     | 1d     | Protects `/api/modules` contract           |
| P0       | `setup_cli` unit tests (REG, INST, WS, CG, CMP)            | 2d     | Prevents breakage during module add/remove |
| P1       | `module_loader` integration with stub module (LDR, MRT)    | 2d     | Validates the full mount pipeline          |
| P1       | Frontend module-registry vitest (FMR-01..03)               | 1d     | Catches codegen regressions                |
| P1       | Coverage gate in CI (≥ 80% per module)                     | 1d     | Quality bar enforcement                    |

### Phase 2: Near-term (Sprint 3–4)

| Priority | Item                                                        | Effort | Impact                     |
| -------- | ----------------------------------------------------------- | ------ | -------------------------- |
| P1       | Full L3 API tests for maps, projects, share (MPB, PRJ, SHR) | 5d     | End-to-end API confidence  |
| P1       | L4 PostGIS integration (DTI, MVT) in docker CI              | 3d     | Validates spatial pipeline |
| P2       | Playwright E2E suite (E2E-01..08)                           | 4d     | User-flow confidence       |
| P2       | Frontend module gating tests (FMR-04..08)                   | 2d     | Runtime correctness        |
| P2       | Performance baselines (PERF-01..05) in nightly CI           | 2d     | Regression detection       |

### Phase 3: Medium-term (Sprint 5–8)

| Priority | Item                                                       | Effort | Impact                     |
| -------- | ---------------------------------------------------------- | ------ | -------------------------- |
| P2       | Contract testing: module API OpenAPI spec validation       | 3d     | Inter-module API stability |
| P2       | Mutation testing (mutmut / cosmic-ray) on core + modules   | 2d     | Test-quality metric        |
| P2       | Chaos engineering: kill DB/Redis/S3 mid-request            | 3d     | Resilience verification    |
| P3       | Module sandboxing: resource limits (CPU, memory) in Docker | 5d     | Prevents module runaway    |
| P3       | Module API versioning + deprecation policy                 | 3d     | Backward compat guarantee  |
| P3       | Visual regression (Percy / Chromatic) for frontend         | 2d     | UI stability               |

### Phase 4: Long-term (Q2–Q3)

| Priority | Item                                                        | Effort | Impact                |
| -------- | ----------------------------------------------------------- | ------ | --------------------- |
| P3       | Multi-tenancy test matrix (isolated vs. shared schema)      | 10d    | SaaS readiness        |
| P3       | Automated module onboarding: CI validates any new PR module | 5d     | Developer experience  |
| P3       | OpenTelemetry tracing across module boundaries              | 5d     | Observability         |
| P3       | Load shedding & graceful degradation under module failure   | 5d     | Production resilience |
| P3       | API gateway rate-limiting per-module (token bucket)         | 3d     | Fair-use enforcement  |
| P3       | Automated security scanning (SAST + DAST) in release gate   | 3d     | Security compliance   |

### Testing Strategy Evolution

```
Current State          →  Phase 1             →  Phase 2             →  Phase 3+
─────────────────────────────────────────────────────────────────────────────────────
~30% coverage          →  80% coverage gate   →  90% + mutation      →  95% + chaos
Manual module testing  →  CLI unit tests      →  E2E Playwright      →  Contract tests
No CI test stages      →  PR: L1+L3           →  Nightly: L4+E2E     →  Canary: PERF
Single module (core)   →  Stub module tests   →  Real 3 modules      →  10+ modules
No frontend tests      →  vitest map pkg      →  Full TRL + E2E      →  Visual reg.
```

### Key Metrics & KPIs

| Metric                  | Target (Phase 1) | Target (Phase 2) | Target (Phase 3+) |
| ----------------------- | ---------------- | ---------------- | ----------------- |
| Line coverage (core)    | ≥ 80%            | ≥ 85%            | ≥ 90%             |
| Line coverage (modules) | ≥ 75%            | ≥ 85%            | ≥ 90%             |
| API test pass rate (CI) | 100%             | 100%             | 100%              |
| Mean test duration      | < 15s            | < 20s            | < 30s             |
| Flaky test rate         | < 1%             | < 0.5%           | < 0.1%            |
| Module onboarding time  | < 1 day          | < 4 hours        | < 2 hours         |
| P95 API response time   | < 200ms          | < 150ms          | < 100ms           |
| MTTR (test failure)     | < 30min          | < 15min          | < 5min            |

### Risk Register

| Risk                                          | Likelihood | Impact | Mitigation                                   |
| --------------------------------------------- | ---------- | ------ | -------------------------------------------- |
| Module import order causes side effects       | Medium     | High   | LDR-03/05 tests + deterministic load order   |
| `setup_cli` rewrites tracked files            | High       | Medium | All CLI tests in temp dir; CI lint check     |
| PostGIS/SQLite schema divergence              | Medium     | High   | L4 tests run nightly; migration parity check |
| Frontend codegen drift (stale `generated.ts`) | Medium     | Medium | CI step: regenerate + diff (fail on drift)   |
| Module circular dependency in prod            | Low        | High   | INST-06 test + registry lint rule            |
| Docker unavailable in CI                      | Low        | Medium | Skip L4 gracefully; flag in report           |

---

_Document owner: Backend + Frontend. Review each sprint. Coverage targets tracked in CI._
