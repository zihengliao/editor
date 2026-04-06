import { useCallback, useRef, useState } from "react";
import { buildProjectFile, buildSuggestedProjectFileName } from "./mapper";
import { parseEditorProject } from "./guards";
import type { RecentVideo, VideoFile } from "../types";
import { clampNumber } from "../utils/time";

interface UseProjectControllerParams {
  videoFile: VideoFile | null;
  currentTimeMs: number;
  durationMs: number;
  controlsHeightPx: number;
  setVideoFile: (video: VideoFile | null) => void;
  setCurrentTimeMs: (timeMs: number) => void;
  setDurationMs: (durationMs: number) => void;
  setControlsHeightPx: (heightPx: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsImporting: (isImporting: boolean) => void;
  setStatusMessage: (message: string) => void;
  setIsFileMenuOpen: (isOpen: boolean) => void;
  setRecentVideos: React.Dispatch<React.SetStateAction<RecentVideo[]>>;
  clampControlsHeight: (heightPx: number) => number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useProjectController({
  videoFile,
  currentTimeMs,
  durationMs,
  controlsHeightPx,
  setVideoFile,
  setCurrentTimeMs,
  setDurationMs,
  setControlsHeightPx,
  setIsPlaying,
  setIsImporting,
  setStatusMessage,
  setIsFileMenuOpen,
  setRecentVideos,
  clampControlsHeight,
  videoRef,
}: UseProjectControllerParams) {
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const pendingSeekMsRef = useRef<number | null>(null);

  const markProjectDirty = useCallback(() => {
    setIsProjectDirty(true);
  }, []);

  const clearProjectDirty = useCallback(() => {
    setIsProjectDirty(false);
  }, []);

  const importProject = useCallback(async () => {
    setIsFileMenuOpen(false);

    const result = await window.coachEditor.loadProject();
    if (result.canceled || !result.project) {
      return;
    }

    const parsedProject = parseEditorProject(result.project);

    setIsImporting(true);
    setIsPlaying(false);
    setStatusMessage("Importing project...");

    try {
      const loadedVideo = await window.coachEditor.openVideoFromPath(parsedProject.media.sourcePath);
      if (!loadedVideo) {
        setStatusMessage("Project loaded, but source video was not found.");
        return;
      }

      setVideoFile(loadedVideo);
      setDurationMs(0);
      pendingSeekMsRef.current = Math.max(0, parsedProject.timeline.currentTimeMs);
      setCurrentTimeMs(pendingSeekMsRef.current);
      setControlsHeightPx(clampControlsHeight(parsedProject.ui.controlsHeightPx));

      setRecentVideos((currentVideos) => {
        const deduped = currentVideos.filter((entry) => entry.path !== loadedVideo.path);
        return [{ path: loadedVideo.path, name: loadedVideo.name }, ...deduped].slice(0, 8);
      });

      setStatusMessage(`Imported project ${parsedProject.projectName}.`);
      clearProjectDirty();
    } catch (error) {
      setStatusMessage(`Could not import project: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
    }
  }, [
    clearProjectDirty,
    clampControlsHeight,
    setControlsHeightPx,
    setCurrentTimeMs,
    setDurationMs,
    setIsFileMenuOpen,
    setIsImporting,
    setIsPlaying,
    setRecentVideos,
    setStatusMessage,
    setVideoFile,
  ]);

  const saveProject = useCallback(async () => {
    setIsFileMenuOpen(false);

    if (!videoFile) {
      setStatusMessage("Load a video before saving a project.");
      return;
    }

    const project = buildProjectFile({
      videoFile,
      currentTimeMs,
      durationMs,
      controlsHeightPx,
      cutsMs: [],
    });

    const result = await window.coachEditor.saveProject(
      project,
      buildSuggestedProjectFileName(videoFile.name),
    );

    if (result.canceled) {
      return;
    }

    setStatusMessage(`Project saved to ${result.path}.`);
    clearProjectDirty();
  }, [
    clearProjectDirty,
    controlsHeightPx,
    currentTimeMs,
    durationMs,
    setIsFileMenuOpen,
    setStatusMessage,
    videoFile,
  ]);

  const applyPendingProjectSeek = useCallback(
    (loadedDurationMs: number) => {
      const pendingSeek = pendingSeekMsRef.current;
      if (pendingSeek === null) {
        return 0;
      }

      const clampedSeek = clampNumber(pendingSeek, 0, loadedDurationMs);
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.currentTime = clampedSeek / 1000;
      }

      pendingSeekMsRef.current = null;
      return clampedSeek;
    },
    [videoRef],
  );

  return {
    isProjectDirty,
    markProjectDirty,
    clearProjectDirty,
    importProject,
    saveProject,
    applyPendingProjectSeek,
  };
}
