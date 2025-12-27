import { useState, useCallback, useMemo, KeyboardEvent } from "react";
import {
  Youtube,
  Heart,
  History,
  ListVideo,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import type { PanelContentProps, YouTubeVideo, YouTubePlaylist } from "@/types/panel";

type TabType = "player" | "history" | "favorites" | "playlists";

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

function extractPlaylistId(input: string): string | null {
  const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
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
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState("");

  const currentVideoId = panel.youtubeVideoId || "";
  const history = panel.youtubeHistory || [];
  const favorites = panel.youtubeFavorites || [];
  const playlists = panel.youtubePlaylists || [];
  const currentPlaylistId = panel.youtubeCurrentPlaylist;
  const playlistIndex = panel.youtubePlaylistIndex ?? 0;

  const currentPlaylist = useMemo(() => {
    return playlists.find((p) => p.id === currentPlaylistId);
  }, [playlists, currentPlaylistId]);

  const isFavorite = useMemo(() => {
    return favorites.some((v) => v.videoId === currentVideoId);
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
    const playlistId = extractPlaylistId(inputUrl);

    if (videoId) {
      addToHistory(videoId);
      onPanelUpdate({
        youtubeVideoId: videoId,
        youtubeCurrentPlaylist: undefined,
        youtubePlaylistIndex: undefined,
        title: `YouTube`,
      });
      setInputUrl("");
      setActiveTab("player");
    } else if (playlistId) {
      // For YouTube playlists, we'll embed the playlist directly
      onPanelUpdate({
        youtubeVideoId: `videoseries?list=${playlistId}`,
        title: `YouTube Playlist`,
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
    (video: YouTubeVideo) => {
      addToHistory(video.videoId, video.title);
      onPanelUpdate({
        youtubeVideoId: video.videoId,
        youtubeCurrentPlaylist: undefined,
        youtubePlaylistIndex: undefined,
        title: `YouTube`,
      });
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

  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) return;

    const newPlaylist: YouTubePlaylist = {
      id: `playlist-${Date.now()}`,
      name: newPlaylistName.trim(),
      videos: [],
      createdAt: Date.now(),
    };

    onPanelUpdate({
      youtubePlaylists: [newPlaylist, ...playlists],
    });
    setNewPlaylistName("");
    setShowNewPlaylist(false);
  }, [newPlaylistName, playlists, onPanelUpdate]);

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      onPanelUpdate({
        youtubePlaylists: playlists.filter((p) => p.id !== playlistId),
        youtubeCurrentPlaylist:
          currentPlaylistId === playlistId ? undefined : currentPlaylistId,
      });
    },
    [playlists, currentPlaylistId, onPanelUpdate]
  );

  const handleRenamePlaylist = useCallback(
    (playlistId: string) => {
      if (!editingPlaylistName.trim()) return;

      onPanelUpdate({
        youtubePlaylists: playlists.map((p) =>
          p.id === playlistId ? { ...p, name: editingPlaylistName.trim() } : p
        ),
      });
      setEditingPlaylistId(null);
      setEditingPlaylistName("");
    },
    [editingPlaylistName, playlists, onPanelUpdate]
  );

  const handleAddToPlaylist = useCallback(
    (playlistId: string, video: YouTubeVideo) => {
      onPanelUpdate({
        youtubePlaylists: playlists.map((p) => {
          if (p.id !== playlistId) return p;
          if (p.videos.some((v) => v.videoId === video.videoId)) return p;
          return { ...p, videos: [...p.videos, video] };
        }),
      });
    },
    [playlists, onPanelUpdate]
  );

  const handleRemoveFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => {
      onPanelUpdate({
        youtubePlaylists: playlists.map((p) =>
          p.id === playlistId
            ? { ...p, videos: p.videos.filter((v) => v.videoId !== videoId) }
            : p
        ),
      });
    },
    [playlists, onPanelUpdate]
  );

  const handlePlayPlaylist = useCallback(
    (playlist: YouTubePlaylist, startIndex = 0) => {
      if (playlist.videos.length === 0) return;

      const video = playlist.videos[startIndex];
      addToHistory(video.videoId, video.title);
      onPanelUpdate({
        youtubeVideoId: video.videoId,
        youtubeCurrentPlaylist: playlist.id,
        youtubePlaylistIndex: startIndex,
        title: `YouTube - ${playlist.name}`,
      });
      setActiveTab("player");
    },
    [addToHistory, onPanelUpdate]
  );

  const handlePlaylistNav = useCallback(
    (direction: "prev" | "next") => {
      if (!currentPlaylist) return;

      const newIndex =
        direction === "next"
          ? (playlistIndex + 1) % currentPlaylist.videos.length
          : (playlistIndex - 1 + currentPlaylist.videos.length) %
            currentPlaylist.videos.length;

      const video = currentPlaylist.videos[newIndex];
      addToHistory(video.videoId, video.title);
      onPanelUpdate({
        youtubeVideoId: video.videoId,
        youtubePlaylistIndex: newIndex,
      });
    },
    [currentPlaylist, playlistIndex, addToHistory, onPanelUpdate]
  );

  const handleOpenExternal = useCallback(() => {
    if (currentVideoId) {
      open(`https://www.youtube.com/watch?v=${currentVideoId}`);
    }
  }, [currentVideoId]);

  const renderVideoCard = (
    video: YouTubeVideo,
    onRemove?: () => void,
    showAddToPlaylist = false
  ) => (
    <div
      key={video.videoId}
      className="flex gap-2 p-2 rounded-md hover:bg-bg-hover group"
    >
      <button
        onClick={() => handlePlayVideo(video)}
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
        <p className="text-[10px] text-text-secondary/50 mt-0.5">
          {new Date(video.addedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showAddToPlaylist && playlists.length > 0 && (
          <div className="relative group/add">
            <button
              className="p-1 rounded hover:bg-bg-tertiary text-text-secondary/60 hover:text-text-primary"
              title="Add to playlist"
            >
              <ListVideo className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-bg-secondary border border-border rounded-md shadow-lg z-10 hidden group-hover/add:block min-w-[120px]">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id, video)}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-bg-hover text-text-primary truncate"
                >
                  {pl.name}
                </button>
              ))}
            </div>
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
                { id: "playlists", icon: ListVideo, label: "Playlists" },
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
              <p className="text-xs text-text-secondary/60">
                Supports video URLs, shorts, and playlist URLs
              </p>
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
                      renderVideoCard(
                        video,
                        () => handleRemoveFromHistory(video.videoId),
                        true
                      )
                    )
                  )}
                </div>
              </OverlayScrollbarsComponent>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                <span className="text-xs text-text-secondary">
                  {favorites.length} favorites
                </span>
              </div>
              <OverlayScrollbarsComponent
                className="flex-1"
                options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
              >
                <div className="p-2 space-y-1">
                  {favorites.length === 0 ? (
                    <p className="text-xs text-text-secondary/50 text-center py-8">
                      No favorites yet. Click the heart icon while watching to
                      add favorites.
                    </p>
                  ) : (
                    favorites.map((video) =>
                      renderVideoCard(
                        video,
                        () => handleRemoveFromFavorites(video.videoId),
                        true
                      )
                    )
                  )}
                </div>
              </OverlayScrollbarsComponent>
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                <span className="text-xs text-text-secondary">
                  {playlists.length} playlists
                </span>
                <button
                  onClick={() => setShowNewPlaylist(true)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
              <OverlayScrollbarsComponent
                className="flex-1"
                options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
              >
                <div className="p-2 space-y-2">
                  {showNewPlaylist && (
                    <div className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-md">
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreatePlaylist();
                          if (e.key === "Escape") {
                            setShowNewPlaylist(false);
                            setNewPlaylistName("");
                          }
                        }}
                        placeholder="Playlist name"
                        className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border rounded text-text-primary"
                        autoFocus
                      />
                      <button
                        onClick={handleCreatePlaylist}
                        className="p-1 rounded bg-accent hover:bg-accent/80 text-primary-950"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewPlaylist(false);
                          setNewPlaylistName("");
                        }}
                        className="p-1 rounded hover:bg-bg-hover text-text-secondary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {playlists.length === 0 && !showNewPlaylist ? (
                    <p className="text-xs text-text-secondary/50 text-center py-8">
                      No playlists yet. Create one to save videos.
                    </p>
                  ) : (
                    playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="p-2 rounded-md bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {editingPlaylistId === playlist.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editingPlaylistName}
                                onChange={(e) =>
                                  setEditingPlaylistName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleRenamePlaylist(playlist.id);
                                  if (e.key === "Escape") {
                                    setEditingPlaylistId(null);
                                    setEditingPlaylistName("");
                                  }
                                }}
                                className="flex-1 px-2 py-0.5 text-xs bg-bg-secondary border border-border rounded text-text-primary"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenamePlaylist(playlist.id)}
                                className="p-0.5 rounded hover:bg-bg-hover text-accent"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-text-primary">
                              {playlist.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            {playlist.videos.length > 0 && (
                              <button
                                onClick={() => handlePlayPlaylist(playlist)}
                                className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
                                title="Play playlist"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingPlaylistId(playlist.id);
                                setEditingPlaylistName(playlist.name);
                              }}
                              className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlaylist(playlist.id)}
                              className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-red-400"
                              title="Delete playlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-text-secondary/50">
                          {playlist.videos.length} videos
                        </p>
                        {playlist.videos.length > 0 && (
                          <div className="mt-2 flex gap-1 overflow-x-auto">
                            {playlist.videos.slice(0, 4).map((video, idx) => (
                              <button
                                key={video.videoId}
                                onClick={() => handlePlayPlaylist(playlist, idx)}
                                className="relative flex-shrink-0 w-16 h-9 rounded overflow-hidden bg-bg-secondary"
                              >
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                            {playlist.videos.length > 4 && (
                              <div className="flex-shrink-0 w-16 h-9 rounded bg-bg-secondary flex items-center justify-center">
                                <span className="text-[10px] text-text-secondary">
                                  +{playlist.videos.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </OverlayScrollbarsComponent>
            </div>
          )}
        </div>
      </OverlayScrollbarsComponent>
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
            { id: "playlists", icon: ListVideo, label: "Playlists" },
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

        {/* Playlist navigation */}
        {currentPlaylist && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => handlePlaylistNav("prev")}
              className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-text-secondary">
              {playlistIndex + 1}/{currentPlaylist.videos.length}
            </span>
            <button
              onClick={() => handlePlaylistNav("next")}
              className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
                  renderVideoCard(
                    video,
                    () => handleRemoveFromHistory(video.videoId),
                    true
                  )
                )
              )}
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between px-1 py-2">
                <span className="text-xs text-text-secondary">
                  {favorites.length} favorites
                </span>
              </div>
              {favorites.length === 0 ? (
                <p className="text-xs text-text-secondary/50 text-center py-8">
                  No favorites yet
                </p>
              ) : (
                favorites.map((video) =>
                  renderVideoCard(
                    video,
                    () => handleRemoveFromFavorites(video.videoId),
                    true
                  )
                )
              )}
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between px-1 py-2">
                <span className="text-xs text-text-secondary">
                  {playlists.length} playlists
                </span>
                <button
                  onClick={() => setShowNewPlaylist(true)}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
              {showNewPlaylist && (
                <div className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-md">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePlaylist();
                      if (e.key === "Escape") {
                        setShowNewPlaylist(false);
                        setNewPlaylistName("");
                      }
                    }}
                    placeholder="Playlist name"
                    className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border rounded text-text-primary"
                    autoFocus
                  />
                  <button
                    onClick={handleCreatePlaylist}
                    className="p-1 rounded bg-accent hover:bg-accent/80 text-primary-950"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewPlaylist(false);
                      setNewPlaylistName("");
                    }}
                    className="p-1 rounded hover:bg-bg-hover text-text-secondary"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    currentPlaylistId === playlist.id
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-bg-tertiary/50 hover:bg-bg-tertiary"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-primary">
                      {playlist.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {playlist.videos.length > 0 && (
                        <button
                          onClick={() => handlePlayPlaylist(playlist)}
                          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-accent"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-secondary/50 mb-2">
                    {playlist.videos.length} videos
                  </p>
                  {playlist.videos.map((video, idx) => (
                    <div
                      key={video.videoId}
                      className={cn(
                        "flex items-center gap-2 p-1 rounded",
                        currentPlaylistId === playlist.id &&
                          playlistIndex === idx
                          ? "bg-accent/20"
                          : "hover:bg-bg-hover"
                      )}
                    >
                      <button
                        onClick={() => handlePlayPlaylist(playlist, idx)}
                        className="relative flex-shrink-0 w-12 h-7 rounded overflow-hidden bg-bg-secondary"
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <span className="flex-1 text-[10px] text-text-primary truncate">
                        {video.title}
                      </span>
                      <button
                        onClick={() =>
                          handleRemoveFromPlaylist(playlist.id, video.videoId)
                        }
                        className="p-0.5 rounded hover:bg-bg-tertiary text-text-secondary/50 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </OverlayScrollbarsComponent>
      )}
    </div>
  );
}
