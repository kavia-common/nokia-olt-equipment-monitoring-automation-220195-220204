'use strict';

const { API_AUTH_TOKEN } = require('../config/env');
const logger = require('../config/logger');

// PUBLIC_INTERFACE
function authMiddleware(req, res, next) {
  /** PUBLIC_INTERFACE Express middleware enforcing Bearer token auth using API_AUTH_TOKEN when configured. */
  // If no API_AUTH_TOKEN is set, treat auth as disabled (development convenience).
  if (!API_AUTH_TOKEN) {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || token !== API_AUTH_TOKEN) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        remoteAddress: req.ip
      },
      'Unauthorized request rejected'
    );

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid API token'
      }
    });
  }

  return next();
}

module.exports = authMiddleware;
