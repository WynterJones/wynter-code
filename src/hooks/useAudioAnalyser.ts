import { useEffect, useRef, useState, useCallback } from "react";

interface UseAudioAnalyserOptions {
  audioElement: HTMLAudioElement | null;
  fftSize?: number;
  smoothingTimeConstant?: number;
}

interface UseAudioAnalyserReturn {
  analyserNode: AnalyserNode | null;
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null;
  isReady: boolean;
}

const connectedElements = new WeakSet<HTMLAudioElement>();

export function useAudioAnalyser({
  audioElement,
  fftSize = 256,
  smoothingTimeConstant = 0.8,
}: UseAudioAnalyserOptions): UseAudioAnalyserReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!audioElement) {
      setIsReady(false);
      return;
    }

    const initializeAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        const ctx = audioContextRef.current;

        if (!analyserRef.current) {
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = fftSize;
          analyserRef.current.smoothingTimeConstant = smoothingTimeConstant;
          frequencyDataRef.current = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );
        }

        if (!connectedElements.has(audioElement) && !sourceRef.current) {
          sourceRef.current = ctx.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          connectedElements.add(audioElement);
        }

        if (ctx.state === "suspended") {
          ctx.resume();
        }

        setIsReady(true);
      } catch (error) {
        console.warn("Failed to initialize audio analyser:", error);
        setIsReady(false);
      }
    };

    const handlePlay = () => {
      initializeAudio();
    };

    if (!audioElement.paused) {
      initializeAudio();
    }

    audioElement.addEventListener("play", handlePlay);

    return () => {
      audioElement.removeEventListener("play", handlePlay);
    };
  }, [audioElement, fftSize, smoothingTimeConstant]);

  const getFrequencyData = useCallback(() => {
    if (!analyserRef.current || !frequencyDataRef.current) {
      return null;
    }
    analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
    return frequencyDataRef.current;
  }, []);

  return {
    analyserNode: analyserRef.current,
    getFrequencyData,
    isReady,
  };
}
