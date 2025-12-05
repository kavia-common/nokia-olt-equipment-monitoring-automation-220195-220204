# backend_node – Nokia 7360 OLT Backend

Minimal, production-ready Express backend that connects to a Nokia 7360 OLT over **Telnet (port 23, default)** or **SSH** and exposes REST endpoints to:

- Test OLT connectivity (`POST /connect`)
- Fetch ONT optics and RX dBm (`GET /optics?ont=1/1/3/2/1`)
- Report service health (`GET /health`)

This backend is designed to be consumed by the existing React frontend in this project.

---

## 1. Prerequisites

- Node.js **18+**
- Access to the Nokia 7360 OLT at `202.39.123.124` (or another reachable IP/hostname)
- Valid OLT CLI credentials (username and password) for Telnet or SSH
- Network access to:
  - **Telnet port** (`OLT_TELNET_PORT`, default `23`), when using `PROTOCOL=telnet`
  - **SSH port** (`OLT_SSH_PORT`, default `22`), when using `PROTOCOL=ssh`

> The backend now defaults to Telnet. SSH remains available for environments that require it.

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

# Protocol and ports
PROTOCOL=telnet           # or "ssh"
OLT_TELNET_PORT=23
OLT_SSH_PORT=22

OLT_USERNAME=your-olt-username
OLT_PASSWORD=your-olt-password

API_AUTH_TOKEN=your-long-random-token

# Telnet prompts (tune if your OLT uses different text)
TELNET_USERNAME_PROMPT=login:
TELNET_PASSWORD_PROMPT=Password:
TELNET_SHELL_PROMPT=#
TELNET_LOGIN_TIMEOUT_MS=8000
TELNET_COMMAND_TIMEOUT_MS=10000

LOG_LEVEL=info
REQUEST_LOGGING=true
ALLOW_REQUEST_CREDENTIALS=false
```

> Notes:
> - `PROTOCOL` controls how the backend connects to the OLT:
>   - `telnet` (default) – uses port `OLT_TELNET_PORT` and Telnet prompts/timeouts.
>   - `ssh` – uses port `OLT_SSH_PORT` and the SSH client.
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
  "port": 23
}
```

If fields are omitted, the backend falls back to:

1. Most recently cached credentials (from a previous successful `/connect`), then  
2. Environment variables (`OLT_HOST_DEFAULT`, `OLT_USERNAME`, `OLT_PASSWORD` and the protocol-specific port).

On success, the credentials are cached in memory for use by `/optics`.

Example (Telnet, default):

```bash
curl -X POST "http://localhost:4000/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "host": "202.39.123.124",
    "username": "olt-user",
    "password": "olt-password",
    "port": 23
  }'
```

Example (forcing SSH via environment):

```bash
# In .env:
# PROTOCOL=ssh
# OLT_SSH_PORT=22
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

On connection/login failures, the backend responds with an error status (typically `502`) and a JSON error body; the exact message depends on the underlying Telnet/SSH error.

---

### 5.3 Get ONT Optics (RX dBm)

- **Endpoint:** `GET /optics?ont=<ONT_PATH>`
- **Auth:** Bearer token (if `API_AUTH_TOKEN` is set)
- **Query parameter:**
  - `ont` – ONT path, format: `shelf/slot/pon/ont/x` (e.g. `1/1/3/2/1`)

The backend executes (over the configured protocol):

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

> Security note: the backend does not log the full `raw` CLI output in non-debug logs to avoid leaking potentially sensitive device information.

---

## 6. Telnet-Specific Notes

When using `PROTOCOL=telnet` (default):

- The backend uses the [`telnet-client`](https://www.npmjs.com/package/telnet-client) library.
- It detects login and password prompts using the configured environment variables:
  - `TELNET_USERNAME_PROMPT` (default: `login:`)
  - `TELNET_PASSWORD_PROMPT` (default: `Password:`)
  - `TELNET_SHELL_PROMPT` (default: `#`)
- Timeouts can be tuned via:
  - `TELNET_LOGIN_TIMEOUT_MS` – maximum time to wait for initial login to complete.
  - `TELNET_COMMAND_TIMEOUT_MS` – maximum time to wait for the optics command to finish.

If your Nokia 7360 OLT CLI uses different prompt text, update these values in `.env` accordingly.

---

## 7. Frontend Integration

The React frontend reads the backend base URL from:

- `REACT_APP_API_BASE` (preferred), or
- `REACT_APP_BACKEND_URL` (fallback)

A typical `.env` in `frontend_react` might contain:

```ini
REACT_APP_API_BASE=http://localhost:4000
```

You will also need to teach the frontend to send the `Authorization: Bearer <API_AUTH_TOKEN>` header for protected endpoints, or leave `API_AUTH_TOKEN` unset for local, unauthenticated development.

---

## 8. OpenAPI Document

The backend exposes a simple OpenAPI document:

- `GET /openapi.json`

You can inspect this to see the endpoints, parameters, and responses in a machine-readable format.

---

## 9. Security Notes

- **Never** commit real OLT credentials or API tokens to source control.
- Ensure `API_AUTH_TOKEN` is set in any shared or production-like environment.
- The in-memory credential cache is intended only for a single-user dev scenario. For multi-user or production use, replace it with a proper credential/session management solution.
- Passwords and raw Telnet/SSH command outputs are deliberately not logged at info level; enable debug logging only in controlled environments if deeper diagnostics are required.
