#!/usr/bin/env node
/**
 * MCP File Coordinator for Wynter Code
 *
 * This script acts as an MCP server that Claude Code spawns during auto-build.
 * It coordinates file access between multiple concurrent Claude sessions.
 *
 * Protocol:
 * - Claude Code communicates via stdio (JSON-RPC)
 * - This script connects to Tauri's WebSocket server
 * - Lock requests are forwarded and responses returned
 */

import { WebSocket } from 'ws';
import { createInterface } from 'readline';

const WYNTER_FILE_COORDINATOR_PORT = process.env.WYNTER_FILE_COORDINATOR_PORT;
const ISSUE_ID = process.env.WYNTER_ISSUE_ID || 'unknown';
const RETRY_INTERVAL_MS = parseInt(process.env.WYNTER_LOCK_RETRY_MS || '10000', 10);

if (!WYNTER_FILE_COORDINATOR_PORT) {
  console.error('[FileCoordinator] WYNTER_FILE_COORDINATOR_PORT environment variable not set');
  process.exit(1);
}

const WS_URL = `ws://127.0.0.1:${WYNTER_FILE_COORDINATOR_PORT}`;

// WebSocket connection
let ws = null;
let wsConnected = false;
let wsReconnecting = false;

// Pending requests waiting for WebSocket response
let pendingResolve = null;

// Track acquired locks for cleanup
const acquiredLocks = new Map(); // file_path -> lock_id

// Connect to Tauri WebSocket server
function connectWebSocket() {
  if (wsReconnecting) return;
  wsReconnecting = true;

  console.error(`[FileCoordinator] Connecting to ${WS_URL}...`);

  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.error('[FileCoordinator] Connected to Wynter Code');
    wsConnected = true;
    wsReconnecting = false;
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.error('[FileCoordinator] Received response:', JSON.stringify(response));

      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        resolve(response);
      }
    } catch (e) {
      console.error('[FileCoordinator] Failed to parse response:', e);
    }
  });

  ws.on('close', () => {
    console.error('[FileCoordinator] WebSocket closed');
    wsConnected = false;
    ws = null;
    // Try to reconnect after a delay
    setTimeout(() => {
      wsReconnecting = false;
      connectWebSocket();
    }, 1000);
  });

  ws.on('error', (err) => {
    console.error('[FileCoordinator] WebSocket error:', err.message);
    wsConnected = false;
  });
}

