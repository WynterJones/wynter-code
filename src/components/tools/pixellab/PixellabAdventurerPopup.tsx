/**
 * PixellabAdventurerPopup
 *
 * Wizard for creating a pixel-art adventurer via the PixelLab API:
 *   api-key -> describe -> pick (3 options) -> animate (4 emotes) -> manage.
 * The finished character is saved to the adventurerStore and can be pinned as
 * an always-on-top desktop companion, or extended with more emotes.
 */

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Sparkles, Pin, PinOff, Plus, Check, ExternalLink, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  useAdventurerStore,
  DEFAULT_EMOTES,
  type Adventurer,
  type AnimationClip,
} from "@/stores/adventurerStore";
import {
  getBalance,
  createPixelImageOptions,
  createCharacter,
  pollJob,
  animateAndCollect,
  PixelLabError,
  type BalanceInfo,
} from "@/services/pixellabClient";
import { SpriteAnimation } from "@/components/adventurer/SpriteAnimation";
import { saveFrames, clipSrcs, baseSpriteSrc } from "@/services/adventurerAssets";

interface PixellabAdventurerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "apikey" | "describe" | "pick" | "animate" | "manage";

interface EmoteProgress {
  name: string;
  status: "pending" | "running" | "done" | "error";
}

function errorMessage(e: unknown): string {
  if (e instanceof PixelLabError) {
    switch (e.code) {
      case "auth":
        return "Invalid API key — check your PixelLab key and try again.";
      case "credits":
        return "Not enough PixelLab credits for this request.";
      case "rate_limit":
        return "PixelLab is rate-limiting requests — wait a moment and retry.";
      default:
        return e.message || "PixelLab request failed.";
    }
  }
  return e instanceof Error ? e.message : String(e);
}

