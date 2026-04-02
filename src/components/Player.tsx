import { useEffect, useRef, useState } from "react";
import type { RefObject, SyntheticEvent } from "react";
import type { VideoFile } from "../types";
import { clampNumber } from "../utils/time";

interface FrameSize {
  width: number;
  height: number;
}

function getContainedFrameSize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
): FrameSize {
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;

  let width = containerWidth;
  let height = Math.round(width / safeAspect);

  if (height > containerHeight) {
    height = containerHeight;
    width = Math.round(height * safeAspect);
  }

  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

interface PlayerProps {
  videoFile: VideoFile | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  isImporting: boolean;
  onOpenVideo: () => void;
  onLoadedMetadata: (durationMs: number, videoName: string) => void;
  onTimeUpdate: (timeMs: number) => void;
  onError: (reason: string) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
}

export function Player({
  videoFile,
  videoRef,
  isImporting,
  onOpenVideo,
  onLoadedMetadata,
  onTimeUpdate,
  onError,
  onPlayStateChange,
}: PlayerProps) {
  const videoCanvasRef = useRef<HTMLDivElement | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [frameSize, setFrameSize] = useState<FrameSize>({
    width: 1,
    height: 1,
  });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoFile) {
      return;
    }

    // Ensure the element reloads when a new media URL is selected.
    videoElement.load();
  }, [videoFile, videoRef]);

  useEffect(() => {
    const canvasElement = videoCanvasRef.current;
    if (!canvasElement) {
      return;
    }

    const updateFrameSize = () => {
      const containerWidth = canvasElement.clientWidth;
      const containerHeight = canvasElement.clientHeight;
      if (containerWidth <= 0 || containerHeight <= 0) {
        return;
      }

      const nextSize = getContainedFrameSize(containerWidth, containerHeight, videoAspectRatio);
      setFrameSize((currentSize) =>
        currentSize.width === nextSize.width && currentSize.height === nextSize.height
          ? currentSize
          : nextSize,
      );
    };

    updateFrameSize();
    const animationFrameId = window.requestAnimationFrame(updateFrameSize);
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(canvasElement);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [videoAspectRatio, videoFile?.url]);

  if (!videoFile) {
    return (
      <section className="h-full min-h-[220px] w-full rounded-[10px] border border-[#303743] bg-[#0b0d11] text-center text-[#9aa4b3] grid place-content-center gap-2.5">
        <h2 className="text-2xl font-semibold text-[#d8dee8]">No footage loaded</h2>
        <p>Choose a local game file to start playback.</p>
        <button
          type="button"
          className="mx-auto rounded-lg border border-[#ea580c] bg-gradient-to-b from-[#fb923c] to-[#f97316] px-3 py-2 font-semibold text-[#fff7ed] transition enabled:hover:from-[#fd9f52] enabled:hover:to-[#ea580c] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onOpenVideo}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Open Video"}
        </button>
      </section>
    );
  }

  return (
    <div className="grid h-full min-h-[220px] w-full place-items-center overflow-hidden" ref={videoCanvasRef}>
      <div
        className="grid place-items-center overflow-hidden rounded-[10px] border border-[#303743] bg-[#0b0d11]"
        style={{
          width: `${frameSize.width}px`,
          height: `${frameSize.height}px`,
        }}
      >
        <video
          ref={videoRef}
          src={videoFile.url}
          key={videoFile.url}
          preload="metadata"
          playsInline
          onLoadedMetadata={(event: SyntheticEvent<HTMLVideoElement>) => {
            const videoElement = event.currentTarget;
            const durationMs = Math.floor(videoElement.duration * 1000);
            const sourceWidth = videoElement.videoWidth;
            const sourceHeight = videoElement.videoHeight;

            if (sourceWidth > 0 && sourceHeight > 0) {
              setVideoAspectRatio(clampNumber(sourceWidth / sourceHeight, 0.25, 8));
            }

            onLoadedMetadata(durationMs, videoFile.name);
          }}
          onTimeUpdate={(event: SyntheticEvent<HTMLVideoElement>) => {
            onTimeUpdate(Math.floor(event.currentTarget.currentTime * 1000));
          }}
          onError={(event: SyntheticEvent<HTMLVideoElement>) => {
            const code = event.currentTarget.error?.code;
            const reason =
              code === 1
                ? "aborted"
                : code === 2
                  ? "network"
                  : code === 3
                    ? "decode"
                    : code === 4
                      ? "unsupported format"
                      : "unknown";
            onError(reason);
          }}
          onPlay={() => onPlayStateChange(true)}
          onPause={() => onPlayStateChange(false)}
          className="h-full w-full bg-[#090b0f] object-contain"
        />
      </div>
    </div>
  );
}
