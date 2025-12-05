import React, { createContext, useContext, useMemo } from 'react';

/**
 * ApiClient provides a fetch wrapper and stubbed endpoints for environments without a backend.
 * It reads base URL from REACT_APP_API_BASE (preferred) or REACT_APP_BACKEND_URL (fallback).
 * When either is set (non-empty), stub mode is disabled and real network calls are used.
 * Never log credentials or sensitive headers.
 */

function getBaseUrl() {
  const envBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '';
  const trimmed = (envBase || '').trim();
  return trimmed;
}

function isStubMode() {
  const base = getBaseUrl();
  return !base; // no backend means stub
}

function redacted(obj) {
  // Avoid logging secrets; return a shallow copy hiding password fields.
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  if ('password' in copy) copy.password = '***';
  return copy;
}

/** Extracts a pseudo RX-signal from a stubbed raw output for the ONT path. */
function parseRxFromRaw(raw) {
  const m = raw.match(/RX:\s*(-?\d+(\.\d+)?)\s*dBm/i);
  return m ? parseFloat(m[1]) : null;
}

/** Create a human-readable raw output for the stub. */
function stubRawOutput(ontPath, rxDbm) {
  const now = new Date().toISOString();
  return [
    `show equipment ont optics ont-id ${ontPath}`,
    `---------------------------------------------`,
    `ONT ${ontPath} optics`,
    `  RX: ${rxDbm.toFixed(1)} dBm`,
    `  TX: -0.5 dBm`,
    `  OPR: -11.2 dBm`,
    `  Timestamp: ${now}`,
    `---------------------------------------------`,
    `OK`
  ].join('\n');
}

export function createApiClient() {
  const baseUrl = getBaseUrl();

  async function safeFetch(path, options = {}) {
    // Never log credentials or commands in plain text; only log metadata in dev.
    const method = (options.method || 'GET').toUpperCase();
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        credentials: 'include',
        ...options
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      return res.json();
    } catch (e) {
      throw e;
    }
  }

  // PUBLIC_INTERFACE
  async function connect({ host, username, password }) {
    /** Connect to OLT. In stub mode, simulate a successful connection. */
    if (isStubMode()) {
      await new Promise(r => setTimeout(r, 600));
      // rudimentary validation in stub
      if (!host || !username || !password) return false;
      return true;
    }
    const payload = { host, username, password };
    // Do not log payload
    const res = await safeFetch('/connect', { method: 'POST', body: JSON.stringify(payload) });
    return !!res?.ok;
  }

  // PUBLIC_INTERFACE
  async function runShowOntOptics({ ontPath }) {
    /**
     * Execute 'show equipment ont optics' for a given ONT path.
     * Returns: { rxDbm: number|null, raw: string, ontPath: string, at: ISOString }
     */
    if (isStubMode()) {
      await new Promise(r => setTimeout(r, 800));
      // Simulate RX level between -28 and -12 dBm
      const rx = Math.round((Math.random() * (16)) - 28); // [-28, -12] approx
      const raw = stubRawOutput(ontPath, rx);
      const rxParsed = parseRxFromRaw(raw);
      return { rxDbm: rxParsed, raw, ontPath, at: new Date().toISOString(), stub: true };
    }
    const res = await safeFetch(`/optics?ont=${encodeURIComponent(ontPath)}`, { method: 'GET' });
    return {
      rxDbm: res?.rxDbm ?? null,
      raw: res?.raw ?? '',
      ontPath,
      at: res?.at || new Date().toISOString(),
      stub: false
    };
  }

  const baseUrlDisplay = baseUrl ? baseUrl : 'stub://local';

  return { connect, runShowOntOptics, baseUrlDisplay };
}

const ApiClientCtx = createContext(null);

// PUBLIC_INTERFACE
export function ApiClientProvider({ children }) {
  /** Provides the API client instance via React Context. */
  const client = useMemo(() => createApiClient(), []);
  return <ApiClientCtx.Provider value={client}>{children}</ApiClientCtx.Provider>;
}

// PUBLIC_INTERFACE
export function useApi() {
  /** Hook returning the API client. */
  const ctx = useContext(ApiClientCtx);
  if (!ctx) {
    throw new Error('useApi must be used within ApiClientProvider');
  }
  return ctx;
}
