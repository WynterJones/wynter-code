import { useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, Activity, BarChart2, Circle, Minus } from "lucide-react";
import { useMeditationStore, type VisualizerType } from "@/stores/meditationStore";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";

interface AudioVisualizerProps {
  variant?: "full" | "mini";
}

const VISUALIZER_TYPES: { type: VisualizerType; icon: typeof Activity; label: string }[] = [
  { type: "wave", icon: Activity, label: "Wave" },
  { type: "bars", icon: BarChart2, label: "Bars" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "line", icon: Minus, label: "Line" },
];

export function AudioVisualizer({ variant = "full" }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const themeColorsRef = useRef<{ primary: string; secondary: string }>({
    primary: "#94e2d5",
    secondary: "#a6e3a1",
  });

  const { audioElementRef, showVisualizer, setShowVisualizer, isPlaying, visualizerType, setVisualizerType } =
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

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const sliceWidth = width / frequencyData.length;

    // Top wave
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

    // Bottom wave (mirror)
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
    const barCount = Math.min(32, frequencyData.length);
    const barWidth = (width / barCount) * 0.7;
    const gap = (width / barCount) * 0.3;

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 6;
    ctx.shadowColor = themeColorsRef.current.primary;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * frequencyData.length);
      const v = frequencyData[dataIndex] / 255.0;
      const barHeight = v * height * 0.8;
      const x = i * (barWidth + gap) + gap / 2;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.shadowBlur = 0;
  }, []);

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, frequencyData: Uint8Array, width: number, height: number, gradient: CanvasGradient) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.25;

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = themeColorsRef.current.primary;
    ctx.beginPath();

    for (let i = 0; i < frequencyData.length; i++) {
      const v = frequencyData[i] / 255.0;
      const angle = (i / frequencyData.length) * Math.PI * 2;
      const radius = baseRadius + v * baseRadius * 0.8;
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

  // Generate simulated frequency data for streams without CORS
  const generateSimulatedData = useCallback((length: number): Uint8Array => {
    const data = new Uint8Array(length);
    const time = Date.now() / 1000;

    for (let i = 0; i < length; i++) {
      // Create organic-looking wave patterns
      const baseFreq = Math.sin(time * 2 + i * 0.1) * 0.3;
      const midFreq = Math.sin(time * 3.7 + i * 0.05) * 0.25;
      const highFreq = Math.sin(time * 5.3 + i * 0.15) * 0.15;
      const noise = Math.random() * 0.1;

      // Lower frequencies should be stronger (like real audio)
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

    ctx.fillStyle = "rgba(10, 10, 16, 0.3)";
    ctx.fillRect(0, 0, width, height);

    // Draw center line for wave mode
    if (visualizerType === "wave" || visualizerType === "line") {
      ctx.strokeStyle = "rgba(42, 42, 58, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

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

    // Check if frequency data is empty/tainted (CORS issue with streams)
    // If all values are 0 or very low, use simulated data
    const hasRealData = frequencyData && frequencyData.some(v => v > 10);
    const dataToUse: Uint8Array = hasRealData ? frequencyData : generateSimulatedData(128);

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, themeColorsRef.current.primary);
    gradient.addColorStop(0.5, themeColorsRef.current.secondary);
    gradient.addColorStop(1, themeColorsRef.current.primary);

    // Draw based on visualizer type
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

    // Scan lines effect
    for (let i = 0; i < 3; i++) {
      const scanY = (Date.now() / 50 + i * 30) % height;
      ctx.fillStyle = `rgba(148, 226, 213, ${0.03 - i * 0.01})`;
      ctx.fillRect(0, scanY, width, 1);
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  }, [getFrequencyData, isPlaying, visualizerType, drawWave, drawBars, drawCircle, drawLine, generateSimulatedData]);

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

  const cycleVisualizerType = () => {
    const types: VisualizerType[] = ["wave", "bars", "circle", "line"];
    const currentIndex = types.indexOf(visualizerType);
    const nextIndex = (currentIndex + 1) % types.length;
    setVisualizerType(types[nextIndex]);
  };

  const CurrentTypeIcon = VISUALIZER_TYPES.find(v => v.type === visualizerType)?.icon || Activity;

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

      {/* Waveform type selector - left side */}
      {showVisualizer && !isMini && (
        <button
          onClick={cycleVisualizerType}
          className="absolute -top-1 -left-1 p-1 rounded-full transition-all duration-200 bg-accent-cyan/20 text-accent-cyan opacity-0 group-hover:opacity-100"
          title={`Waveform: ${VISUALIZER_TYPES.find(v => v.type === visualizerType)?.label}`}
        >
          <CurrentTypeIcon className="w-3 h-3" />
        </button>
      )}

      {/* Visibility toggle - right side */}
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
