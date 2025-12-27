import { useState, useCallback, useMemo, KeyboardEvent } from "react";
import {
  Youtube,
  Heart,
  History,
  Trash2,
  Play,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  Pause,
  FolderPlus,
  Tag,
  Shuffle,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import type { PanelContentProps, YouTubeVideo, YouTubeCategory } from "@/types/panel";

type TabType = "player" | "history" | "favorites";

const MAX_HISTORY = 50;

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  // Direct video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function YouTubeEmbedPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath: _projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("player");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);
  const [assigningVideoId, setAssigningVideoId] = useState<string | null>(null);

  const currentVideoId = panel.youtubeVideoId || "";
  const history = panel.youtubeHistory || [];
  const favorites = panel.youtubeFavorites || [];
  const categories = panel.youtubeCategories || [];
  const isPlaylistActive = panel.youtubeFavoritesPlaylistActive || false;
  const playlistCategory = panel.youtubeFavoritesPlaylistCategory;
  const playlistIndex = panel.youtubeFavoritesPlaylistIndex ?? 0;

  // Get filtered favorites based on current category filter or playlist category
  const getFilteredFavorites = useCallback((categoryId?: string) => {
    if (!categoryId) return favorites;
    return favorites.filter((v) => v.categoryId === categoryId);
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    return getFilteredFavorites(selectedCategoryFilter);
  }, [getFilteredFavorites, selectedCategoryFilter]);

  const playlistFavorites = useMemo(() => {
    return getFilteredFavorites(playlistCategory);
  }, [getFilteredFavorites, playlistCategory]);

  const isFavorite = useMemo(() => {
    return favorites.some((v) => v.videoId === currentVideoId);
  }, [favorites, currentVideoId]);

  const currentFavorite = useMemo(() => {
    return favorites.find((v) => v.videoId === currentVideoId);
  }, [favorites, currentVideoId]);

  const addToHistory = useCallback(
    (videoId: string, title?: string) => {
      const newVideo: YouTubeVideo = {
        videoId,
        title: title || `Video ${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        addedAt: Date.now(),
      };

      const filtered = history.filter((v) => v.videoId !== videoId);
      const newHistory = [newVideo, ...filtered].slice(0, MAX_HISTORY);
      onPanelUpdate({ youtubeHistory: newHistory });
    },
    [history, onPanelUpdate]
  );

  const handleNavigate = useCallback(() => {
    const videoId = extractVideoId(inputUrl);

    if (videoId) {
      addToHistory(videoId);
      onPanelUpdate({
        youtubeVideoId: videoId,
        youtubeFavoritesPlaylistActive: false,
        title: `YouTube`,
      });
      setInputUrl("");
      setActiveTab("player");
    }
  }, [inputUrl, addToHistory, onPanelUpdate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleNavigate();
      }
    },
    [handleNavigate]
  );

  const handlePlayVideo = useCallback(
    (video: YouTubeVideo, fromPlaylist = false, index?: number) => {
      addToHistory(video.videoId, video.title);
      if (fromPlaylist && index !== undefined) {
        onPanelUpdate({
          youtubeVideoId: video.videoId,
          youtubeFavoritesPlaylistIndex: index,
          title: `YouTube`,
        });
      } else {
        onPanelUpdate({
          youtubeVideoId: video.videoId,
          youtubeFavoritesPlaylistActive: false,
          title: `YouTube`,
        });
      }
      setActiveTab("player");
    },
    [addToHistory, onPanelUpdate]
  );

  const handleToggleFavorite = useCallback(() => {
    if (!currentVideoId) return;

    if (isFavorite) {
      onPanelUpdate({
        youtubeFavorites: favorites.filter((v) => v.videoId !== currentVideoId),
      });
    } else {
      const historyItem = history.find((v) => v.videoId === currentVideoId);
      const newFavorite: YouTubeVideo = historyItem || {
        videoId: currentVideoId,
        title: `Video ${currentVideoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${currentVideoId}/mqdefault.jpg`,
        addedAt: Date.now(),
      };
      onPanelUpdate({
        youtubeFavorites: [newFavorite, ...favorites],
      });
    }
  }, [currentVideoId, isFavorite, favorites, history, onPanelUpdate]);

  const handleRemoveFromFavorites = useCallback(
    (videoId: string) => {
      onPanelUpdate({
        youtubeFavorites: favorites.filter((v) => v.videoId !== videoId),
      });
    },
    [favorites, onPanelUpdate]
  );

  const handleClearHistory = useCallback(() => {
    onPanelUpdate({ youtubeHistory: [] });
  }, [onPanelUpdate]);

  const handleRemoveFromHistory = useCallback(
    (videoId: string) => {
      onPanelUpdate({
        youtubeHistory: history.filter((v) => v.videoId !== videoId),
      });
    },
    [history, onPanelUpdate]
  );

  // Category management
  const handleCreateCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;

    const newCategory: YouTubeCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      createdAt: Date.now(),
    };

    onPanelUpdate({
      youtubeCategories: [...categories, newCategory],
    });
    setNewCategoryName("");
    setShowNewCategory(false);
  }, [newCategoryName, categories, onPanelUpdate]);

  const handleRenameCategory = useCallback(
    (categoryId: string) => {
      if (!editingCategoryName.trim()) return;

      onPanelUpdate({
        youtubeCategories: categories.map((c) =>
          c.id === categoryId ? { ...c, name: editingCategoryName.trim() } : c
        ),
      });
      setEditingCategoryId(null);
      setEditingCategoryName("");
    },
    [editingCategoryName, categories, onPanelUpdate]
  );

  const handleDeleteCategory = useCallback(
    (categoryId: string) => {
      // Remove category and unassign from all favorites
      onPanelUpdate({
        youtubeCategories: categories.filter((c) => c.id !== categoryId),
        youtubeFavorites: favorites.map((v) =>
          v.categoryId === categoryId ? { ...v, categoryId: undefined } : v
        ),
      });
      if (selectedCategoryFilter === categoryId) {
        setSelectedCategoryFilter(undefined);
      }
    },
    [categories, favorites, selectedCategoryFilter, onPanelUpdate]
  );

  const handleAssignCategory = useCallback(
    (videoId: string, categoryId: string | undefined) => {
      onPanelUpdate({
        youtubeFavorites: favorites.map((v) =>
          v.videoId === videoId ? { ...v, categoryId } : v
        ),
      });
      setAssigningVideoId(null);
    },
    [favorites, onPanelUpdate]
  );

  // Playlist controls
  const handleStartPlaylist = useCallback(
    (categoryId?: string, shuffle = false) => {
      const targetFavorites = getFilteredFavorites(categoryId);
      if (targetFavorites.length === 0) return;

      let startIndex = 0;
      if (shuffle) {
        startIndex = Math.floor(Math.random() * targetFavorites.length);
      }

      const video = targetFavorites[startIndex];
      addToHistory(video.videoId, video.title);
      onPanelUpdate({
        youtubeVideoId: video.videoId,
        youtubeFavoritesPlaylistActive: true,
        youtubeFavoritesPlaylistCategory: categoryId,
        youtubeFavoritesPlaylistIndex: startIndex,
        title: `YouTube`,
      });
      setActiveTab("player");
    },
    [getFilteredFavorites, addToHistory, onPanelUpdate]
  );

  const handleStopPlaylist = useCallback(() => {
    onPanelUpdate({
      youtubeFavoritesPlaylistActive: false,
      youtubeFavoritesPlaylistCategory: undefined,
      youtubeFavoritesPlaylistIndex: undefined,
    });
  }, [onPanelUpdate]);

  const handlePlaylistNav = useCallback(
    (direction: "prev" | "next") => {
      if (!isPlaylistActive || playlistFavorites.length === 0) return;

      const newIndex =
        direction === "next"
          ? (playlistIndex + 1) % playlistFavorites.length
          : (playlistIndex - 1 + playlistFavorites.length) % playlistFavorites.length;

      const video = playlistFavorites[newIndex];
      addToHistory(video.videoId, video.title);
      onPanelUpdate({
        youtubeVideoId: video.videoId,
        youtubeFavoritesPlaylistIndex: newIndex,
      });
    },
    [isPlaylistActive, playlistFavorites, playlistIndex, addToHistory, onPanelUpdate]
  );

  const handleOpenExternal = useCallback(() => {
    if (currentVideoId) {
      open(`https://www.youtube.com/watch?v=${currentVideoId}`);
    }
  }, [currentVideoId]);

  const getCategoryName = useCallback(
    (categoryId?: string) => {
      if (!categoryId) return null;
      return categories.find((c) => c.id === categoryId)?.name;
    },
    [categories]
  );

  const renderVideoCard = (
    video: YouTubeVideo,
    onRemove?: () => void,
    showCategoryAssign = false,
    isInPlaylist = false,
    playlistIdx?: number
  ) => (
    <div
      key={video.videoId}
      className={cn(
        "flex gap-2 p-2 rounded-md hover:bg-bg-hover group",
        isInPlaylist && playlistIdx === playlistIndex && isPlaylistActive && "bg-accent/10 border border-accent/30"
      )}
    >
      <button
        onClick={() => handlePlayVideo(video, isInPlaylist, playlistIdx)}
        className="relative flex-shrink-0 w-24 h-14 rounded overflow-hidden bg-bg-tertiary"
      >
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-6 h-6 text-white" fill="white" />
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary truncate">{video.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-[10px] text-text-secondary/50">
            {new Date(video.addedAt).toLocaleDateString()}
          </p>
          {video.categoryId && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-accent/20 text-accent">
              {getCategoryName(video.categoryId)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showCategoryAssign && (
          <div className="relative">
            <button
              onClick={() => setAssigningVideoId(assigningVideoId === video.videoId ? null : video.videoId)}
              className={cn(
                "p-1 rounded hover:bg-bg-tertiary transition-colors",
                video.categoryId ? "text-accent" : "text-text-secondary/60 hover:text-text-primary"
              )}
              title="Assign category"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
            {assigningVideoId === video.videoId && (
              <div className="absolute right-0 top-full mt-1 bg-bg-secondary border border-border rounded-md shadow-lg z-20 min-w-[140px] py-1">
                <button
                  onClick={() => handleAssignCategory(video.videoId, undefined)}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs text-left hover:bg-bg-hover",
                    !video.categoryId ? "text-accent" : "text-text-secondary"
                  )}
                >
                  No category
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleAssignCategory(video.videoId, cat.id)}
                    className={cn(
                      "w-full px-3 py-1.5 text-xs text-left hover:bg-bg-hover truncate",
                      video.categoryId === cat.id ? "text-accent" : "text-text-primary"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary/60 hover:text-red-400"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  // No video - show input prompt
  if (!currentVideoId) {
    return (
      <OverlayScrollbarsComponent
        className="h-full w-full"
        options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
      >
        <div className="h-full w-full flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 bg-bg-tertiary/50">
            {(
              [
                { id: "player", icon: Youtube, label: "Player" },
                { id: "history", icon: History, label: "History" },
                { id: "favorites", icon: Heart, label: "Favorites" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                  activeTab === id
                    ? "bg-accent/20 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {activeTab === "player" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
              <Youtube className="w-10 h-10 text-red-500/50" />
              <p className="text-sm text-text-secondary">
                Paste a YouTube URL or video ID
              </p>
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://youtube.com/watch?v=..."
                  className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-lg",
                    "bg-bg-secondary border border-border",
                    "text-text-primary placeholder-text-secondary/50",
                    "focus:outline-none focus:ring-1 focus:ring-red-500/50"
                  )}
                  autoFocus
                />
                <button
                  onClick={handleNavigate}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Play
                </button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                <span className="text-xs text-text-secondary">
                  {history.length} videos
                </span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-text-secondary hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <OverlayScrollbarsComponent
                className="flex-1"
                options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
              >
                <div className="p-2 space-y-1">
                  {history.length === 0 ? (
                    <p className="text-xs text-text-secondary/50 text-center py-8">
                      No watch history yet
                    </p>
                  ) : (
                    history.map((video) =>
                      renderVideoCard(video, () => handleRemoveFromHistory(video.videoId))
                    )
                  )}
                </div>
              </OverlayScrollbarsComponent>
            </div>
          )}

          {activeTab === "favorites" && renderFavoritesTab()}
        </div>
      </OverlayScrollbarsComponent>
    );
  }

  function renderFavoritesTab() {
    return (
      <div className="flex-1 flex flex-col">
        {/* Category filter bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <button
              onClick={() => setSelectedCategoryFilter(undefined)}
              className={cn(
                "px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors",
                !selectedCategoryFilter
                  ? "bg-accent text-primary-950"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              )}
            >
              All ({favorites.length})
            </button>
            {categories.map((cat) => {
              const count = favorites.filter((v) => v.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="flex items-center group/cat">
                  {editingCategoryId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameCategory(cat.id);
                          if (e.key === "Escape") {
                            setEditingCategoryId(null);
                            setEditingCategoryName("");
                          }
                        }}
                        className="px-2 py-0.5 text-[10px] bg-bg-secondary border border-border rounded text-text-primary w-20"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameCategory(cat.id)}
                        className="p-0.5 text-accent"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={cn(
                          "px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors",
                          selectedCategoryFilter === cat.id
                            ? "bg-accent text-primary-950"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        )}
                      >
                        {cat.name} ({count})
                      </button>
                      <div className="hidden group-hover/cat:flex items-center -ml-1">
                        <button
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setEditingCategoryName(cat.name);
                          }}
                          className="p-0.5 text-text-secondary/50 hover:text-text-primary"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-0.5 text-text-secondary/50 hover:text-red-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {showNewCategory ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") {
                      setShowNewCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  placeholder="Category name"
                  className="px-2 py-0.5 text-[10px] bg-bg-secondary border border-border rounded text-text-primary w-20"
                  autoFocus
                />
                <button
                  onClick={handleCreateCategory}
                  className="p-0.5 text-accent"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="p-0.5 text-text-secondary"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCategory(true)}
                className="p-1 rounded hover:bg-bg-hover text-text-secondary/60 hover:text-accent"
                title="Add category"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Playlist controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-bg-tertiary/30">
          <span className="text-[10px] text-text-secondary">Playlist:</span>
          <button
            onClick={() => handleStartPlaylist(selectedCategoryFilter)}
            disabled={filteredFavorites.length === 0}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors",
              filteredFavorites.length > 0
                ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                : "bg-bg-tertiary text-text-secondary/50 cursor-not-allowed"
            )}
          >
            <Play className="w-3 h-3" />
            Play {selectedCategoryFilter ? getCategoryName(selectedCategoryFilter) : "All"}
          </button>
          <button
            onClick={() => handleStartPlaylist(selectedCategoryFilter, true)}
            disabled={filteredFavorites.length === 0}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors",
              filteredFavorites.length > 0
                ? "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
                : "bg-bg-tertiary text-text-secondary/50 cursor-not-allowed"
            )}
          >
            <Shuffle className="w-3 h-3" />
            Shuffle
          </button>
        </div>

        {/* Favorites list */}
        <OverlayScrollbarsComponent
          className="flex-1"
          options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
        >
          <div className="p-2 space-y-1">
            {filteredFavorites.length === 0 ? (
              <p className="text-xs text-text-secondary/50 text-center py-8">
                {favorites.length === 0
                  ? "No favorites yet. Click the heart icon while watching to add favorites."
                  : "No favorites in this category."}
              </p>
            ) : (
              filteredFavorites.map((video, idx) =>
                renderVideoCard(
                  video,
                  () => handleRemoveFromFavorites(video.videoId),
                  true,
                  isPlaylistActive && playlistCategory === selectedCategoryFilter,
                  idx
                )
              )
            )}
          </div>
        </OverlayScrollbarsComponent>
      </div>
    );
  }

  // Video is playing
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30 bg-bg-tertiary/50">
        {/* Tabs */}
        {(
          [
            { id: "player", icon: Youtube, label: "Player" },
            { id: "history", icon: History, label: "History" },
            { id: "favorites", icon: Heart, label: "Favorites" },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              activeTab === id
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Playlist controls when active */}
        {isPlaylistActive && playlistFavorites.length > 0 && (
          <div className="flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-green-600/20">
            <button
              onClick={() => handlePlaylistNav("prev")}
              className="p-0.5 rounded hover:bg-green-600/30 text-green-400"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-green-400 min-w-[40px] text-center">
              {playlistIndex + 1}/{playlistFavorites.length}
            </span>
            <button
              onClick={() => handlePlaylistNav("next")}
              className="p-0.5 rounded hover:bg-green-600/30 text-green-400"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleStopPlaylist}
              className="p-0.5 rounded hover:bg-red-600/30 text-red-400 ml-1"
              title="Stop playlist"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Current category badge */}
        {currentFavorite?.categoryId && (
          <span className="px-1.5 py-0.5 text-[9px] rounded bg-accent/20 text-accent mr-2">
            {getCategoryName(currentFavorite.categoryId)}
          </span>
        )}

        {/* URL input */}
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste URL..."
            className={cn(
              "w-full px-2 py-0.5 text-xs rounded",
              "bg-bg-secondary/50 border border-border/50",
              "text-text-primary placeholder-text-secondary/50",
              "focus:outline-none focus:border-red-500/50"
            )}
          />
        </div>

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "p-1 rounded transition-colors",
            isFavorite
              ? "text-red-500 hover:text-red-400"
              : "text-text-secondary hover:text-red-500"
          )}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className="w-3.5 h-3.5" fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {/* External link */}
        <button
          onClick={handleOpenExternal}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Open in browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content area */}
      {activeTab === "player" ? (
        <div className="flex-1 overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="YouTube Video"
          />
        </div>
      ) : (
        <OverlayScrollbarsComponent
          className="flex-1"
          options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
        >
          {activeTab === "history" && (
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between px-1 py-2">
                <span className="text-xs text-text-secondary">
                  {history.length} videos
                </span>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-text-secondary hover:text-red-400"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-text-secondary/50 text-center py-8">
                  No watch history yet
                </p>
              ) : (
                history.map((video) =>
                  renderVideoCard(video, () => handleRemoveFromHistory(video.videoId))
                )
              )}
            </div>
          )}

          {activeTab === "favorites" && renderFavoritesTab()}
        </OverlayScrollbarsComponent>
      )}
    </div>
  );
}
