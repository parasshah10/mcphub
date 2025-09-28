import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { deleteMcpServer, getMcpServer } from './mcpService.js';
import { loadSettings } from '../config/index.js';
import config from '../config/index.js';
import { UserContextService } from './userContextService.js';
import { RequestContextService } from './requestContextService.js';

const transports: { [sessionId: string]: { transport: Transport; group: string } } = {};

export const getGroup = (sessionId: string): string => {
  return transports[sessionId]?.group || '';
};

// Helper function to validate bearer auth
const validateBearerAuth = (req: Request): boolean => {
  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };

  if (routingConfig.enableBearerAuth) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    return token === routingConfig.bearerAuthKey;
  }

  return true;
};

export const handleSseConnection = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;

  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    console.warn('Bearer authentication failed or not provided');
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };
  const group = req.params.group;

  // Check if this is a global route (no group) and if it's allowed
  if (!group && !routingConfig.enableGlobalRoute) {
    console.warn('Global routes are disabled, group ID is required');
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  // For user-scoped routes, validate that the user has access to the requested group
  if (username && group) {
    // Additional validation can be added here to check if user has access to the group
    console.log(`User ${username} accessing group: ${group}`);
  }

  // Construct the appropriate messages path based on user context
  const messagesPath = username
    ? `${config.basePath}/${username}/messages`
    : `${config.basePath}/messages`;

  console.log(`Creating SSE transport with messages path: ${messagesPath}`);

  const transport = new SSEServerTransport(messagesPath, res);
  transports[transport.sessionId] = { transport, group: group };

  res.on('close', () => {
    delete transports[transport.sessionId];
    deleteMcpServer(transport.sessionId);
    console.log(`SSE connection closed: ${transport.sessionId}`);
  });

  console.log(
    `New SSE connection established: ${transport.sessionId} with group: ${group || 'global'}${username ? ` for user: ${username}` : ''}`,
  );
  await getMcpServer(transport.sessionId, group).connect(transport);
};

export const handleSseMessage = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;

  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.query.sessionId as string;

  // Validate sessionId
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // Check if transport exists before destructuring
  const transportData = transports[sessionId];
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  req.params.group = group;
  req.query.group = group;
  console.log(
    `Received message for sessionId: ${sessionId} in group: ${group}${username ? ` for user: ${username}` : ''}`,
  );

  // Set request context for MCP handlers to access HTTP headers
  const requestContextService = RequestContextService.getInstance();
  requestContextService.setRequestContext(req);

  try {
    await (transport as SSEServerTransport).handlePostMessage(req, res);
  } finally {
    // Clean up request context after handling
    requestContextService.clearRequestContext();
  }
};

export const handleMcpPostRequest = async (req: Request, res: Response): Promise<void> => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const group = req.params.group;

  // Log the incoming request without the body, as it will be streamed
  console.log(
    `Handling MCP post request for sessionId: ${sessionId} and group: ${group}${username ? ` for user: ${username}` : ''}`,
  );

  // Check bearer auth
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  // Check if global routes are enabled
  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
  };
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  // Set request context for MCP handlers to access HTTP headers
  const requestContextService = RequestContextService.getInstance();
  requestContextService.setRequestContext(req);

  try {
    // Case 1: Request is for an existing, known session
    if (sessionId && transports[sessionId]) {
      const transport = transports[sessionId].transport as StreamableHTTPServerTransport;
      await transport.handleRequest(req, res);
    } 
    // Case 2: This is a new connection (must be an initialize request, which the SDK will verify)
    else {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.log(`MCP session initialized: ${newSessionId} for group: ${group}`);
          transports[newSessionId] = { transport, group: group };
          const mcpServer = getMcpServer(newSessionId, group);
          mcpServer.connect(transport);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`Transport closed: ${transport.sessionId}`);
          delete transports[transport.sessionId];
          deleteMcpServer(transport.sessionId);
        }
      };
      
      // Let the transport handle the raw request, it will parse the initialize message
      await transport.handleRequest(req, res);
    }
  } catch (error) {
    console.error(`Error in handleMcpPostRequest: ${error}`);
    if (!res.headersSent) {
        res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Internal Server Error' },
            id: null,
        });
    }
  } finally {
    // Clean up request context after handling
    requestContextService.clearRequestContext();
  }
};

export const handleMcpOtherRequest = async (req: Request, res: Response) => {
  // User context is now set by sseUserContextMiddleware
  const userContextService = UserContextService.getInstance();
  const currentUser = userContextService.getCurrentUser();
  const username = currentUser?.username;

  console.log(`Handling MCP other request${username ? ` for user: ${username}` : ''}`);

  // Check bearer auth using filtered settings
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const { transport } = transports[sessionId];
  await (transport as StreamableHTTPServerTransport).handleRequest(req, res);
};

export const getConnectionCount = (): number => {
  return Object.keys(transports).length;
};
