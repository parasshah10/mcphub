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

// An array of regular expressions for public API paths that do not require authentication.
// This provides a more precise and secure way to define public endpoints.
const publicApiPaths = [
  /^\/auth\/login$/, // User login
  /^\/openapi\.json$/, // Global OpenAPI spec
  /^\/openapi\/(servers|stats)$/, // OpenAPI server list and stats
  /^\/[^/]+\/openapi\.json$/, // Server/group-specific OpenAPI spec (e.g., /calculator/openapi.json)
  /^\/tools\//, // Global tool execution
  /^\/[^/]+\/tools\//, // Server/group-scoped tool execution (e.g., /calculator/tools/...)
];

export const initMiddlewares = (app: express.Application): void => {
  // Apply i18n middleware first to detect language for all requests
  app.use(i18nMiddleware);

  // Serve static files from the dynamically determined frontend path
  // Note: Static files will be handled by the server directly, not here

  app.use((req: Request, res: Response, next: NextFunction) => {
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

  // Protect API routes with authentication middleware, but exclude public endpoints
  app.use(`${config.basePath}/api`, (req: Request, res: Response, next: NextFunction) => {
    const isPublicPath = publicApiPaths.some((pattern) => pattern.test(req.path));

    if (isPublicPath) {
      console.log(`[DEBUG] Skipping auth for public API path: ${req.path}`);
      next();
    } else {
      console.log(`[DEBUG] Applying auth for protected API path: ${req.path}`);
      // Apply authentication middleware first
      auth(req, res, (err: any) => {
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
