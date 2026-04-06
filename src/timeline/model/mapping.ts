import { clampNumber } from "../../utils/time";
import type { TimelineRange } from "../types";

export function sourceMsToEditedMs(sourceTimeMs: number, ranges: TimelineRange[], editedDurationMs: number) {
  if (ranges.length === 0) {
    return 0;
  }

  const safeSourceTime = Math.floor(sourceTimeMs);
  let editedCursorMs = 0;

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const rangeDurationMs = range.endMs - range.startMs;

    if (safeSourceTime < range.startMs) {
      return editedCursorMs;
    }

    if (safeSourceTime <= range.endMs) {
      return editedCursorMs + (safeSourceTime - range.startMs);
    }

    editedCursorMs += rangeDurationMs;
  }

  return editedDurationMs;
}

export function editedMsToSourceMs(editedTimeMs: number, ranges: TimelineRange[], editedDurationMs: number) {
  if (ranges.length === 0) {
    return 0;
  }

  const safeEditedMs = Math.floor(clampNumber(editedTimeMs, 0, Math.max(editedDurationMs, 0)));
  let editedCursorMs = 0;

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    const rangeDurationMs = range.endMs - range.startMs;
    const nextEditedCursorMs = editedCursorMs + rangeDurationMs;

    if (safeEditedMs <= nextEditedCursorMs) {
      return range.startMs + (safeEditedMs - editedCursorMs);
    }

    editedCursorMs = nextEditedCursorMs;
  }

  return ranges[ranges.length - 1].endMs;
}

export function alignSourceTimeToRetainedRange(sourceTimeMs: number, ranges: TimelineRange[], durationMs: number) {
  if (ranges.length === 0) {
    return null;
  }

  const safeSourceTime = Math.floor(clampNumber(sourceTimeMs, 0, durationMs));

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];

    if (safeSourceTime >= range.startMs && safeSourceTime <= range.endMs) {
      return safeSourceTime;
    }

    if (safeSourceTime < range.startMs) {
      return range.startMs;
    }
  }

  return null;
}
