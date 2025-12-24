import { useState, useRef, useCallback } from "react";
import type { RecordingState, RecordingMode, RegionSelection, Recording, RecordingMetadata } from "../types";

interface UseScreenRecordingReturn {
  state: RecordingState;
  currentRecording: Recording | null;
  duration: number;
  error: string | null;
  startRecording: (mode: RecordingMode, region?: RegionSelection) => Promise<void>;
  stopRecording: () => Promise<Recording | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  clearRecording: () => void;
}

export function useScreenRecording(): UseScreenRecordingReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef<RecordingMode>("fullscreen");
  const regionRef = useRef<RegionSelection | null>(null);

  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (mode: RecordingMode, region?: RegionSelection) => {
    try {
      setError(null);
      modeRef.current = mode;
      regionRef.current = region || null;

      // Request screen capture
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: mode === "fullscreen" ? "monitor" : "window",
          frameRate: 60,
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      mediaStreamRef.current = stream;

      // Try to add microphone audio
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        // Mix display audio with mic audio
        if (stream.getAudioTracks().length > 0) {
          const displayAudioSource = audioContext.createMediaStreamSource(stream);
          displayAudioSource.connect(destination);
        }
        
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);

        // Create combined stream
        const combinedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
        mediaStreamRef.current = combinedStream;
      } catch {
        // Continue without microphone
        console.log("Microphone not available, continuing without it");
      }

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps
      });

      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        clearDurationInterval();
      };

      // Handle stream end (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        if (state === "recording" || state === "paused") {
          stopRecording();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second

      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setState("idle");
    }
  }, [state, clearDurationInterval]);

  const stopRecording = useCallback(async (): Promise<Recording | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !mediaStreamRef.current) {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        clearDurationInterval();

        // Stop all tracks
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        // Create blob from chunks
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Get video dimensions
        const videoTrack = mediaStreamRef.current?.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();

        const metadata: RecordingMetadata = {
          width: settings?.width || 1920,
          height: settings?.height || 1080,
          fps: settings?.frameRate || 60,
          mode: modeRef.current,
          region: regionRef.current,
          hasAudio: (mediaStreamRef.current?.getAudioTracks().length || 0) > 0,
          hasMicrophone: false,
        };

        // Generate thumbnail
        const thumbnailUrl = URL.createObjectURL(blob);

        const recording: Recording = {
          id: crypto.randomUUID(),
          blob,
          duration: finalDuration,
          timestamp: Date.now(),
          thumbnailUrl,
          metadata,
        };

        setCurrentRecording(recording);
        setState("completed");
        setDuration(finalDuration);

        // Cleanup refs
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        chunksRef.current = [];

        resolve(recording);
      };

      recorder.stop();
    });
  }, [clearDurationInterval]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      clearDurationInterval();
      setState("paused");
    }
  }, [state, clearDurationInterval]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      
      // Resume duration counter (adjust start time for pause duration)
      const pausedDuration = duration * 1000;
      startTimeRef.current = Date.now() - pausedDuration;
      
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
      setState("recording");
    }
  }, [state, duration]);

  const cancelRecording = useCallback(() => {
    clearDurationInterval();
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    chunksRef.current = [];
    
    setState("idle");
    setDuration(0);
    setCurrentRecording(null);
  }, [clearDurationInterval]);

  const clearRecording = useCallback(() => {
    if (currentRecording?.thumbnailUrl) {
      URL.revokeObjectURL(currentRecording.thumbnailUrl);
    }
    setCurrentRecording(null);
    setState("idle");
    setDuration(0);
  }, [currentRecording]);

  return {
    state,
    currentRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearRecording,
  };
}
