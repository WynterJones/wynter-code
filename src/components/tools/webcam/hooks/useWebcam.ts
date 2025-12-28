import { useState, useEffect, useRef, useCallback } from "react";
import type { WebcamDevice, CropArea } from "../types";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<WebcamDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not available in this environment");
      }

      await navigator.mediaDevices.getUserMedia({ video: true });

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setDevices(videoDevices);
      setError(null);
      return videoDevices;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enumerate devices";
      setError(message);
      return [];
    }
  }, []);

  const startStream = useCallback(
    async (deviceId?: string) => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this environment");
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setActiveDeviceId(settings.deviceId || deviceId || null);
        setIsStreaming(true);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to access webcam";
        setError(message);
        setIsStreaming(false);
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const getCroppedFrame = useCallback(
    (cropArea: CropArea): HTMLCanvasElement | null => {
      if (!videoRef.current) return null;

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const sx = video.videoWidth * cropArea.x;
      const sy = video.videoHeight * cropArea.y;
      const sw = video.videoWidth * cropArea.width;
      const sh = video.videoHeight * cropArea.height;

      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

      return canvas;
    },
    []
  );

  const getVideoSettings = useCallback(() => {
    if (!streamRef.current) return null;
    const track = streamRef.current.getVideoTracks()[0];
    return track?.getSettings() || null;
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    devices,
    activeDeviceId,
    isStreaming,
    error,
    enumerateDevices,
    startStream,
    stopStream,
    getCroppedFrame,
    getVideoSettings,
    stream: streamRef.current,
  };
}
