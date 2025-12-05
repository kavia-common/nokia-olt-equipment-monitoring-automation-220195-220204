'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const {
  PORT,
  NODE_ENV,
  FRONTEND_ORIGIN,
  ALLOW_REQUEST_CREDENTIALS
} = require('./config/env');
const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const oltRoutes = require('./routes/oltRoutes');

const app = express();

// Security & parsing middleware
app.set('trust proxy', true);
app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: ALLOW_REQUEST_CREDENTIALS
  })
);

app.use(express.json({ limit: '1mb' }));

// Request logging
app.use(requestLogger());

// Mount routes
app.use('/', oltRoutes);

// 404 handler (must come before error handler)
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Central error handler
app.use(errorHandler);

// PUBLIC_INTERFACE
function start() {
  /** PUBLIC_INTERFACE Start the Express HTTP server and return the underlying Server instance. */
  const server = app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        env: NODE_ENV,
        frontendOrigin: FRONTEND_ORIGIN
      },
      'backend_node server listening'
    );
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = {
  app,
  start
};
