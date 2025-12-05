'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({
  path: process.env.BACKEND_NODE_ENV_PATH || path.resolve(process.cwd(), '.env')
});

// Derive and normalize configuration values
const NODE_ENV = process.env.NODE_ENV || 'development';

// Protocol used to talk to the OLT: "telnet" (default) or "ssh"
const PROTOCOL = (process.env.PROTOCOL || 'telnet').toLowerCase();

const PORT = Number.parseInt(process.env.PORT || '4000', 10) || 4000;

const OLT_HOST_DEFAULT = process.env.OLT_HOST_DEFAULT || '202.39.123.124';

// SSH configuration (still supported when PROTOCOL=ssh)
const OLT_SSH_PORT = Number.parseInt(process.env.OLT_SSH_PORT || '22', 10) || 22;

// Telnet configuration (default protocol)
const OLT_TELNET_PORT = Number.parseInt(process.env.OLT_TELNET_PORT || '23', 10) || 23;

const TELNET_USERNAME_PROMPT = process.env.TELNET_USERNAME_PROMPT || 'login:';
const TELNET_PASSWORD_PROMPT = process.env.TELNET_PASSWORD_PROMPT || 'Password:';
const TELNET_SHELL_PROMPT = process.env.TELNET_SHELL_PROMPT || '#';

const TELNET_LOGIN_TIMEOUT_MS =
  Number.parseInt(process.env.TELNET_LOGIN_TIMEOUT_MS || '8000', 10) || 8000;
const TELNET_COMMAND_TIMEOUT_MS =
  Number.parseInt(process.env.TELNET_COMMAND_TIMEOUT_MS || '10000', 10) || 10000;

// These can come from env or be supplied on each request
const OLT_USERNAME = process.env.OLT_USERNAME || '';
const OLT_PASSWORD = process.env.OLT_PASSWORD || '';

// Optional API auth token; when unset, auth is effectively disabled
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

// Enable/disable request logging; default on
const REQUEST_LOGGING = (process.env.REQUEST_LOGGING || 'true')
  .toString()
  .toLowerCase() !== 'false';

// Allow CORS credentials if explicitly enabled
const ALLOW_REQUEST_CREDENTIALS = (process.env.ALLOW_REQUEST_CREDENTIALS || 'false')
  .toString()
  .toLowerCase() === 'true';

// Frontend origin for CORS; defaults to localhost React dev server
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  process.env.REACT_APP_FRONTEND_URL ||
  'http://localhost:3000';

/**
 * Basic runtime validation of critical configuration.
 * Does not throw for missing OLT credentials because they can come from requests.
 */
function validateConfig() {
  const problems = [];

  if (!OLT_HOST_DEFAULT) {
    problems.push('OLT_HOST_DEFAULT is empty; connections will fail without a host.');
  }

  if (Number.isNaN(OLT_SSH_PORT) || OLT_SSH_PORT <= 0) {
    problems.push('OLT_SSH_PORT must be a positive integer.');
  }

  if (Number.isNaN(OLT_TELNET_PORT) || OLT_TELNET_PORT <= 0) {
    problems.push('OLT_TELNET_PORT must be a positive integer.');
  }

  if (!['telnet', 'ssh'].includes(PROTOCOL)) {
    problems.push(`PROTOCOL "${PROTOCOL}" is not recognized; supported values are "telnet" and "ssh".`);
  }

  if (Number.isNaN(TELNET_LOGIN_TIMEOUT_MS) || TELNET_LOGIN_TIMEOUT_MS <= 0) {
    problems.push('TELNET_LOGIN_TIMEOUT_MS must be a positive integer (milliseconds).');
  }

  if (Number.isNaN(TELNET_COMMAND_TIMEOUT_MS) || TELNET_COMMAND_TIMEOUT_MS <= 0) {
    problems.push('TELNET_COMMAND_TIMEOUT_MS must be a positive integer (milliseconds).');
  }

  if (!['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(LOG_LEVEL)) {
    problems.push(`LOG_LEVEL "${LOG_LEVEL}" is not a recognized level.`);
  }

  return problems;
}

// PUBLIC_INTERFACE
function getConfig() {
  /** PUBLIC_INTERFACE Return the resolved configuration object and any validation warnings. */
  const warnings = validateConfig();

  return {
    NODE_ENV,
    PROTOCOL,
    PORT,
    OLT_HOST_DEFAULT,
    OLT_SSH_PORT,
    OLT_TELNET_PORT,
    TELNET_USERNAME_PROMPT,
    TELNET_PASSWORD_PROMPT,
    TELNET_SHELL_PROMPT,
    TELNET_LOGIN_TIMEOUT_MS,
    TELNET_COMMAND_TIMEOUT_MS,
    OLT_USERNAME,
    OLT_PASSWORD,
    API_AUTH_TOKEN,
    LOG_LEVEL,
    REQUEST_LOGGING,
    ALLOW_REQUEST_CREDENTIALS,
    FRONTEND_ORIGIN,
    warnings
  };
}

const cfg = getConfig();

module.exports = {
  ...cfg,
  getConfig
};