export function PixellabAdventurerPopup({ isOpen, onClose }: PixellabAdventurerPopupProps) {
  const apiKey = useAdventurerStore((s) => s.apiKey);
  const setApiKey = useAdventurerStore((s) => s.setApiKey);
  const adventurers = useAdventurerStore((s) => s.adventurers);
  const pinnedId = useAdventurerStore((s) => s.pinnedId);
  const addAdventurer = useAdventurerStore((s) => s.addAdventurer);
  const addAnimation = useAdventurerStore((s) => s.addAnimation);
  const setPinned = useAdventurerStore((s) => s.setPinned);

  const [step, setStep] = useState<Step>("apikey");
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const [emoteProgress, setEmoteProgress] = useState<EmoteProgress[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [newEmote, setNewEmote] = useState("");
  const [regenName, setRegenName] = useState<string | null>(null);

  const savedAdventurer = adventurers.find((a) => a.id === savedId) ?? null;

  // When opening, jump past the api-key step if a key is already stored.
  useEffect(() => {
    if (isOpen) {
      setKeyDraft(apiKey);
      setStep(apiKey ? "describe" : "apikey");
      setError(null);
    }
  }, [isOpen, apiKey]);

  const handleValidateKey = async () => {
    setError(null);
    setBusy(true);
    try {
      const info = await getBalance(keyDraft);
      setBalance(info);
      setApiKey(keyDraft.trim());
      setStep("describe");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setError(null);
    setBusy(true);
    setOptions([]);
    setSelected(null);
    setStep("pick");
    try {
      const imgs = await createPixelImageOptions(apiKey, {
        description: `pixel art adventurer, ${description.trim()}`,
      });
      setOptions(imgs);
    } catch (e) {
      setError(errorMessage(e));
      setStep("describe");
    } finally {
      setBusy(false);
    }
  };

  const handleAnimate = async () => {
    if (selected === null) return;
    const sprite = options[selected];
    setError(null);
    setBusy(true);
    setStep("animate");
    setEmoteProgress(DEFAULT_EMOTES.map((n) => ({ name: n, status: "pending" })));

    // Namespace on-disk assets under the adventurer id (created up front).
    const adventurerId = crypto.randomUUID();

    try {
      // 1. Turn the chosen sprite into a reusable character.
      const job = await createCharacter(apiKey, {
        description: `pixel art adventurer, ${description.trim()}`,
        referenceImage: sprite,
      });
      await pollJob(apiKey, job.jobId);
      const characterId = job.characterId;
      if (!characterId) throw new PixelLabError(0, "PixelLab did not return a character id");

      // Persist the chosen sprite to disk for use as the base/fallback.
      const [baseSpritePath] = await saveFrames(adventurerId, "base", [sprite]);

      // 2. Generate the four default emotes sequentially (kinder on rate limits).
      const animations: AnimationClip[] = [];
      for (const emote of DEFAULT_EMOTES) {
        setEmoteProgress((prev) =>
          prev.map((p) => (p.name === emote ? { ...p, status: "running" } : p))
        );
        const clipId = crypto.randomUUID();
        try {
          const frames = await animateAndCollect(apiKey, {
            characterId,
            action: emote === "idle" ? "idle breathing" : emote,
          });
          const framePaths = await saveFrames(
            adventurerId,
            clipId,
            frames.length > 0 ? frames : [sprite]
          );
          animations.push({
            id: clipId,
            name: emote,
            framePaths,
            fps: emote === "idle" ? 4 : 6,
          });
          setEmoteProgress((prev) =>
            prev.map((p) => (p.name === emote ? { ...p, status: "done" } : p))
          );
        } catch (e) {
          setEmoteProgress((prev) =>
            prev.map((p) => (p.name === emote ? { ...p, status: "error" } : p))
          );
          // Fall back to a static frame so the emote still exists.
          const framePaths = await saveFrames(adventurerId, clipId, [sprite]);
          animations.push({ id: clipId, name: emote, framePaths, fps: 4 });
        }
      }

      const adventurer: Adventurer = {
        id: adventurerId,
        name: name.trim() || "Adventurer",
        pixellabCharacterId: characterId,
        baseSpritePath,
        animations,
        createdAt: Date.now(),
      };
      addAdventurer(adventurer);
      setSavedId(adventurer.id);
      setStep("manage");
    } catch (e) {
      setError(errorMessage(e));
      setStep("pick");
    } finally {
      setBusy(false);
    }
  };

  const handleAddEmote = async () => {
    if (!newEmote.trim() || !savedAdventurer) return;
    const action = newEmote.trim();
    setError(null);
    setBusy(true);
    try {
      const frames = await animateAndCollect(apiKey, {
        characterId: savedAdventurer.pixellabCharacterId,
        action,
      });
      const clipId = crypto.randomUUID();
      const framePaths =
        frames.length > 0
          ? await saveFrames(savedAdventurer.id, clipId, frames)
          : savedAdventurer.baseSpritePath
            ? [savedAdventurer.baseSpritePath]
            : [];
      addAnimation(savedAdventurer.id, {
        id: clipId,
        name: action,
        framePaths,
        fps: 6,
      });
      setNewEmote("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Regenerate a single emote's frames (also repairs older broken clips).
  const handleRegenerate = async (clip: AnimationClip) => {
    if (!savedAdventurer) return;
    setError(null);
    setRegenName(clip.name);
    try {
      const frames = await animateAndCollect(apiKey, {
        characterId: savedAdventurer.pixellabCharacterId,
        action: clip.name === "idle" ? "idle breathing" : clip.name,
      });
      const clipId = crypto.randomUUID();
      const framePaths =
        frames.length > 0
          ? await saveFrames(savedAdventurer.id, clipId, frames)
          : savedAdventurer.baseSpritePath
            ? [savedAdventurer.baseSpritePath]
            : [];
      addAnimation(savedAdventurer.id, {
        id: clipId,
        name: clip.name,
        framePaths,
        fps: clip.fps,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRegenName(null);
    }
  };

  const handlePin = async () => {
    if (!savedAdventurer) return;
    setPinned(savedAdventurer.id);
    try {
      await invoke("create_adventurer_window", { x: 200, y: 200 });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleUnpin = async () => {
    setPinned(null);
    try {
      await invoke("close_adventurer_window");
    } catch {
      /* window already closed */
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adventurer" size="xl">
      <div className="flex flex-col gap-4 p-4 overflow-auto">
        {error && (
          <ErrorBanner
            message={error}
            className="cursor-pointer"
            onClick={() => setError(null)}
          />
        )}

        {/* Step: API key */}
        {step === "apikey" && (
          <div className="flex flex-col gap-3 max-w-lg">
            <p className="text-sm text-text-secondary">
              Paste your PixelLab API key to start creating pixel-art adventurers.
            </p>
            <Input
              type="password"
              placeholder="PixelLab API key"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={handleValidateKey} disabled={busy || !keyDraft.trim()}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validate & Continue"}
              </Button>
              <a
                href="https://api.pixellab.ai/v2/docs#description/authentication"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent inline-flex items-center gap-1 hover:underline"
              >
                Get a key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Step: describe */}
        {step === "describe" && (
          <div className="flex flex-col gap-3 max-w-lg">
            {balance?.generations !== undefined && (
              <p className="text-xs text-text-secondary">
                {balance.generations} generations remaining
                {balance.plan ? ` · ${balance.plan}` : ""}
              </p>
            )}
            <label className="text-xs text-text-secondary">Name</label>
            <Input
              placeholder="Sir Reginald"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="text-xs text-text-secondary">Describe your adventurer</label>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              placeholder="a brave knight with a green cloak and a tiny sword"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={busy || !description.trim()}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Generate 3 options
              </Button>
              <Button variant="ghost" onClick={() => setStep("apikey")}>
                Change key
              </Button>
            </div>

            {adventurers.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <label className="text-xs text-text-secondary">Your adventurers</label>
                <div className="flex flex-wrap gap-2">
                  {adventurers.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSavedId(a.id);
                        setStep("manage");
                      }}
                      className="flex items-center gap-2 rounded-md border border-border bg-bg-tertiary px-2 py-1.5 hover:border-accent/50 transition-colors"
                    >
                      <SpriteAnimation
                        frames={[baseSpriteSrc(a) ?? ""].filter(Boolean)}
                        size={24}
                      />
                      <span className="text-xs text-text-primary">{a.name}</span>
                      {pinnedId === a.id && <Pin className="w-3 h-3 text-accent" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: pick */}
        {step === "pick" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">Pick your favourite, then animate it.</p>
            <div className="grid grid-cols-3 gap-3">
              {busy && options.length === 0
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md border border-border bg-bg-tertiary flex items-center justify-center"
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
                    </div>
                  ))
                : options.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`relative aspect-square rounded-md border-2 bg-bg-tertiary flex items-center justify-center transition-colors ${
                        selected === i ? "border-accent" : "border-border hover:border-accent/50"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Option ${i + 1}`}
                        className="w-3/4 h-3/4 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                      {selected === i && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleAnimate}
                disabled={busy || selected === null}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Animate (4 emotes)
              </Button>
              <Button variant="ghost" onClick={handleGenerate} disabled={busy}>
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* Step: animate progress */}
        {step === "animate" && (
          <div className="flex flex-col gap-3 max-w-sm">
            <p className="text-sm text-text-secondary">Animating your adventurer…</p>
            <ul className="flex flex-col gap-2">
              {emoteProgress.map((p) => (
                <li key={p.name} className="flex items-center gap-2 text-sm">
                  {p.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
                  {p.status === "done" && <Check className="w-4 h-4 text-accent-green" />}
                  {p.status === "error" && <span className="w-4 h-4 text-accent-red">!</span>}
                  {p.status === "pending" && <span className="w-4 h-4 text-text-secondary">·</span>}
                  <span className="capitalize">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step: manage */}
        {step === "manage" && savedAdventurer && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSavedId(null);
                    setStep("describe");
                  }}
                >
                  Back
                </Button>
                <h3 className="text-sm font-semibold text-text-primary">{savedAdventurer.name}</h3>
              </div>
              {pinnedId === savedAdventurer.id ? (
                <Button variant="secondary" onClick={handleUnpin}>
                  <PinOff className="w-4 h-4 mr-1" /> Unpin
                </Button>
              ) : (
                <Button variant="primary" onClick={handlePin}>
                  <Pin className="w-4 h-4 mr-1" /> Pin to desktop
                </Button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {savedAdventurer.animations.map((clip) => {
                const regenerating = regenName === clip.name;
                return (
                  <div
                    key={clip.id}
                    className="group relative flex flex-col items-center gap-1 rounded-md border border-border bg-bg-tertiary p-2"
                  >
                    <SpriteAnimation frames={clipSrcs(clip)} fps={clip.fps} size={72} />
                    <span className="text-xs capitalize text-text-secondary">{clip.name}</span>
                    <button
                      onClick={() => handleRegenerate(clip)}
                      disabled={busy || regenerating || regenName !== null}
                      title={`Regenerate ${clip.name}`}
                      aria-label={`Regenerate ${clip.name}`}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-bg-secondary/80 hover:bg-bg-secondary flex items-center justify-center text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {regenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {regenerating && (
                      <div className="absolute inset-0 rounded-md bg-bg-primary/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <label className="text-xs text-text-secondary">Add another emote</label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="dance, sit, facepalm…"
                  value={newEmote}
                  onChange={(e) => setNewEmote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEmote()}
                  disabled={busy}
                />
                <Button variant="primary" onClick={handleAddEmote} disabled={busy || !newEmote.trim()}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
