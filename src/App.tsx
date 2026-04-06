import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { FileMenuForm } from "./components/FileMenuForm";
import { Player } from "./components/Player";
import { PlayerControls } from "./components/playercontrols";
import { usePlaybackController } from "./hooks/usePlaybackController";
import { useProjectController } from "./project/useProjectController";
import { useTimelineCuts } from "./timeline/useTimelineCuts";
import type { RecentVideo, VideoFile } from "./types";
import { clampNumber, formatClockTime } from "./utils/time";

const RECENT_VIDEOS_STORAGE_KEY = "courtcut.recent-videos";
const CONTROLS_HEIGHT_STORAGE_KEY = "courtcut.controls-height";
const DEFAULT_CONTROLS_HEIGHT = 170;
const MIN_CONTROLS_HEIGHT = 170;
const MIN_VIEWER_HEIGHT = 120;

function getInitialControlsHeight(): number {
  const rawValue = Number(window.localStorage.getItem(CONTROLS_HEIGHT_STORAGE_KEY));
  return Number.isFinite(rawValue) && rawValue >= MIN_CONTROLS_HEIGHT
    ? rawValue
    : DEFAULT_CONTROLS_HEIGHT;
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const titlebarRef = useRef<HTMLDivElement | null>(null);

  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [controlsHeightPx, setControlsHeightPx] = useState(getInitialControlsHeight);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
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

  const { cutsMs, segments, canCutAt, addCutAt, setCutsFromProject, clearCuts } =
    useTimelineCuts(durationMs);

  function getMaxControlsHeight() {
    const shellElement = shellRef.current;
    if (!shellElement) {
      return MIN_CONTROLS_HEIGHT;
    }

    const titlebarHeight = titlebarRef.current?.offsetHeight ?? 32;
    return Math.max(MIN_CONTROLS_HEIGHT, shellElement.clientHeight - titlebarHeight - MIN_VIEWER_HEIGHT);
  }

  const {
    isProjectDirty,
    markProjectDirty,
    importProject,
    saveProject,
    applyPendingProjectSeek,
  } = useProjectController({
    videoFile,
    currentTimeMs,
    durationMs,
    controlsHeightPx,
    cutsMs,
    setVideoFile,
    setCurrentTimeMs,
    setDurationMs,
    setControlsHeightPx,
    setIsPlaying,
    setIsImporting,
    setStatusMessage,
    setIsFileMenuOpen,
    setRecentVideos,
    setCutsFromProject,
    clampControlsHeight: (heightPx) =>
      clampNumber(heightPx, MIN_CONTROLS_HEIGHT, getMaxControlsHeight()),
    videoRef,
  });

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(RECENT_VIDEOS_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) {
        return;
      }

      const validEntries = parsed.filter(
        (entry) =>
          entry &&
          typeof entry.path === "string" &&
          typeof entry.name === "string" &&
          entry.path.length > 0,
      );

      setRecentVideos(validEntries.slice(0, 8));
    } catch {
      setRecentVideos([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_VIDEOS_STORAGE_KEY, JSON.stringify(recentVideos));
  }, [recentVideos]);

  useEffect(() => {
    window.localStorage.setItem(CONTROLS_HEIGHT_STORAGE_KEY, String(Math.round(controlsHeightPx)));
  }, [controlsHeightPx]);

  useEffect(() => {
    function clampControlsForWindow() {
      const shellElement = shellRef.current;
      if (!shellElement) {
        return;
      }

      const titlebarHeight = titlebarRef.current?.offsetHeight ?? 32;
      const maxControlsHeight = Math.max(MIN_CONTROLS_HEIGHT, shellElement.clientHeight - titlebarHeight - MIN_VIEWER_HEIGHT);

      setControlsHeightPx((currentHeight) =>
        clampNumber(currentHeight, MIN_CONTROLS_HEIGHT, maxControlsHeight),
      );
    }

    clampControlsForWindow();
    window.addEventListener("resize", clampControlsForWindow);
    return () => window.removeEventListener("resize", clampControlsForWindow);
  }, []);

  async function openVideo() {
    const currentVideoElement = videoRef.current;
    currentVideoElement?.pause();
    setIsPlaying(false);
    setIsImporting(true);
    setStatusMessage("Opening video...");

    try {
      // Video selection runs through Electron's native file picker.
      const selectedVideo = await window.coachEditor.openVideoFile();
      if (!selectedVideo) {
        setStatusMessage("Video open canceled.");
        return;
      }

      setVideoFile(selectedVideo);
      clearCuts();
      markProjectDirty();
      setRecentVideos((currentVideos) => {
        const deduped = currentVideos.filter((entry) => entry.path !== selectedVideo.path);
        return [{ path: selectedVideo.path, name: selectedVideo.name }, ...deduped].slice(0, 8);
      });
      setCurrentTimeMs(0);
      setDurationMs(0);
      setIsPlaying(false);
      setStatusMessage(`Loaded ${selectedVideo.name} (source file).`);
    } catch (error) {
      setStatusMessage(`Could not open video: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  }

  async function openRecentVideo(videoPath: string) {
    const currentVideoElement = videoRef.current;
    currentVideoElement?.pause();
    setIsPlaying(false);
    setIsImporting(true);
    setStatusMessage("Opening recent video...");

    try {
      const selectedVideo = await window.coachEditor.openVideoFromPath(videoPath);
      if (!selectedVideo) {
        setStatusMessage("Could not open recent video.");
        return;
      }

      setVideoFile(selectedVideo);
      clearCuts();
      markProjectDirty();
      setRecentVideos((currentVideos) => {
        const deduped = currentVideos.filter((entry) => entry.path !== selectedVideo.path);
        return [{ path: selectedVideo.path, name: selectedVideo.name }, ...deduped].slice(0, 8);
      });
      setCurrentTimeMs(0);
      setDurationMs(0);
      setIsPlaying(false);
      setStatusMessage(`Loaded ${selectedVideo.name} (source file).`);
    } catch (error) {
      setStatusMessage(`Could not open recent video: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      setIsFileMenuOpen(false);
    }
  }

  function startControlsResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = controlsHeightPx;

    function handlePointerMove(moveEvent: PointerEvent) {
      const shellElement = shellRef.current;
      if (!shellElement) {
        return;
      }

      const titlebarHeight = titlebarRef.current?.offsetHeight ?? 32;
      const maxControlsHeight = Math.max(
        MIN_CONTROLS_HEIGHT,
        shellElement.clientHeight - titlebarHeight - MIN_VIEWER_HEIGHT,
      );

      // Dragging upward increases controls area; dragging downward decreases it.
      const nextHeight = startHeight + (startY - moveEvent.clientY);
      setControlsHeightPx(clampNumber(nextHeight, MIN_CONTROLS_HEIGHT, maxControlsHeight));
      markProjectDirty();
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

  function cutAtPlayhead() {
    if (!hasVideo) {
      return;
    }

    const didCut = addCutAt(currentTimeMs);
    if (!didCut) {
      setStatusMessage("Cannot cut here. Move away from timeline boundaries or existing cuts.");
      return;
    }

    markProjectDirty();
    setStatusMessage(`Cut added at ${formatClockTime(currentTimeMs)}.`);
  }

  return (
    <div
      className="grid h-screen overflow-hidden bg-gradient-to-b from-[#181c23] to-[#14181e]"
      ref={shellRef}
      style={{
        gridTemplateRows: `auto minmax(0, 1fr) ${controlsHeightPx}px`,
      }}
    >
      <div ref={titlebarRef} className="flex h-8 items-center bg-[#14181e] px-2 [app-region:drag]">
        <FileMenuForm
          isOpen={isFileMenuOpen}
          recentVideos={recentVideos}
          isProjectDirty={isProjectDirty}
          onToggle={() => setIsFileMenuOpen((currentValue) => !currentValue)}
          onClose={() => setIsFileMenuOpen(false)}
          onOpenVideo={() => {
            setIsFileMenuOpen(false);
            void openVideo();
          }}
          onImportProject={() => {
            void importProject();
          }}
          onSaveProject={() => {
            void saveProject();
          }}
          onOpenRecent={(videoPath) => {
            void openRecentVideo(videoPath);
          }}
        />
      </div>

      <main className="min-h-0 overflow-hidden p-3.5">
        <Player
          videoFile={videoFile}
          videoRef={videoRef}
          layoutVersion={controlsHeightPx}
          onLoadedMetadata={(loadedDurationMs, videoName) => {
            setDurationMs(loadedDurationMs);
            setCurrentTimeMs(applyPendingProjectSeek(loadedDurationMs));
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

      <div className="relative h-full min-h-[170px]">
        <div
          className="absolute inset-x-0 top-0 z-20 h-1 cursor-row-resize [app-region:no-drag]"
          role="separator"
          aria-label="Resize playback controls"
          aria-orientation="horizontal"
          onPointerDown={startControlsResize}
        />

        <PlayerControls
          hasVideo={hasVideo}
          isImporting={isImporting}
          isPlaying={isPlaying}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          playheadPercent={playheadPercent}
          statusMessage={statusMessage}
          cutsMs={cutsMs}
          segments={segments}
          canCut={canCutAt(currentTimeMs)}
          onSkipBack={() => skipBy(-2)}
          onCut={cutAtPlayhead}
          onTogglePlayback={togglePlayback}
          onSkipForward={() => skipBy(2)}
          onSeek={seekTo}
        />
      </div>
    </div>
  );
}

export default App;
