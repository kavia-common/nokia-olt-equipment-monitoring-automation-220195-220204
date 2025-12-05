'use strict';

const morgan = require('morgan');
const logger = require('../config/logger');
const { REQUEST_LOGGING } = require('../config/env');

// PUBLIC_INTERFACE
function requestLogger() {
  /** PUBLIC_INTERFACE Factory returning request logging middleware (or a no-op when disabled). */
  if (!REQUEST_LOGGING) {
    return function noOpLogger(req, res, next) {
      return next();
    };
  }

  const stream = {
    write: (message) => {
      logger.info({ message: message.trim() }, 'http_request');
    }
  };

  return morgan('combined', { stream });
}

module.exports = requestLogger;
