import { useState, useCallback, useRef } from "react";
import type { DecartUsage } from "../types";
import { DECART_COST_PER_SECOND } from "../types";

interface UseDecartAIOptions {
  apiKey: string;
}

export function useDecartAI({ apiKey }: UseDecartAIOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<DecartUsage>({
    sessionStartTime: null,
    creditsUsed: 0,
    costUsd: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const usageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(
    async (inputStream: MediaStream): Promise<MediaStream | null> => {
      if (!apiKey) {
        setError("API key is required");
        return null;
      }

      setIsConnecting(true);
      setError(null);

      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        inputStream.getVideoTracks().forEach((track) => {
          pc.addTrack(track, inputStream);
        });

        const dc = pc.createDataChannel("effects");
        dataChannelRef.current = dc;

        dc.onopen = () => {
          console.log("Decart data channel opened");
        };

        dc.onmessage = (event) => {
          console.log("Decart message:", event.data);
        };

        let outputStream: MediaStream | null = null;

        pc.ontrack = (event) => {
          outputStream = event.streams[0];
          outputStreamRef.current = outputStream;
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(
          "https://api.decart.ai/v1/realtime/connect",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sdp: offer.sdp,
              type: offer.type,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }

        const answer = await response.json();
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        peerConnectionRef.current = pc;
        setIsConnected(true);
        setIsConnecting(false);

        const startTime = Date.now();
        setUsage({
          sessionStartTime: startTime,
          creditsUsed: 0,
          costUsd: 0,
        });

        usageIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setUsage({
            sessionStartTime: startTime,
            creditsUsed: elapsed,
            costUsd: elapsed * DECART_COST_PER_SECOND,
          });
        }, 1000);

        return outputStream || inputStream;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect to Decart";
        setError(message);
        setIsConnecting(false);
        return null;
      }
    },
    [apiKey]
  );

  const disconnect = useCallback(() => {
    if (usageIntervalRef.current) {
      clearInterval(usageIntervalRef.current);
      usageIntervalRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    outputStreamRef.current = null;

    setIsConnected(false);
    setUsage({
      sessionStartTime: null,
      creditsUsed: 0,
      costUsd: 0,
    });
  }, []);

  const applyEffect = useCallback((effectId: string | null) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(
        JSON.stringify({
          type: "apply_effect",
          effect: effectId,
        })
      );
    }
  }, []);

  const setBackgroundEffect = useCallback(
    (effect: "none" | "blur" | "replace", imageUrl?: string) => {
      if (dataChannelRef.current?.readyState === "open") {
        dataChannelRef.current.send(
          JSON.stringify({
            type: "background_effect",
            effect,
            imageUrl,
          })
        );
      }
    },
    []
  );

  return {
    isConnected,
    isConnecting,
    error,
    usage,
    outputStream: outputStreamRef.current,
    connect,
    disconnect,
    applyEffect,
    setBackgroundEffect,
  };
}
