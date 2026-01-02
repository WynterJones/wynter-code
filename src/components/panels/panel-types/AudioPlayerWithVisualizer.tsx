import { useRef, useEffect, useCallback, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Activity,
  BarChart2,
  Circle,
  Minus,
  Music,
  Repeat,
  Shuffle,
} from "lucide-react";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { cn } from "@/lib/utils";

type VisualizerType = "wave" | "bars" | "circle" | "line";

interface AudioPlayerWithVisualizerProps {
  src: string;
  fileName: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  playlistInfo?: { current: number; total: number };
}

const VISUALIZER_TYPES: { type: VisualizerType; icon: typeof Activity; label: string }[] = [
  { type: "bars", icon: BarChart2, label: "Bars" },
  { type: "wave", icon: Activity, label: "Wave" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "line", icon: Minus, label: "Line" },
];

export function AudioPlayerWithVisualizer({
  src,
  fileName,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  playlistInfo,
}: AudioPlayerWithVisualizerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const themeColorsRef = useRef<{ primary: string; secondary: string }>({
    primary: "#94e2d5",
    secondary: "#a6e3a1",
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>("bars");
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  const { getFrequencyData } = useAudioAnalyser({
    audioElement: audioRef.current,
    fftSize: 256,
    smoothingTimeConstant: 0.85,
  });

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    themeColorsRef.current = {
      primary: style.getPropertyValue("--accent-cyan").trim() || "#94e2d5",
      secondary: style.getPropertyValue("--accent-green").trim() || "#a6e3a1",
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else if (hasNext && onNext) {
        onNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isRepeat, hasNext, onNext]);

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const sliceWidth = width / frequencyData.length;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColorsRef.current.primary;
    ctx.beginPath();
    let x = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const amplitude = v * (height * 0.4);
      const y = height / 2 - amplitude * Math.sin((i / frequencyData.length) * Math.PI);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = x - sliceWidth;
        const prevY = height / 2 - (frequencyData[i - 1] / 255.0) * (height * 0.4) * Math.sin(((i - 1) / frequencyData.length) * Math.PI);
        ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    ctx.shadowColor = themeColorsRef.current.secondary;
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const amplitude = v * (height * 0.4);
      const y = height / 2 + amplitude * Math.sin((i / frequencyData.length) * Math.PI);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = x - sliceWidth;
        const prevY = height / 2 + (frequencyData[i - 1] / 255.0) * (height * 0.4) * Math.sin(((i - 1) / frequencyData.length) * Math.PI);
        ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawBars = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const barCount = Math.min(48, frequencyData.length);
    const barWidth = (width / barCount) * 0.7;
    const gap = (width / barCount) * 0.3;

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 6;
    ctx.shadowColor = themeColorsRef.current.primary;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const v = frequencyData[dataIndex] / 255.0;
      const barHeight = v * height * 0.85;
      const x = i * (barWidth + gap) + gap / 2;
      const y = height - barHeight;
      const radius = Math.min(barWidth / 2, 4);

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, []);

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.2;

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColorsRef.current.primary;
    ctx.beginPath();

    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const angle = (i / frequencyData.length) * Math.PI * 2;
      const radius = baseRadius + v * baseRadius * 1.2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const sliceWidth = width / frequencyData.length;

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColorsRef.current.primary;
    ctx.beginPath();

    let x = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const y = height - (v * height * 0.9) - height * 0.05;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const generateSimulatedData = useCallback((length: number): Uint8Array => {
    const data = new Uint8Array(length);
    const time = Date.now() / 1000;

    for (let i = 0; i < length; i++) {
      const baseFreq = Math.sin(time * 2 + i * 0.1) * 0.3;
      const midFreq = Math.sin(time * 3.7 + i * 0.05) * 0.25;
      const highFreq = Math.sin(time * 5.3 + i * 0.15) * 0.15;
      const noise = Math.random() * 0.1;
      const freqFalloff = 1 - (i / length) * 0.6;
      const value = (baseFreq + midFreq + highFreq + noise + 0.5) * freqFalloff;
      data[i] = Math.floor(Math.max(0, Math.min(255, value * 180)));
    }

    return data;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const frequencyData = getFrequencyData();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(10, 10, 16, 0.2)";
    ctx.fillRect(0, 0, width, height);

    if (!isPlaying) {
      ctx.strokeStyle = themeColorsRef.current.primary;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = themeColorsRef.current.primary;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      animationFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const hasRealData = frequencyData && frequencyData.some(v => v > 10);
    const dataToUse: Uint8Array = hasRealData ? frequencyData : generateSimulatedData(128);

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, themeColorsRef.current.primary);
    gradient.addColorStop(0.5, themeColorsRef.current.secondary);
    gradient.addColorStop(1, themeColorsRef.current.primary);

    switch (visualizerType) {
      case "wave":
        drawWave(ctx, dataToUse, width, height, gradient);
        break;
      case "bars":
        drawBars(ctx, dataToUse, width, height, gradient);
        break;
      case "circle":
        drawCircle(ctx, dataToUse, width, height, gradient);
        break;
      case "line":
        drawLine(ctx, dataToUse, width, height, gradient);
        break;
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [getFrequencyData, isPlaying, visualizerType, drawWave, drawBars, drawCircle, drawLine, generateSimulatedData]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const cycleVisualizerType = () => {
    const types: VisualizerType[] = ["bars", "wave", "circle", "line"];
    const currentIndex = types.indexOf(visualizerType);
    const nextIndex = (currentIndex + 1) % types.length;
    setVisualizerType(types[nextIndex]);
  };

  const CurrentTypeIcon = VISUALIZER_TYPES.find(v => v.type === visualizerType)?.icon || BarChart2;

  return (
    <div className="flex flex-col h-full w-full bg-bg-secondary/50">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Visualizer area */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />

        {/* Visualizer type button */}
        <button
          onClick={cycleVisualizerType}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-bg-tertiary/80 hover:bg-bg-tertiary text-text-secondary hover:text-accent-cyan transition-colors"
          title={`Style: ${VISUALIZER_TYPES.find(v => v.type === visualizerType)?.label}`}
        >
          <CurrentTypeIcon className="w-4 h-4" />
        </button>

        {/* Center overlay with track info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-bg-tertiary/80 flex items-center justify-center">
              <Music className="w-8 h-8 text-accent-cyan" />
            </div>
            <p className="text-sm text-text-primary font-medium truncate max-w-[80%] text-center">
              {fileName}
            </p>
            {playlistInfo && (
              <p className="text-xs text-text-secondary">
                {playlistInfo.current} of {playlistInfo.total}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls area */}
      <div className="flex-shrink-0 p-3 bg-bg-tertiary/50 border-t border-border/30">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text-secondary w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative h-1.5 group">
            <div className="absolute inset-0 bg-text-secondary/30 rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-accent-cyan rounded-full"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-cyan rounded-full shadow-lg shadow-accent-cyan/50 pointer-events-none"
              style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          {/* Left: Shuffle & Repeat */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isShuffle
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isRepeat
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              )}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Play controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className={cn(
                "p-2 rounded-lg transition-colors",
                hasPrevious
                  ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  : "text-text-secondary/30 cursor-not-allowed"
              )}
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-accent-cyan text-bg-primary hover:bg-accent-cyan/90 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className={cn(
                "p-2 rounded-lg transition-colors",
                hasNext
                  ? "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  : "text-text-secondary/30 cursor-not-allowed"
              )}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Volume */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-16 relative h-1 group">
              <div className="absolute inset-0 bg-text-secondary/30 rounded-full" />
              <div
                className="absolute inset-y-0 left-0 bg-accent-cyan rounded-full"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent-cyan rounded-full shadow-md shadow-accent-cyan/50 pointer-events-none"
                style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 5px)` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
