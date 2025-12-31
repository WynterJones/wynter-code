import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

// Types matching the Rust backend
export interface PairedDevice {
  device_id: string;
  device_name: string;
  paired_at: number;
  last_seen: number;
}

export interface PairingCode {
  code: string;
  expires_at: number;
  host: string;
  port: number;
}

export interface MobileApiInfo {
  running: boolean;
  port: number;
  host: string;
}

interface MobileApiStore {
  // State
  serverInfo: MobileApiInfo | null;
  pairedDevices: PairedDevice[];
  currentPairingCode: PairingCode | null;
  loading: boolean;
  error: string | null;
  preferredPort: number;
  autoStartServer: boolean;

  // Actions
  startServer: (port?: number) => Promise<void>;
  stopServer: () => Promise<void>;
  refreshServerInfo: () => Promise<void>;
  generatePairingCode: () => Promise<PairingCode | null>;
  revokeDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  setPreferredPort: (port: number) => void;
  setAutoStartServer: (value: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const DEFAULT_PORT = 8765;

export const useMobileApiStore = create<MobileApiStore>()(
  persist(
    (set, get) => ({
      serverInfo: null,
      pairedDevices: [],
      currentPairingCode: null,
      loading: false,
      error: null,
      preferredPort: DEFAULT_PORT,
      autoStartServer: false,

      startServer: async (port?: number) => {
        set({ loading: true, error: null });
        try {
          const actualPort = port ?? get().preferredPort;
          const info = await invoke<MobileApiInfo>("mobile_api_start", {
            port: actualPort,
          });
          set({ serverInfo: info, loading: false });
          // Refresh devices list after starting
          await get().refreshDevices();
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      stopServer: async () => {
        set({ loading: true, error: null });
        try {
          await invoke("mobile_api_stop");
          set({
            serverInfo: null,
            currentPairingCode: null,
            loading: false,
          });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      refreshServerInfo: async () => {
        try {
          const info = await invoke<MobileApiInfo | null>("mobile_api_info");
          set({ serverInfo: info });
        } catch (e) {
          console.error("Failed to refresh server info:", e);
        }
      },

      generatePairingCode: async () => {
        set({ loading: true, error: null });
        try {
          const code = await invoke<PairingCode>(
            "mobile_api_generate_pairing_code"
          );
          set({ currentPairingCode: code, loading: false });
          return code;
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
          return null;
        }
      },

      revokeDevice: async (deviceId: string) => {
        set({ loading: true, error: null });
        try {
          await invoke("mobile_api_revoke_device", { deviceId });
          set((state) => ({
            pairedDevices: state.pairedDevices.filter(
              (d) => d.device_id !== deviceId
            ),
            loading: false,
          }));
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      refreshDevices: async () => {
        try {
          const devices = await invoke<PairedDevice[]>(
            "mobile_api_list_devices"
          );
          set({ pairedDevices: devices });
        } catch (e) {
          console.error("Failed to refresh devices:", e);
        }
      },

      setPreferredPort: (port: number) => {
        set({ preferredPort: port });
      },

      setAutoStartServer: (value: boolean) => {
        set({ autoStartServer: value });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          serverInfo: null,
          pairedDevices: [],
          currentPairingCode: null,
          loading: false,
          error: null,
          preferredPort: DEFAULT_PORT,
          autoStartServer: false,
        });
      },
    }),
    {
      name: "wynter-code-mobile-api",
      partialize: (state) => ({
        preferredPort: state.preferredPort,
        autoStartServer: state.autoStartServer,
      }),
    }
  )
);

// Helper to generate QR code data URL
export function generateQRCodeUrl(pairingCode: PairingCode): string {
  return `wynter://pair?code=${pairingCode.code}&host=${pairingCode.host}&port=${pairingCode.port}`;
}

// Helper to format pairing code for display (with dashes)
export function formatPairingCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

// Helper to format time ago
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}
