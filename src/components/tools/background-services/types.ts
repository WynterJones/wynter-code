export type ServiceCategory =
  | "databases"
  | "web_servers"
  | "dev_servers"
  | "message_queues"
  | "other";

export interface BackgroundService {
  pid: number;
  name: string;
  category: ServiceCategory;
  memoryBytes: number;
  cpuPercent: number;
  port: number | null;
  status: string;
  user: string;
}

export const CATEGORY_CONFIG: Record<
  ServiceCategory,
  {
    label: string;
    iconName: string;
    color: string;
  }
> = {
  databases: {
    label: "Databases",
    iconName: "Database",
    color: "text-blue-500",
  },
  web_servers: {
    label: "Web Servers",
    iconName: "Globe",
    color: "text-green-500",
  },
  dev_servers: {
    label: "Dev Servers",
    iconName: "Code",
    color: "text-yellow-500",
  },
  message_queues: {
    label: "Message Queues",
    iconName: "MessageSquare",
    color: "text-purple-500",
  },
  other: {
    label: "Other",
    iconName: "Zap",
    color: "text-gray-500",
  },
};
