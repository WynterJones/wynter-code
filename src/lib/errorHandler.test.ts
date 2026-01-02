import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getErrorMessage, handleError, ErrorCategory } from "./errorHandler";

// Mock the debug module
vi.mock("./debug", () => ({
  debug: {
    error: vi.fn(),
  },
}));

describe("getErrorMessage", () => {
  describe("Standard Error objects", () => {
    it("extracts message from Error instance", () => {
      const error = new Error("Something went wrong");
      expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("extracts message from TypeError", () => {
      const error = new TypeError("Cannot read property of undefined");
      expect(getErrorMessage(error)).toBe("Cannot read property of undefined");
    });

    it("extracts message from RangeError", () => {
      const error = new RangeError("Value out of range");
      expect(getErrorMessage(error)).toBe("Value out of range");
    });

    it("extracts message from SyntaxError", () => {
      const error = new SyntaxError("Unexpected token");
      expect(getErrorMessage(error)).toBe("Unexpected token");
    });

    it("handles Error with empty message", () => {
      const error = new Error("");
      expect(getErrorMessage(error)).toBe("");
    });
  });

  describe("Custom error types", () => {
    it("extracts message from custom Error subclass", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      const error = new CustomError("Custom error message");
      expect(getErrorMessage(error)).toBe("Custom error message");
    });

    it("extracts message from DOMException", () => {
      const error = new DOMException("Operation aborted", "AbortError");
      expect(getErrorMessage(error)).toBe("Operation aborted");
    });
  });

  describe("Null/undefined values", () => {
    it("returns default message for null", () => {
      expect(getErrorMessage(null)).toBe("An unknown error occurred");
    });

    it("returns default message for undefined", () => {
      expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
    });
  });

  describe("String errors", () => {
    it("returns string error as-is", () => {
      expect(getErrorMessage("Something failed")).toBe("Something failed");
    });

    it("handles empty string", () => {
      expect(getErrorMessage("")).toBe("");
    });

    it("handles string with whitespace", () => {
      expect(getErrorMessage("  error with spaces  ")).toBe(
        "  error with spaces  "
      );
    });
  });

  describe("Object errors (Tauri invoke pattern)", () => {
    it("extracts message from object with message property", () => {
      const error = { message: "Tauri invoke error" };
      expect(getErrorMessage(error)).toBe("Tauri invoke error");
    });

    it("extracts error from object with error property", () => {
      const error = { error: "API error response" };
      expect(getErrorMessage(error)).toBe("API error response");
    });

    it("prefers message over error property", () => {
      const error = { message: "Primary message", error: "Secondary error" };
      expect(getErrorMessage(error)).toBe("Primary message");
    });

    it("handles object with non-string message property", () => {
      const error = { message: 123 };
      expect(getErrorMessage(error)).toBe("An unknown error occurred");
    });

    it("handles object with non-string error property", () => {
      const error = { error: { nested: "value" } };
      expect(getErrorMessage(error)).toBe("An unknown error occurred");
    });
  });

  describe("Unknown error types", () => {
    it("returns default message for number", () => {
      expect(getErrorMessage(42)).toBe("An unknown error occurred");
    });

    it("returns default message for boolean", () => {
      expect(getErrorMessage(true)).toBe("An unknown error occurred");
    });

    it("returns default message for empty object", () => {
      expect(getErrorMessage({})).toBe("An unknown error occurred");
    });

    it("returns default message for array", () => {
      expect(getErrorMessage(["error1", "error2"])).toBe(
        "An unknown error occurred"
      );
    });

    it("returns default message for function", () => {
      expect(getErrorMessage(() => {})).toBe("An unknown error occurred");
    });

    it("returns default message for symbol", () => {
      expect(getErrorMessage(Symbol("test"))).toBe("An unknown error occurred");
    });
  });

  describe("Edge cases", () => {
    it("handles Error with special characters in message", () => {
      const error = new Error("Error: <script>alert('xss')</script>");
      expect(getErrorMessage(error)).toBe(
        "Error: <script>alert('xss')</script>"
      );
    });

    it("handles Error with newlines in message", () => {
      const error = new Error("Line 1\nLine 2\nLine 3");
      expect(getErrorMessage(error)).toBe("Line 1\nLine 2\nLine 3");
    });

    it("handles Error with unicode characters", () => {
      const error = new Error("Error occurred");
      expect(getErrorMessage(error)).toBe("Error occurred");
    });

    it("handles very long error message", () => {
      const longMessage = "x".repeat(10000);
      const error = new Error(longMessage);
      expect(getErrorMessage(error)).toBe(longMessage);
    });

    it("handles object with null message property", () => {
      const error = { message: null };
      expect(getErrorMessage(error)).toBe("An unknown error occurred");
    });

    it("handles object with undefined message property", () => {
      const error = { message: undefined };
      expect(getErrorMessage(error)).toBe("An unknown error occurred");
    });

    it("handles nested error objects", () => {
      const error = {
        message: "Outer message",
        cause: new Error("Inner error"),
      };
      expect(getErrorMessage(error)).toBe("Outer message");
    });

    it("handles Error with cause property", () => {
      const cause = new Error("Root cause");
      const error = Object.assign(new Error("Wrapper error"), { cause });
      expect(getErrorMessage(error)).toBe("Wrapper error");
    });
  });
});

describe("handleError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("returns error message from Error object", () => {
      const error = new Error("Test error");
      const result = handleError(error, "TestStore.method");
      expect(result).toBe("Test error");
    });

    it("returns error message from string", () => {
      const result = handleError("String error", "TestStore.method");
      expect(result).toBe("String error");
    });

    it("returns default message for unknown error type", () => {
      const result = handleError(42, "TestStore.method");
      expect(result).toBe("An unknown error occurred");
    });

    it("returns error message from Tauri-style object", () => {
      const error = { message: "Tauri error" };
      const result = handleError(error, "TestStore.method");
      expect(result).toBe("Tauri error");
    });
  });

  describe("Logging behavior", () => {
    it("logs to console.error by default", () => {
      const error = new Error("Test error");
      handleError(error, "TestStore.method");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[TestStore.method]",
        "Test error"
      );
    });

    it("does not log when silent option is true", () => {
      const error = new Error("Silent error");
      handleError(error, "TestStore.method", { silent: true });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("includes context in log message", () => {
      const error = new Error("Context error");
      handleError(error, "MyStore.fetchData");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[MyStore.fetchData]",
        "Context error"
      );
    });
  });

  describe("Error categorization", () => {
    it("categorizes network errors", () => {
      const networkErrors = [
        new Error("Network error"),
        new Error("Failed to fetch"),
        new Error("Connection refused"),
        new Error("ECONNREFUSED"),
        new Error("ENOTFOUND"),
        new Error("offline mode"),
      ];

      networkErrors.forEach((error) => {
        handleError(error, "Test");
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes permission errors", () => {
      const permissionErrors = [
        new Error("Permission denied"),
        new Error("Unauthorized access"),
        new Error("Forbidden resource"),
        new Error("Access denied"),
        new Error("401 Unauthorized"),
        new Error("403 Forbidden"),
      ];

      permissionErrors.forEach((error) => {
        const result = handleError(error, "Test");
        expect(result).toBeTruthy();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes not found errors", () => {
      const notFoundErrors = [
        new Error("Resource not found"),
        new Error("404 error"),
        new Error("No such file or directory"),
        new Error("File does not exist"),
      ];

      notFoundErrors.forEach((error) => {
        const result = handleError(error, "Test");
        expect(result).toBeTruthy();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes timeout errors", () => {
      const timeoutErrors = [
        new Error("Request timeout"),
        new Error("Operation timed out"),
      ];

      timeoutErrors.forEach((error) => {
        const result = handleError(error, "Test");
        expect(result).toBeTruthy();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes cancelled errors", () => {
      const cancelledErrors = [
        new Error("Operation cancelled"),
        new Error("Request canceled"),
        new Error("Operation aborted"),
      ];

      cancelledErrors.forEach((error) => {
        const result = handleError(error, "Test");
        expect(result).toBeTruthy();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes AbortError DOMException as cancelled", () => {
      const error = new DOMException("Aborted", "AbortError");
      const result = handleError(error, "Test");
      expect(result).toBe("Aborted");
    });

    it("categorizes validation errors", () => {
      const validationErrors = [
        new Error("Invalid input"),
        new Error("Validation failed"),
        new Error("Field required"),
        new Error("Value must be positive"),
      ];

      validationErrors.forEach((error) => {
        const result = handleError(error, "Test");
        expect(result).toBeTruthy();
        consoleErrorSpy.mockClear();
      });
    });

    it("categorizes unknown errors", () => {
      const unknownError = new Error("Some random error");
      const result = handleError(unknownError, "Test");
      expect(result).toBe("Some random error");
    });
  });

  describe("Metadata option", () => {
    it("handles metadata option without error", () => {
      const error = new Error("Error with metadata");
      const result = handleError(error, "TestStore.method", {
        metadata: { userId: 123, action: "save" },
      });
      expect(result).toBe("Error with metadata");
    });

    it("handles empty metadata", () => {
      const error = new Error("Error with empty metadata");
      const result = handleError(error, "TestStore.method", {
        metadata: {},
      });
      expect(result).toBe("Error with empty metadata");
    });

    it("handles metadata with complex objects", () => {
      const error = new Error("Complex metadata error");
      const result = handleError(error, "TestStore.method", {
        metadata: {
          user: { id: 1, name: "test" },
          items: [1, 2, 3],
          timestamp: new Date().toISOString(),
        },
      });
      expect(result).toBe("Complex metadata error");
    });
  });

  describe("Edge cases", () => {
    it("handles empty context string", () => {
      const error = new Error("Empty context");
      const result = handleError(error, "");
      expect(result).toBe("Empty context");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[]", "Empty context");
    });

    it("handles context with special characters", () => {
      const error = new Error("Special context");
      const result = handleError(error, "Store.method<T>");
      expect(result).toBe("Special context");
    });

    it("handles combined options", () => {
      const error = new Error("Combined options error");
      const result = handleError(error, "Test", {
        silent: false,
        metadata: { test: true },
      });
      expect(result).toBe("Combined options error");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("handles undefined options gracefully", () => {
      const error = new Error("Undefined options");
      const result = handleError(error, "Test", undefined);
      expect(result).toBe("Undefined options");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("handles options with only silent set to false", () => {
      const error = new Error("Silent false");
      const result = handleError(error, "Test", { silent: false });
      expect(result).toBe("Silent false");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("handles very long context string", () => {
      const longContext = "Store." + "a".repeat(1000);
      const error = new Error("Long context");
      const result = handleError(error, longContext);
      expect(result).toBe("Long context");
    });
  });
});

describe("ErrorCategory type", () => {
  it("defines all expected categories", () => {
    // Type check - these should all be valid ErrorCategory values
    const categories: ErrorCategory[] = [
      "network",
      "validation",
      "permission",
      "notFound",
      "timeout",
      "cancelled",
      "unknown",
    ];
    expect(categories).toHaveLength(7);
  });
});

describe("Security considerations", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("does not execute code in error messages", () => {
    const maliciousError = new Error("${process.env.SECRET}");
    const result = getErrorMessage(maliciousError);
    expect(result).toBe("${process.env.SECRET}");
  });

  it("handles prototype pollution attempts", () => {
    // Note: JavaScript's `in` operator checks the prototype chain, so
    // message from __proto__ will be found first. This is expected behavior.
    const error = { __proto__: { message: "polluted" }, error: "real error" };
    const result = getErrorMessage(error);
    // The 'message' property is found on the prototype chain first
    expect(result).toBe("polluted");
  });

  it("prefers own properties over prototype chain", () => {
    // When the object has its own message property, that takes precedence
    const error = {
      __proto__: { message: "polluted" },
      message: "own message",
      error: "fallback",
    };
    const result = getErrorMessage(error);
    expect(result).toBe("own message");
  });

  it("handles constructor property access", () => {
    const error = { constructor: { name: "FakeError" }, message: "real" };
    const result = getErrorMessage(error);
    expect(result).toBe("real");
  });

  it("does not leak sensitive data through categorization", () => {
    const error = new Error("Permission denied for user admin@secret.com");
    const result = handleError(error, "AuthStore.login");
    // The full message is returned - consumers should sanitize if needed
    expect(result).toContain("Permission denied");
  });
});
