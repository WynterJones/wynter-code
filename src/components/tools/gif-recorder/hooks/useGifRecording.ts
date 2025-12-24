import { useState, useRef, useCallback } from "react";
import GIF from "gif.js";
import type {
  GifRecordingState,
  GifRecording,
  GifRecordingSettings,
  RegionSelection,
} from "../types";

interface UseGifRecordingReturn {
  state: GifRecordingState;
  currentRecording: GifRecording | null;
  frames: ImageData[];
  error: string | null;
  startRecording: (region: RegionSelection, settings: GifRecordingSettings) => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  exportGif: (trimStart?: number, trimEnd?: number) => Promise<Blob>;
}

export function useGifRecording(): UseGifRecordingReturn {
  const [state, setState] = useState<GifRecordingState>("idle");
  const [currentRecording, setCurrentRecording] = useState<GifRecording | null>(null);
  const [frames, setFrames] = useState<ImageData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const regionRef = useRef<RegionSelection | null>(null);
  const settingsRef = useRef<GifRecordingSettings | null>(null);
  const framesRef = useRef<ImageData[]>([]);

  const clearCaptureInterval = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    async (region: RegionSelection, settings: GifRecordingSettings) => {
      try {
        setError(null);
        setState("recording");
        regionRef.current = region;
        settingsRef.current = settings;
        framesRef.current = [];
        startTimeRef.current = Date.now();

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
            frameRate: settings.frameRate,
          },
          audio: false,
        });

        mediaStreamRef.current = stream;

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        const canvas = document.createElement("canvas");
        canvas.width = region.width;
        canvas.height = region.height;
        canvasRef.current = canvas;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        const captureFrame = () => {
          if (!video || !canvas || !ctx || !regionRef.current) return;

          try {
            ctx.drawImage(
              video,
              regionRef.current.x,
              regionRef.current.y,
              regionRef.current.width,
              regionRef.current.height,
              0,
              0,
              regionRef.current.width,
              regionRef.current.height
            );

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            framesRef.current.push(imageData);
          } catch (err) {
            console.error("Error capturing frame:", err);
          }
        };

        const interval = 1000 / settings.frameRate;
        captureIntervalRef.current = setInterval(captureFrame, interval);
        captureFrame();

        stream.getVideoTracks()[0].addEventListener("ended", () => {
          stopRecording();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start recording");
        setState("idle");
      }
    },
    []
  );

  const stopRecording = useCallback(() => {
    clearCaptureInterval();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    if (framesRef.current.length > 0 && regionRef.current && settingsRef.current) {
      const duration = Date.now() - startTimeRef.current;
      const recording: GifRecording = {
        id: `gif-${Date.now()}`,
        blob: null,
        frames: [...framesRef.current],
        duration,
        timestamp: Date.now(),
        settings: settingsRef.current,
        region: regionRef.current,
      };

      setCurrentRecording(recording);
      setFrames([...framesRef.current]);
      setState("completed");
    } else {
      setState("idle");
    }
  }, [clearCaptureInterval]);

  const clearRecording = useCallback(() => {
    clearCaptureInterval();
    setCurrentRecording(null);
    setFrames([]);
    setState("idle");
    framesRef.current = [];
  }, [clearCaptureInterval]);

  const exportGif = useCallback(
    async (trimStart = 0, trimEnd = 0): Promise<Blob> => {
      if (!currentRecording || !canvasRef.current) {
        throw new Error("No recording available");
      }

      setState("processing");

      return new Promise((resolve, reject) => {
        try {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext("2d")!;
          const framesToUse = currentRecording.frames.slice(
            Math.floor((trimStart / 1000) * currentRecording.settings.frameRate),
            trimEnd > 0
              ? currentRecording.frames.length -
                  Math.floor((trimEnd / 1000) * currentRecording.settings.frameRate)
              : undefined
          );

          const gif = new GIF({
            workers: 2,
            quality: currentRecording.settings.quality,
            width: currentRecording.region.width,
            height: currentRecording.region.height,
            repeat: currentRecording.settings.loop ? 0 : -1,
          });

          const delay = 1000 / currentRecording.settings.frameRate;

          framesToUse.forEach((frame) => {
            ctx.putImageData(frame, 0, 0);
            gif.addFrame(canvas, { delay });
          });

          gif.on("finished", (blob) => {
            setState("completed");
            resolve(blob);
          });

          gif.on("progress", (p) => {
            console.log(`GIF encoding progress: ${(p * 100).toFixed(1)}%`);
          });

          gif.render();
        } catch (err) {
          setState("completed");
          reject(err);
        }
      });
    },
    [currentRecording]
  );

  return {
    state,
    currentRecording,
    frames,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    exportGif,
  };
}

