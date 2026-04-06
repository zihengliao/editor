import type { EditorProjectFile } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseEditorProject(value: unknown): EditorProjectFile {
  if (!isRecord(value)) {
    throw new Error("Project file is invalid.");
  }

  if (value.version !== 1) {
    throw new Error("Unsupported project version.");
  }

  const media = value.media;
  const timeline = value.timeline;
  const ui = value.ui;

  if (!isRecord(media) || typeof media.sourcePath !== "string" || typeof media.fileName !== "string") {
    throw new Error("Project media metadata is invalid.");
  }

  if (!isRecord(timeline) || typeof timeline.currentTimeMs !== "number" || !Array.isArray(timeline.cutsMs)) {
    throw new Error("Project timeline metadata is invalid.");
  }

  if (!isRecord(ui) || typeof ui.controlsHeightPx !== "number") {
    throw new Error("Project UI metadata is invalid.");
  }

  return {
    version: 1,
    projectName: typeof value.projectName === "string" ? value.projectName : media.fileName,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    media: {
      sourcePath: media.sourcePath,
      fileName: media.fileName,
      durationMs: typeof media.durationMs === "number" ? media.durationMs : 0,
    },
    timeline: {
      currentTimeMs: timeline.currentTimeMs,
      cutsMs: timeline.cutsMs.filter((point): point is number => typeof point === "number"),
    },
    ui: {
      controlsHeightPx: ui.controlsHeightPx,
    },
  };
}
