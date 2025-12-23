// Audio source types for meditation
export type AudioSourceType = "nightride" | "radiobrowser" | "custom";

// Nightride.fm station identifiers
export type NightrideStation =
  | "nightride"
  | "chillsynth"
  | "datawave"
  | "spacesynth"
  | "darksynth"
  | "horrorsynth"
  | "ebsm";

// Nightride station configuration
export interface NightrideStationInfo {
  id: NightrideStation;
  name: string;
  description: string;
  streamUrl: string;
}

// Radio Browser API response type
export interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  codec: string;
  bitrate: number;
  votes: number;
}

// Saved favorite station
export interface RadioBrowserFavorite {
  stationuuid: string;
  name: string;
  streamUrl: string;
  favicon?: string;
  tags?: string;
}

// Stream metadata for now-playing info
export interface StreamMetadata {
  title?: string;
  artist?: string;
  station?: string;
}
