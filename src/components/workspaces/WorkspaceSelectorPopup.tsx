import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useProjectStore } from "@/stores/projectStore";
import type { Workspace, WorkspaceAvatar as WorkspaceAvatarType } from "@/types/workspace";
import { WORKSPACE_COLORS, createDefaultAvatar } from "@/types/workspace";
import { WorkspacePill } from "./WorkspacePill";
import { WorkspaceListItem } from "./WorkspaceListItem";
import { WorkspaceAvatar } from "./WorkspaceAvatar";
import { WorkspaceAvatarEditor } from "./WorkspaceAvatarEditor";
import { Modal } from "@/components/ui";

interface WorkspaceSelectorPopupProps {
  compact?: boolean;
}

export function WorkspaceSelectorPopup({ compact }: WorkspaceSelectorPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(WORKSPACE_COLORS[0]);
  const [newAvatar, setNewAvatar] = useState<WorkspaceAvatarType>(createDefaultAvatar());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [isChildPopupOpen, setIsChildPopupOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    workspaces,
    activeWorkspaceId,
    addWorkspace,
    removeWorkspace,
    updateWorkspace,
    setActiveWorkspace,
    reorderWorkspaces,
  } = useWorkspaceStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = workspaces.findIndex((w) => w.id === active.id);
      const newIndex = workspaces.findIndex((w) => w.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderWorkspaces(oldIndex, newIndex);
      }
    }
  };

  const draggedWorkspace = activeId
    ? workspaces.find((w) => w.id === activeId)
    : null;

  const { projects } = useProjectStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter((w) => w.name.toLowerCase().includes(query));
  }, [searchQuery, workspaces]);

  const getProjectCount = (workspace: Workspace) => {
    return workspace.projectIds.filter((id) =>
      projects.some((p) => p.id === id)
    ).length;
  };

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    } else {
      setSearchQuery("");
      setIsCreating(false);
      setEditingWorkspaceId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if a child popup (like FileBrowserPopup) is open
      if (isChildPopupOpen) return;

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
        if (isCreating) {
          setIsCreating(false);
        } else if (editingWorkspaceId) {
          setEditingWorkspaceId(null);
        } else {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isCreating, editingWorkspaceId, isChildPopupOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelectWorkspace = (id: string) => {
    setActiveWorkspace(id);
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    if (!newName.trim()) return;
    const id = addWorkspace(newName.trim(), newColor);
    // Update avatar after creation
    updateWorkspace(id, { avatar: newAvatar });
    setNewName("");
    setNewColor(WORKSPACE_COLORS[0]);
    setNewAvatar(createDefaultAvatar());
    setIsCreating(false);
  };

  const handleDeleteWorkspace = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      removeWorkspace(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const workspaceToDelete = deleteConfirmId
    ? workspaces.find((w) => w.id === deleteConfirmId)
    : null;

  return (
    <>
      <WorkspacePill
        ref={buttonRef}
        workspace={activeWorkspace}
        isOpen={isOpen}
        onClick={handleToggle}
        compact={compact}
      />

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-72 bg-bg-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 dropdown-solid"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              {(isCreating || editingWorkspaceId) && (
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingWorkspaceId(null);
                  }}
                  className="p-1 -ml-1 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {isCreating ? "New Workspace" : editingWorkspaceId ? "Edit Workspace" : "Workspaces"}
              </div>
            </div>

            {isCreating ? (
              /* Create New Workspace Form */
              <div className="p-3 space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  autoFocus
                  className="w-full px-2 py-1.5 text-sm bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateWorkspace();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                />

                <WorkspaceAvatarEditor
                  avatar={newAvatar}
                  color={newColor}
                  onAvatarChange={(updates) =>
                    setNewAvatar((prev) => ({ ...prev, ...updates }))
                  }
                  onColorChange={setNewColor}
                  onFileBrowserOpenChange={setIsChildPopupOpen}
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newName.trim()}
                    className="btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : editingWorkspaceId ? (
              /* Edit Workspace - show only the editing workspace */
              <div className="p-2">
                {workspaces
                  .filter((w) => w.id === editingWorkspaceId)
                  .map((workspace) => (
                    <WorkspaceListItem
                      key={workspace.id}
                      workspace={workspace}
                      isActive={workspace.id === activeWorkspaceId}
                      projectCount={getProjectCount(workspace)}
                      isEditing={true}
                      onSelect={() => handleSelectWorkspace(workspace.id)}
                      onUpdate={(updates) => updateWorkspace(workspace.id, updates)}
                      onDelete={() => handleDeleteWorkspace(workspace.id)}
                      onStartEdit={() => {}}
                      onStopEdit={() => setEditingWorkspaceId(null)}
                      onFileBrowserOpenChange={setIsChildPopupOpen}
                    />
                  ))}
              </div>
            ) : (
              <>
                {/* Search Input */}
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search workspaces..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                {/* Workspaces List */}
                <OverlayScrollbarsComponent
                  options={{
                    scrollbars: { theme: "os-theme-custom", autoHide: "leave", autoHideDelay: 100 },
                  }}
                  className="max-h-[350px] os-theme-custom"
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredWorkspaces.map((w) => w.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="p-2 space-y-1">
                        {filteredWorkspaces.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-text-secondary text-center">
                            {searchQuery ? "No workspaces found" : "No workspaces yet"}
                          </div>
                        ) : (
                          filteredWorkspaces.map((workspace) => (
                            <WorkspaceListItem
                              key={workspace.id}
                              workspace={workspace}
                              isActive={workspace.id === activeWorkspaceId}
                              projectCount={getProjectCount(workspace)}
                              isEditing={false}
                              isDragging={workspace.id === activeId}
                              onSelect={() => handleSelectWorkspace(workspace.id)}
                              onUpdate={(updates) => updateWorkspace(workspace.id, updates)}
                              onDelete={() => handleDeleteWorkspace(workspace.id)}
                              onStartEdit={() => setEditingWorkspaceId(workspace.id)}
                              onStopEdit={() => setEditingWorkspaceId(null)}
                              onFileBrowserOpenChange={setIsChildPopupOpen}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {draggedWorkspace && (
                        <div className="px-3 py-2 rounded-lg border border-accent bg-bg-secondary shadow-xl">
                          <div className="flex items-center gap-3">
                            <WorkspaceAvatar
                              avatar={draggedWorkspace.avatar}
                              color={draggedWorkspace.color}
                              size="md"
                            />
                            <div className="text-sm text-text-primary">{draggedWorkspace.name}</div>
                          </div>
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </OverlayScrollbarsComponent>

                {/* New Workspace Button */}
                <div className="border-t border-border">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Workspace
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId && !!workspaceToDelete}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Workspace"
        size="sm"
      >
        {workspaceToDelete && (
          <div className="p-4 space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 p-2 bg-accent-red/10 rounded-lg self-start">
                <AlertTriangle className="w-5 h-5 text-accent-red" />
              </div>
              <div className="pt-1">
                <p className="text-sm text-text-primary">
                  Are you sure you want to delete "{workspaceToDelete.name}"?
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  This will also delete {getProjectCount(workspaceToDelete)} project(s)
                  and all their sessions. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm bg-accent-red text-white rounded hover:bg-accent-red/90 transition-colors"
              >
                Delete Workspace
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