// Send a request and wait for response
async function sendRequest(request) {
  return new Promise((resolve, reject) => {
    if (!wsConnected || !ws) {
      reject(new Error('Not connected to Wynter Code'));
      return;
    }

    pendingResolve = resolve;
    console.error('[FileCoordinator] Sending request:', JSON.stringify(request));
    ws.send(JSON.stringify(request));

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingResolve === resolve) {
        pendingResolve = null;
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

// Acquire a lock with retry logic
async function acquireLock(filePath) {
  console.error(`[FileCoordinator] Attempting to acquire lock for: ${filePath}`);

  while (true) {
    try {
      const response = await sendRequest({
        action: 'acquire',
        filePath: filePath,
        issueId: ISSUE_ID,
      });

      if (response.success) {
        console.error(`[FileCoordinator] Lock acquired for ${filePath}`);
        acquiredLocks.set(filePath, response.lockId);
        return response;
      }

      // Lock is held by another issue, wait and retry
      console.error(`[FileCoordinator] File locked by ${response.holder}, waiting ${RETRY_INTERVAL_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));

    } catch (e) {
      console.error(`[FileCoordinator] Error acquiring lock: ${e.message}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
}

// Release a lock
async function releaseLock(filePath) {
  const lockId = acquiredLocks.get(filePath);
  if (!lockId) {
    console.error(`[FileCoordinator] No lock to release for ${filePath}`);
    return { success: true, message: 'No lock held' };
  }

  try {
    const response = await sendRequest({
      action: 'release',
      filePath: filePath,
      issueId: ISSUE_ID,
      lockId: lockId,
    });

    if (response.success) {
      acquiredLocks.delete(filePath);
    }
    return response;
  } catch (e) {
    console.error(`[FileCoordinator] Error releasing lock: ${e.message}`);
    return { success: false, message: e.message };
  }
}

// Check file status
async function checkStatus(filePath) {
  try {
    return await sendRequest({
      action: 'check',
      filePath: filePath,
      issueId: ISSUE_ID,
    });
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// Get all locks for this issue
async function getMyLocks() {
  try {
    const response = await sendRequest({
      action: 'list',
      issueId: ISSUE_ID,
    });
    return response;
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// Release all locks for this issue
async function releaseAllLocks() {
  try {
    const response = await sendRequest({
      action: 'release_all',
      issueId: ISSUE_ID,
    });
    acquiredLocks.clear();
    return response;
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// MCP JSON-RPC message handlers
const handlers = {
  // Initialize - return server info
  initialize: async (params) => {
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'wynter-file-coordinator',
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
          name: 'acquire_file_lock',
          description: 'Acquire an exclusive lock on a file before editing. IMPORTANT: You MUST call this before using Edit or Write tools on any file during concurrent auto-build. The lock will wait indefinitely until the file is available.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to lock'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'release_file_lock',
          description: 'Release a lock on a file after editing is complete. Call this after you finish editing a file to allow other issues to access it.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to unlock'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'check_file_status',
          description: 'Check if a file is currently locked by another issue. Returns the holder if locked.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to check'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'get_my_locks',
          description: 'Get all files currently locked by this issue session.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'release_all_locks',
          description: 'Release all locks held by this issue session. Call this when done with all file operations.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  },

  // Handle tool call
  'tools/call': async (params) => {
    const { name, arguments: args } = params;

    let result;
    switch (name) {
      case 'acquire_file_lock':
        result = await acquireLock(args.file_path);
        break;
      case 'release_file_lock':
        result = await releaseLock(args.file_path);
        break;
      case 'check_file_status':
        result = await checkStatus(args.file_path);
        break;
      case 'get_my_locks':
        result = await getMyLocks();
        break;
      case 'release_all_locks':
        result = await releaseAllLocks();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    };
  },

  // Handle notifications (no response needed)
  'notifications/initialized': async () => null,
  'notifications/cancelled': async () => null
};

// Process a JSON-RPC message
async function processMessage(message) {
  const { jsonrpc, id, method, params } = message;

  if (jsonrpc !== '2.0') {
    console.error('[FileCoordinator] Invalid JSON-RPC version');
    return null;
  }

  console.error(`[FileCoordinator] Processing method: ${method}`);

  const handler = handlers[method];

  if (!handler) {
    console.error(`[FileCoordinator] Unknown method: ${method}`);
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
    console.error(`[FileCoordinator] Handler error:`, e);
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

// Cleanup on exit
process.on('SIGINT', async () => {
  console.error('[FileCoordinator] Received SIGINT, releasing locks...');
  await releaseAllLocks();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('[FileCoordinator] Received SIGTERM, releasing locks...');
  await releaseAllLocks();
  process.exit(0);
});

// Main entry point
async function main() {
  console.error('[FileCoordinator] Wynter File Coordinator starting...');
  console.error(`[FileCoordinator] Issue ID: ${ISSUE_ID}`);
  console.error(`[FileCoordinator] Retry interval: ${RETRY_INTERVAL_MS}ms`);

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

  console.error('[FileCoordinator] Ready to process requests');

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
        console.error('[FileCoordinator] Sending response:', responseStr.slice(0, 200));
        process.stdout.write(responseStr + '\n');
      }
    } catch (e) {
      console.error('[FileCoordinator] Failed to process message:', e);
    }
  });

  rl.on('close', async () => {
    console.error('[FileCoordinator] stdin closed, releasing locks and exiting');
    await releaseAllLocks();
    process.exit(0);
  });
}

main().catch(async (e) => {
  console.error('[FileCoordinator] Fatal error:', e);
  await releaseAllLocks();
  process.exit(1);
});
