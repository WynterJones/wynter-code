import type { NightrideStationInfo, NightrideStation } from "@/types/radio";

export const NIGHTRIDE_STATIONS: NightrideStationInfo[] = [
  {
    id: "nightride",
    name: "Nightride",
    description: "Synthwave / Retrowave / Outrun",
    streamUrl: "https://stream.nightride.fm/nightride.mp3",
  },
  {
    id: "chillsynth",
    name: "Chillsynth",
    description: "Chillsynth / Chillwave / Instrumental",
    streamUrl: "https://stream.nightride.fm/chillsynth.mp3",
  },
  {
    id: "datawave",
    name: "Datawave",
    description: "Glitchy Synthwave / IDM / Retro",
    streamUrl: "https://stream.nightride.fm/datawave.mp3",
  },
  {
    id: "spacesynth",
    name: "Spacesynth",
    description: "Spacesynth / Space Disco / Vocoder",
    streamUrl: "https://stream.nightride.fm/spacesynth.mp3",
  },
  {
    id: "darksynth",
    name: "Darksynth",
    description: "Darksynth / Cyberpunk / Synthmetal",
    streamUrl: "https://stream.nightride.fm/darksynth.mp3",
  },
  {
    id: "horrorsynth",
    name: "Horrorsynth",
    description: "Horrorsynth / Witch House",
    streamUrl: "https://stream.nightride.fm/horrorsynth.mp3",
  },
  {
    id: "ebsm",
    name: "EBSM",
    description: "EBSM / Industrial / Clubbing",
    streamUrl: "https://stream.nightride.fm/ebsm.mp3",
  },
];

export function getNightrideStationBySlug(
  slug: NightrideStation
): NightrideStationInfo | undefined {
  return NIGHTRIDE_STATIONS.find((s) => s.id === slug);
}
