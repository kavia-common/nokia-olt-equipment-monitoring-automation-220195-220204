'use strict';

const pino = require('pino');
const { LOG_LEVEL, NODE_ENV, getConfig } = require('./env');

// Initialize logger
const logger = pino({
  level: LOG_LEVEL || 'info',
  base: {
    service: 'backend_node',
    env: NODE_ENV
  }
});

// Log configuration warnings (if any) once at startup
const { warnings } = getConfig();
if (warnings && warnings.length > 0) {
  logger.warn({ warnings }, 'Configuration validation warnings');
}

// PUBLIC_INTERFACE
function getLogger() {
  /** PUBLIC_INTERFACE Return the shared application logger instance. */
  return logger;
}

module.exports = getLogger();
module.exports.getLogger = getLogger;
