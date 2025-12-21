import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileType,
  Image,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileIconProps {
  name: string;
  isDirectory: boolean;
  isExpanded?: boolean;
  className?: string;
}

const extensionColors: Record<string, string> = {
  ts: "text-accent-blue",
  tsx: "text-accent-blue",
  js: "text-accent-yellow",
  jsx: "text-accent-yellow",
  json: "text-accent-yellow",
  md: "text-text-secondary",
  css: "text-accent-purple",
  scss: "text-accent-pink",
  html: "text-accent-orange",
  rs: "text-accent-orange",
  py: "text-accent-green",
  go: "text-accent-cyan",
  svg: "text-accent-yellow",
  png: "text-accent-green",
  jpg: "text-accent-green",
  gif: "text-accent-green",
};

export function FileIcon({ name, isDirectory, isExpanded, className }: FileIconProps) {
  if (isDirectory) {
    const Icon = isExpanded ? FolderOpen : Folder;
    return <Icon className={cn("w-4 h-4 text-accent-yellow", className)} />;
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const color = extensionColors[ext] || "text-text-secondary";

  let Icon = File;

  if (["ts", "tsx", "js", "jsx", "rs", "py", "go", "rb", "java", "cpp", "c", "h"].includes(ext)) {
    Icon = FileCode;
  } else if (ext === "json") {
    Icon = FileJson;
  } else if (["md", "txt", "log"].includes(ext)) {
    Icon = FileText;
  } else if (["png", "jpg", "jpeg", "gif", "svg", "ico", "webp"].includes(ext)) {
    Icon = Image;
  } else if (["css", "scss", "sass", "less"].includes(ext)) {
    Icon = FileType;
  }

  return <Icon className={cn("w-4 h-4", color, className)} />;
}
