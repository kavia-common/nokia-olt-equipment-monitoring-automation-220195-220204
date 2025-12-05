'use strict';

const { Client } = require('ssh2');
const logger = require('../config/logger');

// PUBLIC_INTERFACE
function runSshCommand({ host, port, username, password, command, timeoutMs = 10000 }) {
  /** PUBLIC_INTERFACE Execute a single SSH command and resolve with { stdout, stderr, code, signal }. Password is never logged. */
  if (!host || !username || !password || !command) {
    const err = new Error('Missing required SSH parameters: host, username, password, command');
    err.code = 'SSH_PARAM_ERROR';
    err.status = 400;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let completed = false;

    const timer = setTimeout(() => {
      if (completed) return;
      completed = true;
      conn.destroy();
      const err = new Error('SSH command timed out');
      err.code = 'SSH_TIMEOUT';
      reject(err);
    }, timeoutMs);

    conn
      .on('ready', () => {
        logger.debug(
          { host, port, username },
          'SSH connection ready; executing command on OLT'
        );

        conn.exec(command, (execErr, stream) => {
          if (execErr) {
            clearTimeout(timer);
            if (completed) return;
            completed = true;
            execErr.code = execErr.code || 'SSH_EXEC_ERROR';
            return reject(execErr);
          }

          let stdout = '';
          let stderr = '';

          stream
            .on('close', (code, signal) => {
              clearTimeout(timer);
              if (completed) return;
              completed = true;
              conn.end();
              resolve({ stdout, stderr, code, signal });
            })
            .on('data', (data) => {
              stdout += data.toString();
            });

          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        });
      })
      .on('error', (connErr) => {
        clearTimeout(timer);
        if (completed) return;
        completed = true;
        connErr.code = connErr.code || 'SSH_CONNECTION_ERROR';
        logger.error(
          { host, port, username, code: connErr.code, message: connErr.message },
          'SSH connection error'
        );
        reject(connErr);
      })
      .connect({
        host,
        port,
        username,
        password,
        readyTimeout: timeoutMs
      });
  });
}

module.exports = {
  runSshCommand
};
