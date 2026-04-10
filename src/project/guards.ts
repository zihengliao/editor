import type { EditorProjectFile } from "./types";
import type { TagGroups } from "../tagging/types";

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
  const tags = value.tags;

  if (!isRecord(media) || typeof media.sourcePath !== "string" || typeof media.fileName !== "string") {
    throw new Error("Project media metadata is invalid.");
  }

  if (!isRecord(timeline) || typeof timeline.currentTimeMs !== "number" || !Array.isArray(timeline.cutsMs)) {
    throw new Error("Project timeline metadata is invalid.");
  }

  if (!isRecord(ui) || typeof ui.controlsHeightPx !== "number") {
    throw new Error("Project UI metadata is invalid.");
  }

  const parsedCutsMs = timeline.cutsMs.filter((point): point is number => typeof point === "number");

  const parsedRetainedRanges = Array.isArray(timeline.retainedRanges)
    ? timeline.retainedRanges
        .filter(
          (range): range is { startMs: number; endMs: number } =>
            isRecord(range) && typeof range.startMs === "number" && typeof range.endMs === "number",
        )
        .map((range) => ({
          startMs: range.startMs,
          endMs: range.endMs,
        }))
    : [];

  const fallbackRetainedRanges = (() => {
    const durationMs = typeof media.durationMs === "number" ? media.durationMs : 0;
    if (durationMs <= 0) {
      return [];
    }

    const boundaries = [0, ...parsedCutsMs, durationMs].sort((left, right) => left - right);
    const ranges: Array<{ startMs: number; endMs: number }> = [];

    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const startMs = boundaries[index];
      const endMs = boundaries[index + 1];
      if (endMs > startMs) {
        ranges.push({ startMs, endMs });
      }
    }

    return ranges;
  })();

  const parsedTags: TagGroups = (() => {
    if (isRecord(tags)) {
      const groupedTags: TagGroups = {};

      for (const [label, values] of Object.entries(tags)) {
        if (!Array.isArray(values)) {
          continue;
        }

        const safeTimes = values
          .filter((timeMs): timeMs is number => typeof timeMs === "number")
          .map((timeMs) => Math.floor(timeMs));

        if (safeTimes.length > 0) {
          groupedTags[label] = safeTimes;
        }
      }

      return groupedTags;
    }

    // Backward compatibility for earlier array-based tag schema.
    if (Array.isArray(tags)) {
      const groupedTags: TagGroups = {};

      for (const entry of tags) {
        if (!isRecord(entry) || typeof entry.stat !== "string" || typeof entry.timeMs !== "number") {
          continue;
        }

        if (!groupedTags[entry.stat]) {
          groupedTags[entry.stat] = [];
        }

        groupedTags[entry.stat].push(Math.floor(entry.timeMs));
      }

      return groupedTags;
    }

    return {};
  })();

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
      cutsMs: parsedCutsMs,
      retainedRanges: parsedRetainedRanges.length > 0 ? parsedRetainedRanges : fallbackRetainedRanges,
    },
    ui: {
      controlsHeightPx: ui.controlsHeightPx,
    },
    tags: parsedTags,
  };
}
