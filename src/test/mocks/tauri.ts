import { vi } from "vitest";

/**
 * Create a mock for @tauri-apps/api/core invoke function
 * Use this when you need more control over invoke responses in tests
 */
export function createInvokeMock() {
  return vi.fn().mockImplementation((cmd: string) => {
    console.warn(`Unmocked Tauri invoke call: ${cmd}`);
    return Promise.resolve(null);
  });
}

/**
 * Mock invoke to return specific values for specific commands
 */
export function mockInvokeResponses(
  responses: Record<string, unknown>
): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation((cmd: string, args?: unknown) => {
    if (cmd in responses) {
      const response = responses[cmd];
      return Promise.resolve(
        typeof response === "function" ? response(args) : response
      );
    }
    console.warn(`Unmocked Tauri invoke call: ${cmd}`);
    return Promise.resolve(null);
  });
}

/**
 * Create a mock event listener that can be triggered manually
 */
export function createEventListenerMock() {
  const listeners: Map<string, Set<(event: unknown) => void>> = new Map();

  const listen = vi.fn().mockImplementation((event: string, handler: (event: unknown) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);

    // Return unlisten function
    return Promise.resolve(() => {
      listeners.get(event)?.delete(handler);
    });
  });

  const emit = (event: string, payload: unknown) => {
    listeners.get(event)?.forEach((handler) => {
      handler({ payload });
    });
  };

  return { listen, emit, listeners };
}
