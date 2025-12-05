# backend_node – Nokia 7360 OLT Backend

Minimal, production-ready Express backend that connects to a Nokia 7360 OLT over SSH (using [`ssh2`](https://github.com/mscdex/ssh2)) and exposes REST endpoints to:

- Test SSH connectivity (`POST /connect`)
- Fetch ONT optics and RX dBm (`GET /optics?ont=1/1/3/2/1`)
- Report service health (`GET /health`)

This backend is designed to be consumed by the existing React frontend in this project.

---

## 1. Prerequisites

- Node.js **18+**
- Access to the Nokia 7360 OLT at `202.39.123.124` (or another reachable IP/hostname)
- Valid OLT SSH credentials (username and password)

---

## 2. Installation

From the project root:

```bash
cd nokia-olt-equipment-monitoring-automation-220195-220204/backend_node
npm install
```

---

## 3. Configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Then open `.env` and set at least:

```ini
PORT=4000
NODE_ENV=development

OLT_HOST_DEFAULT=202.39.123.124
OLT_SSH_PORT=22
OLT_USERNAME=your-olt-username
OLT_PASSWORD=your-olt-password

API_AUTH_TOKEN=your-long-random-token
LOG_LEVEL=info
REQUEST_LOGGING=true
ALLOW_REQUEST_CREDENTIALS=false
```

> Note:
> - `OLT_USERNAME` / `OLT_PASSWORD` can be omitted if you will always supply credentials in `POST /connect`.
> - If `API_AUTH_TOKEN` is **not** set, the backend will **not** enforce Bearer token auth (intended only for local development).

### CORS

By default the backend allows CORS from the React dev server:

```ini
FRONTEND_ORIGIN=http://localhost:3000
```

If your frontend runs elsewhere, adjust this accordingly.

---

## 4. Running the Backend

From `backend_node`:

```bash
# Development
NODE_ENV=development npm run dev   # or `node src/index.js`

# Production-style
NODE_ENV=production npm start
```

The server will listen on `PORT` (default: `4000`).

---

## 5. API Overview

Base URL (for local dev):

```text
http://localhost:4000
```

### 5.1 Health Check

- **Endpoint:** `GET /health`
- **Description:** Verify that the backend is running.
- **Auth:** Not required

Example:

```bash
curl http://localhost:4000/health
```

Response:

```json
{
  "status": "ok",
  "uptime": 12.3456,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

---

### 5.2 Test OLT Connection

- **Endpoint:** `POST /connect`
- **Auth:** Bearer token (if `API_AUTH_TOKEN` is set)
- **Body (JSON, optional):**

```json
{
  "host": "202.39.123.124",
  "username": "olt-user",
  "password": "olt-password",
  "port": 22
}
```

If fields are omitted, the backend falls back to:

1. Most recently cached credentials (from a previous successful `/connect`), then
2. Environment variables (`OLT_HOST_DEFAULT`, `OLT_USERNAME`, `OLT_PASSWORD`).

On success, the credentials are cached in memory for use by `/optics`.

Example:

```bash
curl -X POST "http://localhost:4000/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "host": "202.39.123.124",
    "username": "olt-user",
    "password": "olt-password",
    "port": 22
  }'
```

Success response:

```json
{ "ok": true }
```

---

### 5.3 Get ONT Optics (RX dBm)

- **Endpoint:** `GET /optics?ont=<ONT_PATH>`
- **Auth:** Bearer token (if `API_AUTH_TOKEN` is set)
- **Query parameter:**

  - `ont` – ONT path, format: `shelf/slot/pon/ont/x` (e.g. `1/1/3/2/1`)

The backend executes:

```text
show equipment ont optics ont-id <ONT_PATH>
```

and attempts to parse the RX value in dBm from the output.

Example:

```bash
curl "http://localhost:4000/optics?ont=1/1/3/2/1" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Example response:

```json
{
  "ontPath": "1/1/3/2/1",
  "rxDbm": -21.5,
  "raw": "raw CLI output from the OLT ...",
  "at": "2025-01-01T12:00:30.000Z",
  "exitCode": 0
}
```

If the RX value cannot be parsed, `rxDbm` will be `null` but `raw` will still contain the CLI output for inspection.

---

## 6. Frontend Integration

The React frontend reads the backend base URL from:

- `REACT_APP_API_BASE` (preferred), or
- `REACT_APP_BACKEND_URL` (fallback)

A typical `.env` in `frontend_react` might contain:

```ini
REACT_APP_API_BASE=http://localhost:4000
```

You will also need to teach the frontend to send the `Authorization: Bearer <API_AUTH_TOKEN>` header for protected endpoints, or leave `API_AUTH_TOKEN` unset for local, unauthenticated development.

---

## 7. OpenAPI Document

The backend exposes a simple OpenAPI document:

- `GET /openapi.json`

You can inspect this to see the endpoints, parameters, and responses in a machine-readable format.

---

## 8. Security Notes

- **Never** commit real OLT credentials or API tokens to source control.
- Ensure `API_AUTH_TOKEN` is set in any shared or production-like environment.
- The in-memory credential cache is intended only for a single-user dev scenario. For multi-user or production use, replace it with a proper credential/session management solution.
