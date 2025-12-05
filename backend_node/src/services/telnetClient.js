'use strict';

const Telnet = require('telnet-client');
const logger = require('../config/logger');

/**
 * Normalize a prompt string to something safe for telnet-client.
 * Falls back to default when an invalid/empty value is provided.
 *
 * @param {string} value Raw prompt value from configuration.
 * @param {string} fallback Fallback prompt when value is falsy.
 * @returns {string}
 */
function normalizePrompt(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  return value;
}

// PUBLIC_INTERFACE
async function runTelnetCommand({
  host,
  port,
  username,
  password,
  command,
  usernamePrompt,
  passwordPrompt,
  shellPrompt,
  loginTimeoutMs = 8000,
  commandTimeoutMs = 10000
}) {
  /** PUBLIC_INTERFACE
   * Execute a single Telnet command on the OLT and resolve with { stdout, stderr, code, signal }.
   *
   * Passwords and raw command output are never logged. This helper is intended for
   * one-shot commands (connect, authenticate, run, disconnect).
   */
  if (!host || !username || !password || !command) {
    const err = new Error(
      'Missing required Telnet parameters: host, username, password, command'
    );
    err.code = 'TELNET_PARAM_ERROR';
    err.status = 400;
    throw err;
  }

  const effectivePort =
    typeof port === 'number' && Number.isFinite(port) && port > 0 ? port : 23;

  const conn = new Telnet();
  let connected = false;

  const options = {
    host,
    port: effectivePort,
    username,
    password,
    shellPrompt: normalizePrompt(shellPrompt, '>'),
    loginPrompt: normalizePrompt(usernamePrompt, 'login:'),
    passwordPrompt: normalizePrompt(passwordPrompt, 'Password:'),
    timeout: loginTimeoutMs,
    // Do not spam logs with protocol-level debug; use app-level logging instead.
    debug: false,
    negotiationMandatory: false,
    ors: '\r\n',
    irs: '\r\n'
  };

  try {
    logger.debug(
      {
        host,
        port: effectivePort,
        username
      },
      'Opening Telnet connection to OLT'
    );

    await conn.connect(options);
    connected = true;

    logger.debug(
      {
        host,
        port: effectivePort,
        username
      },
      'Telnet connection established; executing command on OLT'
    );

    // telnet-client's `send` resolves when the shell prompt is seen again.
    const stdout = await conn.send(command, {
      shellPrompt: options.shellPrompt,
      timeout: commandTimeoutMs,
      maxBufferLength: 1024 * 1024
    });

    // We do not log full stdout here to avoid leaking sensitive data in non-debug logs.
    logger.debug(
      {
        host,
        port: effectivePort,
        username,
        commandSnippet: command.slice(0, 80)
      },
      'Telnet command executed successfully on OLT'
    );

    return {
      stdout: typeof stdout === 'string' ? stdout : String(stdout || ''),
      stderr: '',
      code: 0,
      signal: null
    };
  } catch (err) {
    // Normalize error codes for routing and error middleware.
    if (!err.code) {
      if (/timed?\s*out/i.test(err.message || '')) {
        err.code = 'TELNET_TIMEOUT';
      } else if (!connected) {
        err.code = 'TELNET_CONNECTION_ERROR';
      } else {
        err.code = 'TELNET_COMMAND_ERROR';
      }
    }

    logger.error(
      {
        host,
        port: effectivePort,
        username,
        code: err.code,
        message: err.message
      },
      'Telnet error while communicating with OLT'
    );
    throw err;
  } finally {
    try {
      conn.end();
    } catch {
      // Ignore cleanup failures.
    }
  }
}

module.exports = {
  runTelnetCommand
};
