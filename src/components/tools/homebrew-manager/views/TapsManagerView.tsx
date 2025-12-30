import { useState, useEffect } from "react";
import { GitFork, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useHomebrewStore } from "@/stores/homebrewStore";

export function TapsManagerView() {
  const { taps, isLoading, isOperating, fetchTaps, addTap, removeTap } = useHomebrewStore();
  const [newTap, setNewTap] = useState("");

  useEffect(() => {
    fetchTaps();
  }, [fetchTaps]);

  const handleAddTap = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTap.trim()) {
      addTap(newTap.trim()).then((success) => {
        if (success) setNewTap("");
      });
    }
  };

  const officialTaps = taps.filter((t) => t.isOfficial);
  const thirdPartyTaps = taps.filter((t) => !t.isOfficial);

  return (
    <div className="p-4 space-y-6">
      {/* Add tap form */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Add New Tap</label>
        <form onSubmit={handleAddTap} className="flex gap-2">
          <Input
            type="text"
            placeholder="user/repo (e.g., homebrew/cask-fonts)"
            value={newTap}
            onChange={(e) => setNewTap(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isOperating || !newTap.trim()}>
            {isOperating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Tap
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      )}

      {/* Taps list */}
      {!isLoading && (
        <div className="space-y-6">
          {/* Official taps */}
          {officialTaps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <GitFork className="w-4 h-4" />
                Official Taps ({officialTaps.length})
              </h3>
              <div className="space-y-2">
                {officialTaps.map((tap) => (
                  <TapCard
                    key={tap.name}
                    tap={tap}
                    onRemove={() => removeTap(tap.name)}
                    isOperating={isOperating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Third-party taps */}
          {thirdPartyTaps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <GitFork className="w-4 h-4" />
                Third-Party Taps ({thirdPartyTaps.length})
              </h3>
              <div className="space-y-2">
                {thirdPartyTaps.map((tap) => (
                  <TapCard
                    key={tap.name}
                    tap={tap}
                    onRemove={() => removeTap(tap.name)}
                    isOperating={isOperating}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {taps.length === 0 && (
            <div className="text-center py-12">
              <GitFork className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No taps configured</p>
              <p className="text-sm text-text-tertiary mt-1">
                Add a tap to access additional packages
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TapCardProps {
  tap: { name: string; remote: string; isOfficial: boolean };
  onRemove: () => void;
  isOperating: boolean;
}

function TapCard({ tap, onRemove, isOperating }: TapCardProps) {
  return (
    <div className="group p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-lg border border-border transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-bg-tertiary">
            <GitFork className="w-4 h-4 text-text-tertiary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{tap.name}</span>
              {tap.isOfficial && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  Official
                </span>
              )}
            </div>
            <p className="text-xs text-text-tertiary truncate">{tap.remote}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Open on GitHub" side="top">
            <IconButton
              size="sm"
              onClick={() => open(tap.remote.replace(".git", ""))}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>

          <Tooltip content="Remove tap" side="top">
            <IconButton
              size="sm"
              variant="danger"
              onClick={onRemove}
              disabled={isOperating}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
