import { useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useMeditationStore } from "@/stores/meditationStore";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

interface AudioVisualizerProps {
  variant?: "full" | "mini";
}

export function AudioVisualizer({ variant = "full" }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const themeColorsRef = useRef<{ primary: string; secondary: string }>({
    primary: "#94e2d5",
    secondary: "#a6e3a1",
  });

  const { audioElementRef, showVisualizer, setShowVisualizer, isPlaying } =
    useMeditationStore();

  const { getFrequencyData, isReady } = useAudioAnalyser({
    audioElement: audioElementRef,
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const frequencyData = getFrequencyData();

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(10, 10, 16, 0.3)";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(42, 42, 58, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!frequencyData || !isPlaying) {
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

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, themeColorsRef.current.primary);
    gradient.addColorStop(0.5, themeColorsRef.current.secondary);
    gradient.addColorStop(1, themeColorsRef.current.primary);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColorsRef.current.primary;

    ctx.beginPath();

    const sliceWidth = width / frequencyData.length;
    let x = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const amplitude = v * (height * 0.4);
      const y = height / 2 - amplitude * Math.sin((i / frequencyData.length) * Math.PI);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = x - sliceWidth;
        const prevY =
          height / 2 -
          (frequencyData[i - 1] / 255.0) *
            (height * 0.4) *
            Math.sin(((i - 1) / frequencyData.length) * Math.PI);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
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
        const prevY =
          height / 2 +
          (frequencyData[i - 1] / 255.0) *
            (height * 0.4) *
            Math.sin(((i - 1) / frequencyData.length) * Math.PI);
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }

      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 0; i < 3; i++) {
      const scanY = (Date.now() / 50 + i * 30) % height;
      ctx.fillStyle = `rgba(148, 226, 213, ${0.03 - i * 0.01})`;
      ctx.fillRect(0, scanY, width, 1);
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [getFrequencyData, isPlaying]);

  useEffect(() => {
    if (!showVisualizer) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw, showVisualizer]);

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

  const isMini = variant === "mini";
  const containerWidth = isMini ? "w-24" : "w-48";
  const containerHeight = isMini ? "h-8" : "h-16";

  return (
    <div
      className={`relative ${containerWidth} ${containerHeight} group`}
    >
      <div
        className={`absolute inset-0 rounded-lg overflow-hidden border transition-all duration-300 ${
          showVisualizer
            ? "border-border/50 bg-bg-tertiary/50"
            : "border-transparent bg-transparent"
        }`}
      >
        {showVisualizer && (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: "block" }}
          />
        )}
      </div>

      <button
        onClick={() => setShowVisualizer(!showVisualizer)}
        className={`absolute -top-1 -right-1 p-1 rounded-full transition-all duration-200 ${
          showVisualizer
            ? "bg-accent-cyan/20 text-accent-cyan opacity-0 group-hover:opacity-100"
            : "bg-bg-secondary/80 text-text-secondary opacity-60 hover:opacity-100"
        }`}
        title={showVisualizer ? "Hide visualizer" : "Show visualizer"}
      >
        {showVisualizer ? (
          <EyeOff className="w-3 h-3" />
        ) : (
          <Eye className="w-3 h-3" />
        )}
      </button>

      {!showVisualizer && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-30 hover:opacity-60 transition-opacity"
          onClick={() => setShowVisualizer(true)}
        >
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-accent-cyan/50 rounded-full"
                style={{
                  height: `${8 + Math.sin(i * 0.8) * 4}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {isReady && showVisualizer && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />
      )}
    </div>
  );
}
