'use strict';

const {
  OLT_HOST_DEFAULT,
  OLT_SSH_PORT,
  OLT_TELNET_PORT,
  OLT_USERNAME,
  OLT_PASSWORD,
  PROTOCOL,
  TELNET_USERNAME_PROMPT,
  TELNET_PASSWORD_PROMPT,
  TELNET_SHELL_PROMPT,
  TELNET_LOGIN_TIMEOUT_MS,
  TELNET_COMMAND_TIMEOUT_MS
} = require('../config/env');
const logger = require('../config/logger');
const { runSshCommand } = require('./sshClient');
const { runTelnetCommand } = require('./telnetClient');

// Simple in-memory cache for most recent successful credentials.
// Suitable for a single-user dev environment; not meant for multi-tenant production.
let cachedConnection = null;

function setCachedConnection({ host, port, username, password }) {
  cachedConnection = {
    host,
    port,
    username,
    password
  };
}

function getActiveProtocol() {
  const proto = (PROTOCOL || 'telnet').toString().toLowerCase();
  return proto === 'ssh' ? 'ssh' : 'telnet';
}

function resolveCredentials({ host, port, username, password } = {}) {
  const activeProtocol = getActiveProtocol();

  const fromOverrides = {
    host,
    port,
    username,
    password
  };
  const fromCache = cachedConnection || {};
  const fromEnv = {
    host: OLT_HOST_DEFAULT,
    port: activeProtocol === 'telnet' ? OLT_TELNET_PORT : OLT_SSH_PORT,
    username: OLT_USERNAME,
    password: OLT_PASSWORD
  };

  const resolvedHost = fromOverrides.host || fromCache.host || fromEnv.host;
  const resolvedPort = fromOverrides.port || fromCache.port || fromEnv.port;
  const resolvedUser = fromOverrides.username || fromCache.username || fromEnv.username;
  const resolvedPass = fromOverrides.password || fromCache.password || fromEnv.password;

  if (!resolvedHost || !resolvedUser || !resolvedPass) {
    const err = new Error(
      'Missing OLT credentials (host, username, password). Provide them in the request or via environment.'
    );
    err.code = 'MISSING_CREDENTIALS';
    err.status = 400;
    throw err;
  }

  return {
    host: resolvedHost,
    port: resolvedPort,
    username: resolvedUser,
    password: resolvedPass
  };
}

function parseRxDbm(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const lines = raw.split(/\r?\n/);

  // Prefer a line containing "RX" and "dBm"
  for (const line of lines) {
    if (/rx/i.test(line) && /dbm/i.test(line)) {
      const match = line.match(/(-?\d+(?:\.\d+)?)\s*dBm/i);
      if (match) {
        const value = Number.parseFloat(match[1]);
        if (!Number.isNaN(value)) return value;
      }
    }
  }

  // Fallback: first dBm-like value anywhere
  const fallback = raw.match(/(-?\d+(?:\.\d+)?)\s*dBm/i);
  if (fallback) {
    const value = Number.parseFloat(fallback[1]);
    if (!Number.isNaN(value)) return value;
  }

  return null;
}

// PUBLIC_INTERFACE
async function testConnection({ host, port, username, password }) {
  /** PUBLIC_INTERFACE Test connectivity to the OLT with given or default credentials using the configured PROTOCOL. */
  const creds = resolveCredentials({ host, port, username, password });
  const protocol = getActiveProtocol();

  // Use a harmless command to verify connectivity.
  const command = 'show version';

  let result;
  if (protocol === 'ssh') {
    result = await runSshCommand({
      ...creds,
      command,
      timeoutMs: 8000
    });
  } else {
    result = await runTelnetCommand({
      ...creds,
      command,
      usernamePrompt: TELNET_USERNAME_PROMPT,
      passwordPrompt: TELNET_PASSWORD_PROMPT,
      shellPrompt: TELNET_SHELL_PROMPT,
      loginTimeoutMs: TELNET_LOGIN_TIMEOUT_MS,
      commandTimeoutMs: TELNET_COMMAND_TIMEOUT_MS
    });
  }

  logger.info(
    {
      protocol,
      host: creds.host,
      port: creds.port,
      username: creds.username
    },
    'OLT connection test successful'
  );

  return {
    ok: true,
    stdout: result.stdout,
    stderr: result.stderr,
    host: creds.host,
    port: creds.port,
    username: creds.username,
    protocol
  };
}

// PUBLIC_INTERFACE
async function getOntOptics({ ontPath, host, port, username, password }) {
  /** PUBLIC_INTERFACE Run 'show equipment ont optics ont-id <ontPath>' and parse the RX dBm value. */
  if (!ontPath || typeof ontPath !== 'string') {
    const err = new Error('ONT path is required (e.g. 1/1/3/2/1)');
    err.code = 'INVALID_ONT';
    err.status = 400;
    throw err;
  }

  const trimmedOnt = ontPath.trim();

  const creds = resolveCredentials({ host, port, username, password });
  const protocol = getActiveProtocol();

  const command = `show equipment ont optics ont-id ${trimmedOnt}`;

  let execResult;
  if (protocol === 'ssh') {
    execResult = await runSshCommand({
      ...creds,
      command,
      timeoutMs: TELNET_COMMAND_TIMEOUT_MS || 10000
    });
  } else {
    execResult = await runTelnetCommand({
      ...creds,
      command,
      usernamePrompt: TELNET_USERNAME_PROMPT,
      passwordPrompt: TELNET_PASSWORD_PROMPT,
      shellPrompt: TELNET_SHELL_PROMPT,
      loginTimeoutMs: TELNET_LOGIN_TIMEOUT_MS,
      commandTimeoutMs: TELNET_COMMAND_TIMEOUT_MS
    });
  }

  const raw = execResult.stdout || execResult.stderr || '';
  const rxDbm = parseRxDbm(raw);
  const at = new Date().toISOString();

  logger.info(
    {
      protocol,
      host: creds.host,
      port: creds.port,
      username: creds.username,
      ontPath: trimmedOnt,
      rxDbm,
      exitCode: typeof execResult.code === 'number' ? execResult.code : null
    },
    'Fetched ONT optics from OLT'
  );

  return {
    ontPath: trimmedOnt,
    rxDbm,
    raw,
    at,
    exitCode: typeof execResult.code === 'number' ? execResult.code : null
  };
}

// PUBLIC_INTERFACE
function cacheConnection({ host, port, username, password }) {
  /** PUBLIC_INTERFACE Cache a verified connection for subsequent optics requests (single-user dev convenience). */
  setCachedConnection({ host, port, username, password });
}

module.exports = {
  testConnection,
  getOntOptics,
  cacheConnection
};
