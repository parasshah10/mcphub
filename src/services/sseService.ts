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
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const group = req.params.group;

  console.log(`[DEBUG] ==> Entering handleMcpPostRequest. SessionID Header: ${sessionId}, Group: ${group}`);
  
  // Check bearer auth
  if (!validateBearerAuth(req)) {
    console.log('[DEBUG] Bearer auth failed.');
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
    console.log('[DEBUG] Global route access denied.');
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  const requestContextService = RequestContextService.getInstance();
  requestContextService.setRequestContext(req);

  try {
    // Case 1: Request is for an existing, known session
    if (sessionId && transports[sessionId]) {
      console.log(`[DEBUG] Found existing transport for SessionID: ${sessionId}. Reusing it.`);
      const transport = transports[sessionId].transport as StreamableHTTPServerTransport;
      await transport.handleRequest(req, res);
      console.log(`[DEBUG] Finished handling request for existing SessionID: ${sessionId}`);
    } 
    // Case 2: This is a new connection. The SDK's handleRequest will check if it's a valid initialize request.
    else {
      console.log(`[DEBUG] No existing transport found for SessionID: ${sessionId}. Creating new transport.`);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.log(`[DEBUG] ONSESSIONINITIALIZED CALLBACK: New session created with ID: ${newSessionId}`);
          transports[newSessionId] = { transport, group: group };
          console.log(`[DEBUG] Stored new transport in dictionary for SessionID: ${newSessionId}`);
          const mcpServer = getMcpServer(newSessionId, group);
          mcpServer.connect(transport);
          console.log(`[DEBUG] Associated MCP Server with SessionID: ${newSessionId}`);
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`[DEBUG] ONCLOSE CALLBACK: Transport closed for SessionID: ${transport.sessionId}`);
          delete transports[transport.sessionId];
          deleteMcpServer(transport.sessionId);
        }
      };
      
      // Let the transport handle the raw request. It will parse the body internally.
      console.log('[DEBUG] Passing request to new transport.handleRequest...');
      await transport.handleRequest(req, res);
      console.log(`[DEBUG] Finished handling request for new transport. Final SessionID: ${transport.sessionId}`);
    }
  } catch (error) {
    console.error(`[DEBUG] Error in handleMcpPostRequest: ${error}`);
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
    console.log(`[DEBUG] <== Exiting handleMcpPostRequest for SessionID: ${sessionId}`);
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
