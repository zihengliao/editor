import type { EditorProjectFile } from "./types";
import type { VideoFile } from "../types";
import type { TagGroups } from "../tagging/types";

interface CreateProjectParams {
  videoFile: VideoFile;
  currentTimeMs: number;
  durationMs: number;
  controlsHeightPx: number;
  cutsMs: number[];
  retainedRanges: Array<{ startMs: number; endMs: number }>;
  tags: TagGroups;
}

export function buildProjectFile({
  videoFile,
  currentTimeMs,
  durationMs,
  controlsHeightPx,
  cutsMs,
  retainedRanges,
  tags,
}: CreateProjectParams): EditorProjectFile {
  const projectName = videoFile.name.replace(/\.[^.]+$/, "");

  return {
    version: 1,
    projectName,
    updatedAt: new Date().toISOString(),
    media: {
      sourcePath: videoFile.path,
      fileName: videoFile.name,
      durationMs,
    },
    timeline: {
      currentTimeMs,
      cutsMs,
      retainedRanges,
    },
    ui: {
      controlsHeightPx,
    },
    tags,
  };
}

export function buildSuggestedProjectFileName(videoName: string): string {
  return `${videoName.replace(/\.[^.]+$/, "")}.courtcut.json`;
}
