import { useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Globe, Trash2, Loader2, ChevronRight, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";
import type { NetlifySite, SiteGroup } from "@/types/netlifyFtp";
import { GroupHeader } from "./GroupHeader";

const HOLD_DURATION = 1300; // 1.3 seconds

interface HoldToDeleteButtonProps {
  onDelete: () => void;
}

function HoldToDeleteButton({ onDelete }: HoldToDeleteButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (~60fps)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Trigger delete after hold duration
    holdTimerRef.current = setTimeout(() => {
      cleanup();
      onDelete();
    }, HOLD_DURATION);
  }, [onDelete]);

  const cleanup = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  const cancelHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    cleanup();
  }, [cleanup]);

  return (
    <div className="relative">
      <IconButton
        size="sm"
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        title="Hold to delete"
        className={cn(
          "relative overflow-hidden",
          isHolding && "!bg-accent-red/20"
        )}
      >
        {/* Progress ring */}
        {isHolding && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent-red/30"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progress * 0.628} 100`}
              className="text-accent-red transition-none"
            />
          </svg>
        )}
        <Trash2 className={cn(
          "w-3 h-3 relative z-10 transition-colors",
          isHolding ? "text-accent-red" : "text-accent-red"
        )} />
      </IconButton>
    </div>
  );
}

interface SiteItemProps {
  site: NetlifySite;
  isSelected: boolean;
  groups: SiteGroup[];
  onSelect: () => void;
  onDelete: () => void;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: () => void;
  onDragStart: (e: React.DragEvent, siteId: string) => void;
  isInGroup: boolean;
}

