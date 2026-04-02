import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Player } from "./components/Player";
import { PlayerControls } from "./components/playercontrols";
import { usePlaybackController } from "./hooks/usePlaybackController";
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

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const topbarRef = useRef<HTMLElement | null>(null);

  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [viewerHeightPx, setViewerHeightPx] = useState(getInitialViewerHeight);
  const [statusMessage, setStatusMessage] = useState(
    "Open a local game file to preview footage.",
  );

  const hasVideo = Boolean(videoFile);
  const playheadPercent =
    durationMs > 0 ? clampNumber((currentTimeMs / durationMs) * 100, 0, 100) : 0;

  const { seekTo, skipBy, togglePlayback } = usePlaybackController({
    videoRef,
    currentTimeMs,
    durationMs,
    isImporting,
    setCurrentTimeMs,
    setStatusMessage,
  });

  useEffect(() => {
    window.localStorage.setItem(VIEWER_HEIGHT_STORAGE_KEY, String(Math.round(viewerHeightPx)));
  }, [viewerHeightPx]);

  useEffect(() => {
    function clampViewerForWindow() {
      const shellElement = shellRef.current;
      if (!shellElement) {
        return;
      }

      const topbarHeight = topbarRef.current?.offsetHeight ?? 64;
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
      setIsPlaying(false);
      setStatusMessage(`Loaded ${selectedVideo.name} (playback proxy).`);
    } catch (error) {
      setStatusMessage(`Could not open video: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
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

      const topbarHeight = topbarRef.current?.offsetHeight ?? 64;
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
      className="grid min-h-screen overflow-hidden bg-gradient-to-b from-[#181c23] to-[#14181e]"
      ref={shellRef}
      style={{
        gridTemplateRows: `auto ${viewerHeightPx}px ${RESIZER_HEIGHT}px auto`,
      }}
    >
      <header
        ref={topbarRef}
        className="flex h-16 items-center justify-between gap-3 border-b border-[#303743] bg-gradient-to-b from-[#1f242d] to-[#1b2028] px-4 py-2.5 max-[860px]:h-auto max-[860px]:flex-col max-[860px]:items-start"
      >



        <div className="flex items-center gap-2.5 max-[860px]:w-full max-[860px]:flex-wrap">
          <span
            className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap rounded-[9px] border border-[#303743] bg-[#181c23] px-2.5 py-2 text-xs text-[#9aa4b3] max-[860px]:max-w-full max-[860px]:flex-1"
            title={videoFile?.path ?? "No file loaded"}
          >
            {videoFile?.name ?? "No video loaded"}
          </span>
          {isImporting ? (
            <span className="rounded-full border border-[#4a5364] bg-[rgba(249,115,22,0.15)] px-2.5 py-1.5 text-[11px] text-[#ffd9b3]">
              Transcoding...
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-[#ea580c] bg-gradient-to-b from-[#fb923c] to-[#f97316] px-3 py-2 font-semibold text-[#fff7ed] transition enabled:hover:from-[#fd9f52] enabled:hover:to-[#ea580c] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={openVideo}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Open Video"}
          </button>
        </div>
      </header>

      <main className="min-h-0 p-3.5">
        <Player
          videoFile={videoFile}
          videoRef={videoRef}
          isImporting={isImporting}
          onOpenVideo={openVideo}
          onLoadedMetadata={(loadedDurationMs, videoName) => {
            setDurationMs(loadedDurationMs);
            setCurrentTimeMs(0);
            setStatusMessage(`Ready: ${videoName} (${formatClockTime(loadedDurationMs)}).`);
          }}
          onTimeUpdate={(timeMs) => {
            setCurrentTimeMs(timeMs);
          }}
          onError={(reason) => {
            setStatusMessage(`Playback failed (${reason}). Try another source file.`);
          }}
          onPlayStateChange={setIsPlaying}
        />
      </main>

      <div
        className="relative cursor-row-resize border-y border-y-[#303846] border-t-[#2a313d] bg-gradient-to-b from-[#202630] to-[#1b2029] hover:from-[#242c37] hover:to-[#1d2330]"
        role="separator"
        aria-label="Resize video viewer"
        aria-orientation="horizontal"
        onPointerDown={startViewerResize}
      >
        <span className="absolute left-1/2 top-1/2 h-0.5 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5f6b7e]" />
      </div>

      <PlayerControls
        hasVideo={hasVideo}
        isImporting={isImporting}
        isPlaying={isPlaying}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        playheadPercent={playheadPercent}
        statusMessage={statusMessage}
        onSkipBack={() => skipBy(-2)}
        onTogglePlayback={togglePlayback}
        onSkipForward={() => skipBy(2)}
        onSeek={seekTo}
      />
    </div>
  );
}

export default App;
