import {
  useCallback,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileMenuForm } from "./components/FileMenuForm";
import { Player } from "./components/Player";
import { PlayerControls } from "./components/playercontrols";
import { usePlaybackController } from "./hooks/usePlaybackController";
import { useProjectController } from "./project/useProjectController";
import { useTimelineCuts } from "./timeline/useTimelineCuts";
import { useTimelineSelection } from "./timeline/useTimelineSelection";
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
  const [shouldResetTimelineOnMetadata, setShouldResetTimelineOnMetadata] = useState(false);
  const [pendingTimelineSyncEditedMs, setPendingTimelineSyncEditedMs] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "Open a local game file to preview footage.",
  );

  const hasVideo = Boolean(videoFile);
  const {
    ranges,
    cutsMs,
    segments,
    editedDurationMs,
    sourceMsToEditedMs,
    editedMsToSourceMs,
    alignSourceTimeToRetainedRange,
    canCutAt,
    addCutAt,
    deleteSegmentById,
    undo,
    redo,
    canUndo,
    canRedo,
    setCutsFromProject,
    setRangesFromProject,
    resetToFullDuration,
    clearCuts,
  } = useTimelineCuts(durationMs);
  const { selectedSegmentId, selectSegment, clearSelectedSegment } = useTimelineSelection(segments);

  const currentEditedTimeMs = useMemo(
    () => sourceMsToEditedMs(currentTimeMs),
    [sourceMsToEditedMs, currentTimeMs],
  );
  const hasRetainedSegments = editedDurationMs > 0;
  const playheadPercent =
    editedDurationMs > 0 ? clampNumber((currentEditedTimeMs / editedDurationMs) * 100, 0, 100) : 0;

  const { seekTo, skipBy, togglePlayback } = usePlaybackController({
    videoRef,
    currentTimeMs,
    durationMs,
    isImporting,
    isPlaybackDisabled: !hasVideo || !hasRetainedSegments,
    setCurrentTimeMs,
    setStatusMessage,
  });

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
    retainedRanges: ranges.map((range) => ({ startMs: range.startMs, endMs: range.endMs })),
    setVideoFile,
    setCurrentTimeMs,
    setDurationMs,
    setControlsHeightPx,
    setIsPlaying,
    setIsImporting,
    setStatusMessage,
    setIsFileMenuOpen,
    setRecentVideos,
    setTimelineFromProject: ({ durationMs: projectDurationMs, cutsMs: projectCuts, retainedRanges }) => {
      if (retainedRanges.length > 0 || projectCuts.length === 0) {
        setRangesFromProject(retainedRanges);
        return;
      }

      setCutsFromProject(projectCuts, projectDurationMs);
    },
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
      clearSelectedSegment();
      setShouldResetTimelineOnMetadata(true);
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
      clearSelectedSegment();
      setShouldResetTimelineOnMetadata(true);
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

  const cutAtPlayhead = useCallback(() => {
    if (!hasVideo || !hasRetainedSegments) {
      return;
    }

    const didCut = addCutAt(currentTimeMs);
    if (!didCut) {
      setStatusMessage("Cannot cut here. Move away from timeline boundaries or existing cuts.");
      return;
    }

    markProjectDirty();
    setStatusMessage(`Cut added at ${formatClockTime(currentTimeMs)}.`);
  }, [hasVideo, hasRetainedSegments, addCutAt, currentTimeMs, markProjectDirty]);

  const deleteSelectedSegment = useCallback(() => {
    if (!selectedSegmentId) {
      return;
    }

    const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId);
    if (!selectedSegment) {
      clearSelectedSegment();
      return;
    }

    const didDelete = deleteSegmentById(selectedSegmentId);
    if (!didDelete) {
      return;
    }

    clearSelectedSegment();
    markProjectDirty();

    const nextRanges = ranges.filter((range) => range.id !== selectedSegmentId);
    if (nextRanges.length === 0) {
      videoRef.current?.pause();
      setIsPlaying(false);
      setCurrentTimeMs(0);
      setStatusMessage("No retained segments. Add/import timeline data to continue editing.");
      return;
    }

    const nextEditedDurationMs = nextRanges.reduce(
      (totalDuration, range) => totalDuration + Math.max(range.endMs - range.startMs, 0),
      0,
    );
    const targetEditedMs = clampNumber(currentEditedTimeMs, 0, nextEditedDurationMs);

    let editedCursorMs = 0;
    let nextSourceTimeMs = nextRanges[nextRanges.length - 1].endMs;

    for (let index = 0; index < nextRanges.length; index += 1) {
      const range = nextRanges[index];
      const rangeDurationMs = Math.max(range.endMs - range.startMs, 0);
      const nextEditedCursorMs = editedCursorMs + rangeDurationMs;

      if (targetEditedMs <= nextEditedCursorMs) {
        nextSourceTimeMs = range.startMs + (targetEditedMs - editedCursorMs);
        break;
      }

      editedCursorMs = nextEditedCursorMs;
    }

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.currentTime = nextSourceTimeMs / 1000;
    }
    setCurrentTimeMs(nextSourceTimeMs);

    setStatusMessage(
      `Deleted segment ${formatClockTime(selectedSegment.sourceStartMs)} - ${formatClockTime(selectedSegment.sourceEndMs)}.`,
    );
  }, [
    currentEditedTimeMs,
    selectedSegmentId,
    segments,
    ranges,
    clearSelectedSegment,
    deleteSegmentById,
    markProjectDirty,
  ]);

  const undoTimelineChange = useCallback(() => {
    const didUndo = undo();
    if (!didUndo) {
      return;
    }

    clearSelectedSegment();
    markProjectDirty();
    setPendingTimelineSyncEditedMs(currentEditedTimeMs);
    setStatusMessage("Undo timeline change.");
  }, [undo, clearSelectedSegment, markProjectDirty, currentEditedTimeMs]);

  const redoTimelineChange = useCallback(() => {
    const didRedo = redo();
    if (!didRedo) {
      return;
    }

    clearSelectedSegment();
    markProjectDirty();
    setPendingTimelineSyncEditedMs(currentEditedTimeMs);
    setStatusMessage("Redo timeline change.");
  }, [redo, clearSelectedSegment, markProjectDirty, currentEditedTimeMs]);

  useEffect(() => {
    function handleEditorShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingIntoField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingIntoField) {
        return;
      }

      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
      const isRedoPrimary =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z";
      const isRedoSecondary = event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "y";

      if (isUndo) {
        event.preventDefault();
        undoTimelineChange();
        return;
      }

      if (isRedoPrimary || isRedoSecondary) {
        event.preventDefault();
        redoTimelineChange();
        return;
      }

      if (!selectedSegmentId) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      event.preventDefault();
      deleteSelectedSegment();
    }

    window.addEventListener("keydown", handleEditorShortcuts);
    return () => window.removeEventListener("keydown", handleEditorShortcuts);
  }, [selectedSegmentId, deleteSelectedSegment, undoTimelineChange, redoTimelineChange]);

  useEffect(() => {
    if (pendingTimelineSyncEditedMs === null) {
      return;
    }

    if (!hasRetainedSegments) {
      videoRef.current?.pause();
      setIsPlaying(false);
      setCurrentTimeMs(0);
      setPendingTimelineSyncEditedMs(null);
      return;
    }

    const sourceTimeMs = editedMsToSourceMs(pendingTimelineSyncEditedMs);
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.currentTime = sourceTimeMs / 1000;
    }

    setCurrentTimeMs(sourceTimeMs);
    setPendingTimelineSyncEditedMs(null);
  }, [pendingTimelineSyncEditedMs, editedMsToSourceMs, hasRetainedSegments]);

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
            clearSelectedSegment();
            setShouldResetTimelineOnMetadata(false);
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
            if (shouldResetTimelineOnMetadata) {
              resetToFullDuration(loadedDurationMs);
              setShouldResetTimelineOnMetadata(false);
            }
            setCurrentTimeMs(applyPendingProjectSeek(loadedDurationMs));
            setStatusMessage(`Ready: ${videoName} (${formatClockTime(loadedDurationMs)}).`);
          }}
          onTimeUpdate={(timeMs) => {
            const alignedSourceTime = alignSourceTimeToRetainedRange(timeMs);

            if (alignedSourceTime === null) {
              const videoElement = videoRef.current;
              if (videoElement) {
                videoElement.pause();
              }
              setIsPlaying(false);
              setCurrentTimeMs(0);
              return;
            }

            if (alignedSourceTime !== timeMs) {
              const videoElement = videoRef.current;
              if (videoElement) {
                videoElement.currentTime = alignedSourceTime / 1000;
              }
              setCurrentTimeMs(alignedSourceTime);
              return;
            }

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
          currentTimeMs={currentEditedTimeMs}
          durationMs={editedDurationMs}
          playheadPercent={playheadPercent}
          statusMessage={statusMessage}
          cutsMs={cutsMs}
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          canCut={hasRetainedSegments && canCutAt(currentTimeMs)}
          canDeleteSelected={selectedSegmentId !== null}
          canUndo={canUndo}
          canRedo={canRedo}
          isTransportDisabled={!hasRetainedSegments}
          onUndo={undoTimelineChange}
          onRedo={redoTimelineChange}
          onSkipBack={() => skipBy(-2)}
          onCut={cutAtPlayhead}
          onDeleteSelected={deleteSelectedSegment}
          onTogglePlayback={togglePlayback}
          onSkipForward={() => skipBy(2)}
          onSeek={(editedTimeMs) => seekTo(editedMsToSourceMs(editedTimeMs))}
          onSelectSegment={selectSegment}
        />
      </div>
    </div>
  );
}

export default App;