function SiteItem({
  site,
  isSelected,
  groups,
  onSelect,
  onDelete,
  onAddToGroup,
  onRemoveFromGroup,
  onDragStart,
  isInGroup,
}: SiteItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const displayUrl = site.custom_domain || site.url.replace(/https?:\/\//, "");

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors group",
          "hover:bg-bg-hover",
          isSelected && "bg-accent/10"
        )}
        draggable
        onDragStart={(e) => onDragStart(e, site.id)}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
      >
        {/* Screenshot thumbnail */}
        {site.screenshot_url ? (
          <img
            src={site.screenshot_url}
            alt={site.name}
            className={cn(
              "w-12 h-8 object-cover rounded border shrink-0",
              isSelected ? "border-accent" : "border-border"
            )}
          />
        ) : (
          <div className={cn(
            "w-12 h-8 rounded border shrink-0 bg-bg-tertiary flex items-center justify-center",
            isSelected ? "border-accent" : "border-border"
          )}>
            <Globe className="w-3 h-3 text-text-secondary" />
          </div>
        )}

        {/* URL only */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-xs truncate",
              isSelected ? "text-accent" : "text-text-secondary"
            )}
          >
            {displayUrl}
          </div>
        </div>

        {/* Delete button - only show on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <HoldToDeleteButton onDelete={onDelete} />
        </div>
      </div>

      {/* Context menu - rendered via portal to escape overflow:hidden */}
      {showContextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed z-[9999] bg-bg-primary border border-border rounded-md shadow-xl py-1 min-w-[140px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            {groups.length > 0 && (
              <div className="relative group/submenu">
                <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover transition-colors">
                  <span className="flex items-center gap-2">
                    <FolderPlus className="w-3 h-3" />
                    Add to Group
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                {/* Submenu */}
                <div className="absolute left-full top-0 ml-0.5 bg-bg-primary border border-border rounded-md shadow-xl py-1 min-w-[120px] hidden group-hover/submenu:block">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover transition-colors truncate"
                      onClick={() => {
                        onAddToGroup(g.id);
                        setShowContextMenu(false);
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isInGroup && (
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover transition-colors"
                onClick={() => {
                  onRemoveFromGroup();
                  setShowContextMenu(false);
                }}
              >
                Remove from Group
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

interface SiteListProps {
  sites: NetlifySite[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onDeleteSite: (siteId: string) => void;
  isLoading: boolean;
  // Group props
  groups: SiteGroup[];
  ungroupedCollapsed: boolean;
  onToggleGroupCollapse: (groupId: string) => void;
  onToggleUngroupedCollapse: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onReorderGroups: (groupIds: string[]) => void;
  onAddSiteToGroup: (siteId: string, groupId: string) => void;
  onRemoveSiteFromGroup: (siteId: string) => void;
}

export function SiteList({
  sites,
  selectedSiteId,
  onSelectSite,
  onDeleteSite,
  isLoading,
  groups,
  ungroupedCollapsed,
  onToggleGroupCollapse,
  onToggleUngroupedCollapse,
  onRenameGroup,
  onDeleteGroup,
  onReorderGroups,
  onAddSiteToGroup,
  onRemoveSiteFromGroup,
}: SiteListProps) {
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [draggingSiteId, setDraggingSiteId] = useState<string | null>(null);

  // Create a map of siteId -> groupId for quick lookup
  const siteGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      g.siteIds.forEach((siteId) => map.set(siteId, g.id));
    });
    return map;
  }, [groups]);

  // Get sites for a specific group
  const getSitesForGroup = useCallback(
    (group: SiteGroup) => {
      return group.siteIds
        .map((siteId) => sites.find((s) => s.id === siteId))
        .filter((s): s is NetlifySite => s !== undefined);
    },
    [sites]
  );

  // Get ungrouped sites
  const ungroupedSites = useMemo(() => {
    return sites.filter((s) => !siteGroupMap.has(s.id));
  }, [sites, siteGroupMap]);

  // Drag handlers for sites
  const handleSiteDragStart = (e: React.DragEvent, siteId: string) => {
    e.dataTransfer.setData("text/site-id", siteId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingSiteId(siteId);
  };

  // Drag handlers for groups
  const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
    e.dataTransfer.setData("text/group-id", groupId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingGroupId(groupId);
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the actual element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverGroupId(null);
    }
  };

  const handleGroupDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOverGroupId(null);
    setDraggingGroupId(null);
    setDraggingSiteId(null);

    // Check if dropping a site
    const siteId = e.dataTransfer.getData("text/site-id");
    if (siteId) {
      onAddSiteToGroup(siteId, targetGroupId);
      return;
    }

    // Check if dropping a group (reordering)
    const draggedGroupId = e.dataTransfer.getData("text/group-id");
    if (draggedGroupId && draggedGroupId !== targetGroupId) {
      const currentOrder = groups.map((g) => g.id);
      const dragIdx = currentOrder.indexOf(draggedGroupId);
      const targetIdx = currentOrder.indexOf(targetGroupId);

      if (dragIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(dragIdx, 1);
        newOrder.splice(targetIdx, 0, draggedGroupId);
        onReorderGroups(newOrder);
      }
    }
  };

  const handleDragEnd = () => {
    setDragOverGroupId(null);
    setDraggingGroupId(null);
    setDraggingSiteId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading sites...
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Globe className="w-8 h-8 mb-2 text-text-secondary opacity-50" />
        <div className="text-xs text-text-primary mb-1">No sites found</div>
        <div className="text-xs text-text-secondary">
          Create a new site to get started
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" onDragEnd={handleDragEnd}>
      {/* Render groups */}
      {groups.map((group) => {
        const groupSites = getSitesForGroup(group);

        return (
          <div
            key={group.id}
            className={cn(
              draggingGroupId === group.id && "opacity-50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (draggingSiteId) {
                setDragOverGroupId(group.id);
              }
            }}
            onDragLeave={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                setDragOverGroupId(null);
              }
            }}
            onDrop={(e) => handleGroupDrop(e, group.id)}
          >
            <GroupHeader
              group={group}
              siteCount={groupSites.length}
              isCollapsed={group.isCollapsed}
              onToggleCollapse={() => onToggleGroupCollapse(group.id)}
              onRename={(name) => onRenameGroup(group.id, name)}
              onDelete={() => onDeleteGroup(group.id)}
              onDragStart={handleGroupDragStart}
              onDragOver={handleGroupDragOver}
              onDragLeave={handleGroupDragLeave}
              onDrop={handleGroupDrop}
              isDragOver={dragOverGroupId === group.id && draggingSiteId !== null}
            />

            {/* Group sites */}
            {!group.isCollapsed && (
              <div className="pl-1">
                {groupSites.map((site) => (
                  <SiteItem
                    key={site.id}
                    site={site}
                    isSelected={selectedSiteId === site.id}
                    groups={groups}
                    onSelect={() => onSelectSite(site.id)}
                    onDelete={() => onDeleteSite(site.id)}
                    onAddToGroup={(gId) => onAddSiteToGroup(site.id, gId)}
                    onRemoveFromGroup={() => onRemoveSiteFromGroup(site.id)}
                    onDragStart={handleSiteDragStart}
                    isInGroup={true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Ungrouped section */}
      {ungroupedSites.length > 0 && (
        <div>
          {groups.length > 0 && (
            <div
              className={cn(
                "flex items-center gap-1 px-1 py-1.5 cursor-pointer transition-colors",
                "hover:bg-bg-hover border-l-2 border-transparent"
              )}
              onClick={onToggleUngroupedCollapse}
            >
              <div className="w-4" /> {/* Spacer for alignment */}
              <ChevronRight
                className={cn(
                  "w-3 h-3 text-text-secondary transition-transform shrink-0",
                  !ungroupedCollapsed && "rotate-90"
                )}
              />
              <span className="flex-1 min-w-0 text-xs text-text-secondary truncate">
                Ungrouped
              </span>
              <span className="text-[10px] text-text-secondary tabular-nums">
                {ungroupedSites.length}
              </span>
            </div>
          )}

          {(!ungroupedCollapsed || groups.length === 0) && (
            <div className={groups.length > 0 ? "pl-1" : ""}>
              {ungroupedSites.map((site) => (
                <SiteItem
                  key={site.id}
                  site={site}
                  isSelected={selectedSiteId === site.id}
                  groups={groups}
                  onSelect={() => onSelectSite(site.id)}
                  onDelete={() => onDeleteSite(site.id)}
                  onAddToGroup={(gId) => onAddSiteToGroup(site.id, gId)}
                  onRemoveFromGroup={() => onRemoveSiteFromGroup(site.id)}
                  onDragStart={handleSiteDragStart}
                  isInGroup={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  );
}
