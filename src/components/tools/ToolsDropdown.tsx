import { useState, useRef, useEffect } from "react";
import { Wrench, Network, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface ToolsDropdownProps {
  onOpenPortManager: () => void;
}

export function ToolsDropdown({ onOpenPortManager }: ToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tools: Tool[] = [
    {
      id: "port-manager",
      name: "Port Manager",
      description: "View and manage localhost ports",
      icon: <Network className="w-4 h-4" />,
      onClick: () => {
        onOpenPortManager();
        setIsOpen(false);
      },
    },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 200,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Tooltip content="Tools">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors",
            "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
            isOpen && "bg-bg-hover text-text-primary"
          )}
        >
          <Wrench className="w-4 h-4" />
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </button>
      </Tooltip>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-56 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="p-1">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors hover:bg-bg-hover group"
                >
                  <div className="flex-shrink-0 text-text-secondary group-hover:text-accent transition-colors">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">{tool.name}</div>
                    <div className="text-xs text-text-secondary truncate">{tool.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-border px-3 py-2">
              <p className="text-xs text-text-secondary">More tools coming soon...</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
