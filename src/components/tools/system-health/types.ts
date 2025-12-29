export interface DiskInfo {
  name: string;
  mountPoint: string;
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  usagePercent: number;
}

export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
}

export interface CpuInfo {
  usagePercent: number;
  coreCount: number;
  brand: string;
}

export interface SystemResourcesInfo {
  memory: MemoryInfo;
  cpu: CpuInfo;
  disks: DiskInfo[];
}

export interface SystemCheckResults {
  // JavaScript ecosystem
  node: string | null;
  npm: string | null;
  pnpm: string | null;
  yarn: string | null;
  bun: string | null;
  // Version control
  git: string | null;
  // AI tools
  claude: string | null;
  codex: string | null;
  gemini: string | null;
  // Ruby ecosystem
  ruby: string | null;
  rails: string | null;
  bundler: string | null;
  // Python ecosystem
  python: string | null;
  pip: string | null;
  // Systems languages
  go: string | null;
  rust: string | null;
  cargo: string | null;
  // Containers & Package managers
  docker: string | null;
  homebrew: string | null;
}
