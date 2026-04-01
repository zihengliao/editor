import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { BackIcon, ForwardIcon, PauseIcon, PlayIcon } from "./components/TransportIcons";
import type { VideoFile } from "./types";
import { clampNumber, formatClockTime } from "./utils/time";

const VIEWER_HEIGHT_STORAGE_KEY = "courtcut.viewer-height";
const DEFAULT_VIEWER_HEIGHT = 420;
const MIN_VIEWER_HEIGHT = 220;
const MIN_TRANSPORT_HEIGHT = 130;
const RESIZER_HEIGHT = 8;

function getInitialViewerHeight(): number {
  const rawValue = Number(window.localStorage.getItem(VIEWER_HEIGHT_STORAGE_KEY));
  return Number.isFinite(rawValue) && rawValue >= MIN_VIEWER_HEIGHT
    ? rawValue
    : DEFAULT_VIEWER_HEIGHT;
}

function getContainedFrameSize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
): { width: number; height: number } {
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

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const videoCanvasRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const isImportingRef = useRef(false);

  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [frameSize, setFrameSize] = useState(() => ({
    width: 1,
    height: 1,
  }));
  const [viewerHeightPx, setViewerHeightPx] = useState(getInitialViewerHeight);
  const [statusMessage, setStatusMessage] = useState(
    "Open a local game file to preview footage.",
  );

  const hasVideo = Boolean(videoFile);
  const playheadPercent =
    durationMs > 0 ? clampNumber((currentTimeMs / durationMs) * 100, 0, 100) : 0;

  useEffect(() => {
    currentTimeRef.current = currentTimeMs;
    durationRef.current = durationMs;
    isImportingRef.current = isImporting;
  }, [currentTimeMs, durationMs, isImporting]);

  useEffect(() => {
    window.localStorage.setItem(VIEWER_HEIGHT_STORAGE_KEY, String(Math.round(viewerHeightPx)));
  }, [viewerHeightPx]);

  useEffect(() => {
    function clampViewerForWindow() {
      const shellElement = shellRef.current;
      if (!shellElement) {
        return;
      }

      const topbarElement = shellElement.querySelector(".resolve-topbar");
      const topbarHeight = topbarElement instanceof HTMLElement ? topbarElement.offsetHeight : 64;
      const maxViewerHeight = Math.max(
        MIN_VIEWER_HEIGHT,
        shellElement.clientHeight - topbarHeight - MIN_TRANSPORT_HEIGHT - RESIZER_HEIGHT,
      );

      setViewerHeightPx((currentHeight) => clampNumber(currentHeight, MIN_VIEWER_HEIGHT, maxViewerHeight));
    }

    clampViewerForWindow();
    window.addEventListener("resize", clampViewerForWindow);
    return () => window.removeEventListener("resize", clampViewerForWindow);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoFile) {
      return;
    }

    // Explicitly trigger load when a new proxy URL is set.
    videoElement.load();
  }, [videoFile]);

  useEffect(() => {
    const canvasElement = videoCanvasRef.current;
    if (!canvasElement) {
      return;
    }

    // Keep the footage frame centered and proportional while resizing.
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
  }, [videoAspectRatio, viewerHeightPx, videoFile?.url]);

  useEffect(() => {
    // Keep transport controls fast with keyboard shortcuts.
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingIntoField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingIntoField) {
        return;
      }

      if (isImportingRef.current) {
        return;
      }

      const videoElement = videoRef.current;
      if (!videoElement) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === " ") {
        event.preventDefault();

        if (videoElement.paused) {
          void videoElement.play().catch((error) => {
            setStatusMessage(`Play failed: ${(error as Error).message}`);
          });
          return;
        }

        videoElement.pause();
      }

      if (key === "arrowleft") {
        event.preventDefault();
        const nextMs = clampNumber(currentTimeRef.current - 2000, 0, durationRef.current);
        videoElement.currentTime = nextMs / 1000;
        setCurrentTimeMs(nextMs);
      }

      if (key === "arrowright") {
        event.preventDefault();
        const nextMs = clampNumber(currentTimeRef.current + 2000, 0, durationRef.current);
        videoElement.currentTime = nextMs / 1000;
        setCurrentTimeMs(nextMs);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, []);

  async function openVideo() {
    const currentVideoElement = videoRef.current;
    currentVideoElement?.pause();
    setIsPlaying(false);
    setIsImporting(true);
    setStatusMessage("Transcoding video for playback...");

    try {
      // Video selection runs through Electron's native file picker.
      const selectedVideo = await window.coachEditor.openVideoFile();
      if (!selectedVideo) {
        setStatusMessage("Video open canceled.");
        return;
      }

      setVideoFile(selectedVideo);
      setCurrentTimeMs(0);
      setDurationMs(0);
      setVideoAspectRatio(16 / 9);
      setIsPlaying(false);
      setStatusMessage(`Loaded ${selectedVideo.name} (playback proxy).`);
    } catch (error) {
      setStatusMessage(`Could not open video: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  }

  function seekTo(nextTimeMs: number) {
    const videoElement = videoRef.current;
    if (!videoElement || durationMs <= 0 || isImporting) {
      return;
    }

    const safeTimeMs = clampNumber(nextTimeMs, 0, durationMs);
    videoElement.currentTime = safeTimeMs / 1000;
    setCurrentTimeMs(safeTimeMs);
  }

  function skipBy(seconds: number) {
    seekTo(currentTimeMs + seconds * 1000);
  }

  function togglePlayback() {
    const videoElement = videoRef.current;
    if (!videoElement || isImporting) {
      return;
    }

    if (videoElement.paused) {
      void videoElement.play().catch((error) => {
        setStatusMessage(`Play failed: ${(error as Error).message}`);
      });
      return;
    }

    videoElement.pause();
  }

  function startViewerResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = viewerHeightPx;

    function handlePointerMove(moveEvent: PointerEvent) {
      const shellElement = shellRef.current;
      if (!shellElement) {
        return;
      }

      const topbarElement = shellElement.querySelector(".resolve-topbar");
      const topbarHeight = topbarElement instanceof HTMLElement ? topbarElement.offsetHeight : 64;
      const maxViewerHeight = Math.max(
        MIN_VIEWER_HEIGHT,
        shellElement.clientHeight - topbarHeight - MIN_TRANSPORT_HEIGHT - RESIZER_HEIGHT,
      );

      const nextHeight = startHeight + (moveEvent.clientY - startY);
      setViewerHeightPx(clampNumber(nextHeight, MIN_VIEWER_HEIGHT, maxViewerHeight));
    }

    function handlePointerUp() {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      className="resolve-shell"
      ref={shellRef}
      style={{
        gridTemplateRows: `auto ${viewerHeightPx}px ${RESIZER_HEIGHT}px auto`,
      }}
    >
      <header className="resolve-topbar">
        <div className="brand-block">
          <span className="brand-dot" aria-hidden="true" />
          <div>
            <p className="brand-kicker">CourtCut</p>
            <h1>Footage Viewer</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="file-chip" title={videoFile?.path ?? "No file loaded"}>
            {videoFile?.name ?? "No video loaded"}
          </span>
          {isImporting ? <span className="import-chip">Transcoding...</span> : null}
          <button type="button" className="btn-open" onClick={openVideo} disabled={isImporting}>
            {isImporting ? "Importing..." : "Open Video"}
          </button>
        </div>
      </header>

      <main className="resolve-viewer">
        {videoFile ? (
          <div className="video-canvas" ref={videoCanvasRef}>
            <div
              className="video-stage"
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
                onLoadedMetadata={(event) => {
                  const loadedDurationMs = Math.floor(event.currentTarget.duration * 1000);
                  const sourceWidth = event.currentTarget.videoWidth;
                  const sourceHeight = event.currentTarget.videoHeight;

                  // Keep the visible frame proportional to the source media.
                  if (sourceWidth > 0 && sourceHeight > 0) {
                    setVideoAspectRatio(sourceWidth / sourceHeight);
                  }

                  setDurationMs(loadedDurationMs);
                  setCurrentTimeMs(0);
                  setStatusMessage(`Ready: ${videoFile.name} (${formatClockTime(loadedDurationMs)}).`);
                }}
                onTimeUpdate={(event) => {
                  setCurrentTimeMs(Math.floor(event.currentTarget.currentTime * 1000));
                }}
                onError={(event) => {
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
                  setIsPlaying(false);
                  setStatusMessage(`Playback failed (${reason}). Try another source file.`);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          </div>
        ) : (
          <section className="viewer-empty">
            <h2>No footage loaded</h2>
            <p>Choose a local game file to start playback.</p>
            <button type="button" className="btn-open" onClick={openVideo} disabled={isImporting}>
              {isImporting ? "Importing..." : "Open Video"}
            </button>
          </section>
        )}
      </main>

      <div
        className="viewer-resizer"
        role="separator"
        aria-label="Resize video viewer"
        aria-orientation="horizontal"
        onPointerDown={startViewerResize}
      />

      <footer className="resolve-transport">
        <div className="transport-row">
          <div className="transport-spacer" aria-hidden="true" />

          <div className="transport-controls" aria-label="Playback controls">
            <button
              type="button"
              className="btn-icon"
              onClick={() => skipBy(-2)}
              disabled={!hasVideo || isImporting}
              aria-label="Skip backward 2 seconds"
            >
              <BackIcon />
            </button>

            <button
              type="button"
              className="btn-icon btn-icon-play"
              onClick={togglePlayback}
              disabled={!hasVideo || isImporting}
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              type="button"
              className="btn-icon"
              onClick={() => skipBy(2)}
              disabled={!hasVideo || isImporting}
              aria-label="Skip forward 2 seconds"
            >
              <ForwardIcon />
            </button>
          </div>

          <div className="timecode-readout transport-timecode" aria-live="polite">
            {formatClockTime(currentTimeMs)} / {formatClockTime(durationMs)}
          </div>
        </div>

        <div className="timeline-block">
          <div className="timeline-rail" aria-hidden="true">
            <div className="timeline-progress" style={{ width: `${playheadPercent}%` }} />
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(durationMs, 1)}
            step={10}
            value={Math.min(currentTimeMs, Math.max(durationMs, 1))}
            onChange={(event) => seekTo(Number(event.target.value))}
            disabled={!hasVideo || isImporting}
            aria-label="Playback timeline"
          />
        </div>

        <p className="status-line">{statusMessage}</p>
      </footer>
    </div>
  );
}

export default App;
