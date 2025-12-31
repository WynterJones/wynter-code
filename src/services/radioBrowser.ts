import type { RadioBrowserStation } from "@/types/radio";

const API_SERVERS = [
  "https://de1.api.radio-browser.info/json",
  "https://de2.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json",
];

let currentServerIndex = 0;

function getApiBase(): string {
  return API_SERVERS[currentServerIndex];
}

function rotateServer(): void {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
}

export interface RadioSearchParams {
  name?: string;
  tag?: string;
  limit?: number;
  order?: "name" | "votes" | "clickcount";
}

async function fetchWithFallback(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const maxRetries = API_SERVERS.length;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${getApiBase()}${path}`, {
        ...options,
        headers: {
          "User-Agent": "WynterCode/1.0",
          ...options?.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      rotateServer();
    } catch {
      rotateServer();
    }
  }

  throw new Error("All Radio Browser API servers failed");
}

export async function searchRadioStations(
  params: RadioSearchParams
): Promise<RadioBrowserStation[]> {
  const searchParams = new URLSearchParams();

  if (params.name) searchParams.set("name", params.name);
  if (params.tag) searchParams.set("tag", params.tag);
  searchParams.set("limit", String(params.limit || 25));
  searchParams.set("order", params.order || "votes");
  searchParams.set("reverse", "true");
  searchParams.set("hidebroken", "true");

  const response = await fetchWithFallback(
    `/stations/search?${searchParams.toString()}`
  );

  return response.json();
}

export async function getTopStations(
  limit = 25
): Promise<RadioBrowserStation[]> {
  const response = await fetchWithFallback(`/stations/topvote/${limit}`);
  return response.json();
}
