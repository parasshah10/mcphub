import express, { Request, Response, NextFunction } from 'express';
import { auth } from './auth.js';
import { userContextMiddleware } from './userContext.js';
import { i18nMiddleware } from './i18n.js';
import config from '../config/index.js';
import { getSystemConfigDao } from '../dao/index.js';
import { getBetterAuthRuntimeConfig } from '../services/betterAuthConfig.js';
import { resolveJsonBodyLimit } from '../utils/bearerAuth.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

// An array of regular expressions for public API paths that do not require authentication.
// This provides a more precise and secure way to define public endpoints.
const publicApiPaths = [
  /^\/auth\/login$/, // User login
  /^\/auth\/better/, // Better-auth endpoints
  /^\/better-auth/, // Better-auth endpoints
  /^\/openapi\.(json|yaml)$/, // Global OpenAPI spec
  /^\/openapi\/(servers|stats)$/, // OpenAPI server list and stats
  /^\/[^/]+\/openapi\.(json|yaml)$/, // Server/group-specific OpenAPI spec (e.g., /calculator/openapi.json)
  /^\/tools\//, // Global tool execution
  /^\/[^/]+\/tools\//, // Server/group-scoped tool execution (e.g., /calculator/tools/...)
];

export const initMiddlewares = (app: express.Application): void => {
  // Apply i18n middleware first to detect language for all requests
  app.use(i18nMiddleware);

  // Serve static files from the dynamically determined frontend path
  // Note: Static files will be handled by the server directly, not here

  app.use(async (req, res, next) => {
    const basePath = config.basePath;
    const betterAuthPath = `${basePath}${getBetterAuthRuntimeConfig().basePath}`;
    // Only apply JSON parsing for API and auth routes, not for SSE or message endpoints
    // TODO exclude sse responses by mcp endpoint
    if (
      !req.path.startsWith(betterAuthPath) &&
      req.path !== `${basePath}/sse` &&
      !req.path.startsWith(`${basePath}/sse/`) &&
      req.path !== `${basePath}/messages` &&
      !req.path.match(
        new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^/]+/messages$`),
      ) &&
      !req.path.match(
        new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^/]+/sse(/.*)?$`),
      )
    ) {
      try {
        const systemConfig = await getSystemConfigDao().get();
        const jsonBodyLimit = resolveJsonBodyLimit(systemConfig);
        express.json({ limit: jsonBodyLimit })(req, res, next);
      } catch (error) {
        next(error as Error);
      }
    } else {
      next();
    }
  });

  // Protect API routes with authentication middleware, but exclude public endpoints
  app.use(`${config.basePath}/api`, (req: Request, res: Response, next: NextFunction) => {
    const isPublicPath = publicApiPaths.some((pattern) => pattern.test(req.path));

    if (isPublicPath) {
      next();
    } else {
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
