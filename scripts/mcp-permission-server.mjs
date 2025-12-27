#!/usr/bin/env node
/**
 * MCP Permission Server for Wynter Code
 *
 * This script acts as an MCP server that Claude Code spawns.
 * It forwards permission requests to the Wynter Code Tauri app via WebSocket.
 *
 * Protocol:
 * - Claude Code communicates via stdio (JSON-RPC)
 * - This script connects to Tauri's WebSocket server
 * - Permission requests are forwarded and responses returned
 */

import { WebSocket } from 'ws';
import { createInterface } from 'readline';

const WYNTER_MCP_PORT = process.env.WYNTER_MCP_PORT;

if (!WYNTER_MCP_PORT) {
  console.error('[MCP] WYNTER_MCP_PORT environment variable not set');
  process.exit(1);
}

const WS_URL = `ws://127.0.0.1:${WYNTER_MCP_PORT}`;

// Pending JSON-RPC requests waiting for WebSocket response
const pendingRequests = new Map();

// WebSocket connection
let ws = null;
let wsConnected = false;
let wsReconnecting = false;

// Connect to Tauri WebSocket server
function connectWebSocket() {
  if (wsReconnecting) return;
  wsReconnecting = true;

  console.error(`[MCP] Connecting to ${WS_URL}...`);

  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.error('[MCP] Connected to Wynter Code');
    wsConnected = true;
    wsReconnecting = false;
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.error('[MCP] Received WebSocket response:', JSON.stringify(response));
      console.error('[MCP] Pending requests count:', pendingRequests.size);

      // Find the pending request by matching (we only have one at a time)
      // The response contains the MCP permission response format
      const [requestId, resolver] = [...pendingRequests.entries()][0] || [];

      console.error('[MCP] Resolving request:', requestId);

      if (resolver) {
        pendingRequests.delete(requestId);
        console.error('[MCP] Calling resolver with response');
        resolver(response);
      } else {
        console.error('[MCP] WARNING: No resolver found for response!');
      }
    } catch (e) {
      console.error('[MCP] Failed to parse response:', e);
    }
  });

  ws.on('close', () => {
    console.error('[MCP] WebSocket closed');
    wsConnected = false;
    ws = null;
    // Try to reconnect after a delay
    setTimeout(() => {
      wsReconnecting = false;
      connectWebSocket();
    }, 1000);
  });

  ws.on('error', (err) => {
    console.error('[MCP] WebSocket error:', err.message);
    wsConnected = false;
  });
}

// Send a permission request to Tauri and wait for response
async function requestPermission(toolName, input) {
  return new Promise((resolve, reject) => {
    if (!wsConnected || !ws) {
      reject(new Error('Not connected to Wynter Code'));
      return;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const request = {
      id: requestId,
      toolName: toolName,
      input: input,
      sessionId: '' // Will be filled by Tauri
    };

    console.error('[MCP] Sending permission request:', JSON.stringify(request).slice(0, 200));

    // Store resolver
    pendingRequests.set(requestId, resolve);

    // Send to Tauri
    ws.send(JSON.stringify(request));

    // No timeout - wait indefinitely per user preference
  });
}

// MCP JSON-RPC message handlers
const handlers = {
  // Initialize - return server info
  initialize: async (params) => {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'wynter-permission-server',
        version: '1.0.0'
      },
      capabilities: {
        tools: {}
      }
    };
  },

  // List available tools
  'tools/list': async (params) => {
    return {
      tools: [
        {
          name: 'approve_tool',
          description: 'Request user approval for a tool execution',
          inputSchema: {
            type: 'object',
            properties: {
              tool_name: {
                type: 'string',
                description: 'Name of the tool requesting approval'
              },
              input: {
                type: 'object',
                description: 'Tool input parameters'
              }
            },
            required: ['tool_name', 'input']
          }
        }
      ]
    };
  },

  // Handle tool call
  'tools/call': async (params) => {
    const { name, arguments: args } = params;

    if (name !== 'approve_tool') {
      throw new Error(`Unknown tool: ${name}`);
    }

    const toolName = args.tool_name;
    const input = args.input;

    console.error(`[MCP] Permission request for tool: ${toolName}`);
    console.error(`[MCP] Tool input keys: ${Object.keys(input || {}).join(', ')}`);

    try {
      const response = await requestPermission(toolName, input);
      console.error(`[MCP] Got permission response:`, JSON.stringify(response));

      // Return in MCP tool result format
      // The content should match what Claude expects for permission responses
      const result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response)
          }
        ]
      };
      console.error(`[MCP] Returning result to Claude:`, JSON.stringify(result));
      return result;
    } catch (e) {
      console.error('[MCP] Permission request failed:', e);
      // Return deny on error
      const denyResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              behavior: 'deny',
              message: e.message || 'Permission request failed'
            })
          }
        ]
      };
      console.error(`[MCP] Returning DENY to Claude:`, JSON.stringify(denyResult));
      return denyResult;
    }
  },

  // Handle notifications (no response needed)
  'notifications/initialized': async () => null,
  'notifications/cancelled': async () => null
};

// Process a JSON-RPC message
async function processMessage(message) {
  const { jsonrpc, id, method, params } = message;

  if (jsonrpc !== '2.0') {
    console.error('[MCP] Invalid JSON-RPC version');
    return null;
  }

  console.error(`[MCP] Processing method: ${method}`);

  const handler = handlers[method];

  if (!handler) {
    console.error(`[MCP] Unknown method: ${method}`);
    if (id !== undefined) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
    }
    return null;
  }

  try {
    const result = await handler(params);

    // Notifications don't get responses
    if (id === undefined) {
      return null;
    }

    return {
      jsonrpc: '2.0',
      id,
      result
    };
  } catch (e) {
    console.error(`[MCP] Handler error:`, e);
    if (id !== undefined) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: e.message
        }
      };
    }
    return null;
  }
}

// Main entry point
async function main() {
  console.error('[MCP] Wynter Permission Server starting...');

  // Connect to Tauri
  connectWebSocket();

  // Wait for initial connection
  await new Promise((resolve) => {
    const checkConnection = () => {
      if (wsConnected) {
        resolve();
      } else {
        setTimeout(checkConnection, 100);
      }
    };
    checkConnection();
  });

  console.error('[MCP] Ready to process requests');

  // Read JSON-RPC messages from stdin
  const rl = createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    try {
      const message = JSON.parse(line);
      const response = await processMessage(message);

      if (response) {
        const responseStr = JSON.stringify(response);
        console.error('[MCP] Sending response:', responseStr.slice(0, 200));
        process.stdout.write(responseStr + '\n');
      }
    } catch (e) {
      console.error('[MCP] Failed to process message:', e);
    }
  });

  rl.on('close', () => {
    console.error('[MCP] stdin closed, exiting');
    process.exit(0);
  });
}

main().catch((e) => {
  console.error('[MCP] Fatal error:', e);
  process.exit(1);
});
