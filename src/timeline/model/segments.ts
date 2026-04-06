import type { TimelineRange, TimelineSegment } from "../types";

export function buildSegments(ranges: TimelineRange[]): TimelineSegment[] {
  let editedCursorMs = 0;

  return ranges.map((range) => {
    const durationMs = Math.max(0, range.endMs - range.startMs);
    const segment: TimelineSegment = {
      id: range.id,
      startMs: editedCursorMs,
      endMs: editedCursorMs + durationMs,
      durationMs,
      sourceStartMs: range.startMs,
      sourceEndMs: range.endMs,
    };

    editedCursorMs += durationMs;
    return segment;
  });
}

export function buildCutsFromSegments(segments: TimelineSegment[]): number[] {
  return segments.slice(0, -1).map((segment) => segment.endMs);
}

export function getEditedDurationMs(segments: TimelineSegment[]): number {
  return segments.reduce((total, segment) => total + segment.durationMs, 0);
}
