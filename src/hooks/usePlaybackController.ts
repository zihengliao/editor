import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { clampNumber } from "../utils/time";

interface UsePlaybackControllerParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTimeMs: number;
  durationMs: number;
  isImporting: boolean;
  isPlaybackDisabled: boolean;
  setCurrentTimeMs: Dispatch<SetStateAction<number>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function usePlaybackController({
  videoRef,
  currentTimeMs,
  durationMs,
  isImporting,
  isPlaybackDisabled,
  setCurrentTimeMs,
  setStatusMessage,
}: UsePlaybackControllerParams) {
  const currentTimeRef = useRef(currentTimeMs);
  const durationRef = useRef(durationMs);
  const isImportingRef = useRef(isImporting);
  const isPlaybackDisabledRef = useRef(isPlaybackDisabled);

  useEffect(() => {
    currentTimeRef.current = currentTimeMs;
    durationRef.current = durationMs;
    isImportingRef.current = isImporting;
    isPlaybackDisabledRef.current = isPlaybackDisabled;
  }, [currentTimeMs, durationMs, isImporting, isPlaybackDisabled]);

  const seekTo = useCallback(
    (nextTimeMs: number) => {
      const videoElement = videoRef.current;
      if (
        !videoElement ||
        durationRef.current <= 0 ||
        isImportingRef.current ||
        isPlaybackDisabledRef.current
      ) {
        return;
      }

      const safeTimeMs = clampNumber(nextTimeMs, 0, durationRef.current);
      videoElement.currentTime = safeTimeMs / 1000;
      setCurrentTimeMs(safeTimeMs);
    },
    [videoRef, setCurrentTimeMs],
  );

  const skipBy = useCallback(
    (seconds: number) => {
      seekTo(currentTimeRef.current + seconds * 1000);
    },
    [seekTo],
  );

  const togglePlayback = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement || isImportingRef.current || isPlaybackDisabledRef.current) {
      return;
    }

    if (videoElement.paused) {
      void videoElement.play().catch((error) => {
        setStatusMessage(`Play failed: ${(error as Error).message}`);
      });
      return;
    }

    videoElement.pause();
  }, [videoRef, setStatusMessage]);

  useEffect(() => {
    // Keep transport controls fast with keyboard shortcuts.
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingIntoField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (
        isTypingIntoField ||
        isImportingRef.current ||
        isPlaybackDisabledRef.current ||
        !videoRef.current
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === " ") {
        event.preventDefault();
        togglePlayback();
      }

      if (key === "arrowleft") {
        event.preventDefault();
        skipBy(-2);
      }

      if (key === "arrowright") {
        event.preventDefault();
        skipBy(2);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [skipBy, togglePlayback, videoRef]);

  return {
    seekTo,
    skipBy,
    togglePlayback,
  };
}
