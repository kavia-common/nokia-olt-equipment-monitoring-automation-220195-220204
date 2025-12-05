'use strict';

const logger = require('../config/logger');

// PUBLIC_INTERFACE
function errorHandler(err, req, res, next) {
  /** PUBLIC_INTERFACE Express error-handling middleware returning structured JSON errors. */
  // eslint-disable-line no-unused-vars
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const requestId =
    req.headers['x-request-id'] ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const logPayload = {
    code,
    status,
    message: err.message,
    stack: status >= 500 ? err.stack : undefined,
    path: req.path,
    method: req.method,
    requestId
  };

  if (status >= 500) {
    logger.error(logPayload, 'Unhandled error while processing request');
  } else {
    logger.warn(logPayload, 'Request failed with client error');
  }

  res.status(status).json({
    error: {
      code,
      message: err.message || 'Unexpected error'
    },
    requestId
  });
}

module.exports = errorHandler;
