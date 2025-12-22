import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

const CURATED_ICONS = [
  "FolderOpen",
  "Folder",
  "FolderGit2",
  "FolderCode",
  "Code",
  "Code2",
  "FileCode",
  "FileCode2",
  "Terminal",
  "TerminalSquare",
  "Braces",
  "Brackets",
  "Bug",
  "Wrench",
  "Settings",
  "Cog",
  "Rocket",
  "Zap",
  "Sparkles",
  "Star",
  "Heart",
  "Flame",
  "Gem",
  "Diamond",
  "Crown",
  "Trophy",
  "Target",
  "Crosshair",
  "Globe",
  "Globe2",
  "Cloud",
  "Server",
  "Database",
  "HardDrive",
  "Cpu",
  "Smartphone",
  "Monitor",
  "Laptop",
  "Gamepad2",
  "Music",
  "Video",
  "Image",
  "Camera",
  "Palette",
  "Paintbrush",
  "Pen",
  "Pencil",
  "Book",
  "BookOpen",
  "GraduationCap",
  "Lightbulb",
  "Brain",
  "Atom",
  "FlaskConical",
  "TestTube",
  "Microscope",
  "Dna",
  "Activity",
  "BarChart",
  "PieChart",
  "TrendingUp",
  "LineChart",
  "Wallet",
  "CreditCard",
  "ShoppingCart",
  "Store",
  "Package",
  "Gift",
  "Box",
  "Boxes",
  "Layers",
  "Layout",
  "LayoutGrid",
  "Grid",
  "Component",
  "Puzzle",
  "Blocks",
  "CircuitBoard",
  "Workflow",
  "GitBranch",
  "GitMerge",
  "GitPullRequest",
  "Github",
  "Gitlab",
  "Chrome",
  "Apple",
  "Bot",
  "Cat",
  "Dog",
  "Bird",
  "Fish",
  "Leaf",
  "TreePine",
  "Mountain",
  "Anchor",
  "Compass",
  "Map",
  "Navigation",
  "Send",
  "MessageSquare",
  "Mail",
  "Bell",
  "Lock",
  "Shield",
  "Key",
  "Fingerprint",
  "Eye",
  "Glasses",
  "Headphones",
  "Radio",
  "Wifi",
  "Bluetooth",
  "Power",
  "Battery",
  "Sun",
  "Moon",
  "CloudSun",
  "Umbrella",
  "Snowflake",
  "Coffee",
  "Beer",
  "Wine",
  "Pizza",
  "Cookie",
  "Cake",
  "IceCream",
  "Candy",
] as const;

export interface IconPickerProps {
  selectedIcon?: string;
  onSelectIcon: (icon: string) => void;
  onRemoveIcon?: () => void;
}

export function IconPicker({ selectedIcon, onSelectIcon, onRemoveIcon }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return CURATED_ICONS;
    const query = searchQuery.toLowerCase();
    return CURATED_ICONS.filter((name) => name.toLowerCase().includes(query));
  }, [searchQuery]);

  const renderIcon = (iconName: string) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{
      className?: string;
    }>;
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="w-64">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <input
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {filteredIcons.map((iconName) => (
          <button
            key={iconName}
            onClick={() => onSelectIcon(iconName)}
            title={iconName}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded transition-all",
              "hover:bg-bg-hover hover:scale-110",
              selectedIcon === iconName
                ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {renderIcon(iconName)}
          </button>
        ))}
      </div>

      {filteredIcons.length === 0 && (
        <div className="text-center py-4 text-text-secondary text-sm">
          No icons found
        </div>
      )}

      {selectedIcon && onRemoveIcon && (
        <button
          onClick={onRemoveIcon}
          className="w-full mt-3 px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors border-t border-border pt-3"
        >
          Remove icon
        </button>
      )}
    </div>
  );
}
