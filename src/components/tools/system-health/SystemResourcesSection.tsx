import { Cpu, MemoryStick, HardDrive } from "lucide-react";
import { ResourceBar } from "./ResourceBar";
import type { SystemResourcesInfo } from "./types";

interface SystemResourcesSectionProps {
  resources: SystemResourcesInfo | null;
}

function formatBytes(bytes: number): string {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;

  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  }
  return `${(bytes / MB).toFixed(0)} MB`;
}

export function SystemResourcesSection({
  resources,
}: SystemResourcesSectionProps) {
  if (!resources) return null;

  const { cpu, memory, disks } = resources;

  const mainDisk = disks.find((d) => d.mountPoint === "/") || disks[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-bg-tertiary/50 border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text-primary">CPU</h3>
        </div>
        <ResourceBar
          label={cpu.brand}
          value={cpu.usagePercent}
          sublabel={`${cpu.coreCount} cores`}
          color="accent"
        />
      </div>

      <div className="rounded-lg bg-bg-tertiary/50 border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <MemoryStick className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-text-primary">Memory</h3>
        </div>
        <ResourceBar
          label="RAM"
          value={memory.usagePercent}
          sublabel={`${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`}
          color="blue"
        />
        {memory.swapTotalBytes > 0 && (
          <div className="mt-2">
            <ResourceBar
              label="Swap"
              value={(memory.swapUsedBytes / memory.swapTotalBytes) * 100}
              sublabel={`${formatBytes(memory.swapUsedBytes)} / ${formatBytes(memory.swapTotalBytes)}`}
              color="purple"
            />
          </div>
        )}
      </div>

      {mainDisk && (
        <div className="rounded-lg bg-bg-tertiary/50 border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-medium text-text-primary">Disk</h3>
          </div>
          <ResourceBar
            label={mainDisk.mountPoint}
            value={mainDisk.usagePercent}
            sublabel={`${formatBytes(mainDisk.usedBytes)} / ${formatBytes(mainDisk.totalBytes)} (${formatBytes(mainDisk.availableBytes)} free)`}
            color="green"
          />
        </div>
      )}
    </div>
  );
}
