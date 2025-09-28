import express, { Request, Response, NextFunction } from 'express';
import { auth } from './auth.js';
import { userContextMiddleware } from './userContext.js';
import { i18nMiddleware } from './i18n.js';
import config from '../config/index.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('[DEBUG] Unhandled error caught by errorHandler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export const initMiddlewares = (app: express.Application): void => {
  // Apply i18n middleware first to detect language for all requests
  app.use(i18nMiddleware);

  // Serve static files from the dynamically determined frontend path
  // Note: Static files will be handled by the server directly, not here

  app.use((req, res, next) => {
    const basePath = config.basePath;
    const path = req.path;

    // Determine if the path is an MCP streaming endpoint
    const isStreamingEndpoint =
      path.startsWith(`${basePath}/sse`) ||
      path.startsWith(`${basePath}/mcp`) ||
      path.startsWith(`${basePath}/messages`) ||
      path.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^/]+/(sse|mcp|messages)`));

    // Only apply JSON parsing for non-streaming routes
    if (!isStreamingEndpoint) {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Protect API routes with authentication middleware, but exclude auth endpoints
  app.use(`${config.basePath}/api`, (req, res, next) => {
    // Skip authentication for public endpoints like login and OpenAPI specs
    if (
      req.path === '/auth/login' ||
      req.path.startsWith('/openapi') || // Catches /openapi.json, /openapi/servers, etc.
      req.path.startsWith('/tools/') // Catches tool execution endpoints
    ) {
      console.log(`[DEBUG] Skipping auth for public API path: ${req.path}`);
      next();
    } else {
      console.log(`[DEBUG] Applying auth for protected API path: ${req.path}`);
      // Apply authentication middleware first
      auth(req, res, (err) => {
        if (err) {
          next(err);
        } else {
          // Apply user context middleware after successful authentication
          userContextMiddleware(req, res, next);
        }
      });
    }
  });

  app.use(errorHandler);
};
