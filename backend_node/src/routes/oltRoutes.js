'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { testConnection, getOntOptics, cacheConnection } = require('../services/oltService');

const router = express.Router();

const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Nokia 7360 OLT Backend API',
    description:
      'Express-based API for connecting to a Nokia 7360 OLT via SSH and retrieving ONT optics (RX dBm).',
    version: '0.1.0'
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check that the backend service is up and responding.',
        responses: {
          '200': {
            description: 'Service is healthy'
          }
        }
      }
    },
    '/connect': {
      post: {
        summary: 'Test OLT connection',
        description:
          'Test SSH connectivity to the OLT using supplied or default credentials. When successful, credentials are cached in memory for subsequent /optics calls.',
        requestBody: {
          required: false
        },
        responses: {
          '200': { description: 'Connection ok' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '502': { description: 'OLT connection failure' }
        }
      }
    },
    '/optics': {
      get: {
        summary: 'Get ONT optics',
        description:
          "Execute 'show equipment ont optics ont-id <ontPath>' on the OLT and parse the RX dBm value for the given ONT.",
        parameters: [
          {
            name: 'ont',
            in: 'query',
            description: 'ONT path in the form shelf/slot/pon/ont/x (e.g. 1/1/3/2/1).',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': { description: 'Optics data returned' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '502': { description: 'OLT connection failure' }
        }
      }
    }
  }
};

// PUBLIC_INTERFACE
router.get('/openapi.json', (req, res) => {
  /** PUBLIC_INTERFACE Return the OpenAPI specification for this backend. */
  res.json(openApiDocument);
});

// PUBLIC_INTERFACE
router.get('/health', (req, res) => {
  /** PUBLIC_INTERFACE Lightweight health check endpoint, unauthenticated. */
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// PUBLIC_INTERFACE
router.post('/connect', auth, async (req, res, next) => {
  /** PUBLIC_INTERFACE Test OLT connection with provided/default credentials and cache them on success. */
  try {
    const { host, username, password, port } = req.body || {};

    const result = await testConnection({
      host,
      port,
      username,
      password
    });

    cacheConnection({
      host: result.host,
      port: result.port,
      username: result.username,
      password: password || undefined
    });

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'MISSING_CREDENTIALS' || err.code === 'SSH_PARAM_ERROR') {
      err.status = err.status || 400;
      return next(err);
    }

    // Treat SSH issues as a bad gateway error
    if (err.code && err.code.startsWith('SSH_')) {
      err.status = err.status || 502;
      return next(err);
    }

    return next(err);
  }
});

// PUBLIC_INTERFACE
router.get('/optics', auth, async (req, res, next) => {
  /** PUBLIC_INTERFACE Fetch ONT RX optics for the given ont=... query parameter. */
  try {
    const ontPath = (req.query.ont || '').toString().trim();

    if (!ontPath) {
      const err = new Error('Query parameter "ont" is required (e.g. 1/1/3/2/1)');
      err.code = 'INVALID_ONT';
      err.status = 400;
      throw err;
    }

    const ontPattern = /^\d+\/\d+\/\d+\/\d+\/\d+$/;
    if (!ontPattern.test(ontPath)) {
      const err = new Error(
        'ONT path must match pattern shelf/slot/pon/ont/x (e.g. 1/1/3/2/1)'
      );
      err.code = 'INVALID_ONT';
      err.status = 400;
      throw err;
    }

    const result = await getOntOptics({ ontPath });

    res.json(result);
  } catch (err) {
    if (err.code === 'INVALID_ONT' || err.code === 'MISSING_CREDENTIALS') {
      err.status = err.status || 400;
      return next(err);
    }

    if (err.code && err.code.startsWith('SSH_')) {
      err.status = err.status || 502;
      return next(err);
    }

    return next(err);
  }
});

module.exports = router;
