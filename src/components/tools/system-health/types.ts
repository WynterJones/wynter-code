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
  node: string | null;
  npm: string | null;
  git: string | null;
  claude: string | null;
}
