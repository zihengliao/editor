import { useCallback, useState } from "react";
import type { TimelineSegment } from "./types";

/**
 * Keeps timeline segment selection isolated from cut math.
 *
 * Why a separate hook?
 * - Cut creation/removal (timeline structure) and segment selection (UI state)
 *   are different concerns and evolve independently.
 * - This keeps App.tsx and timeline rendering components easier to reason about.
 */
export function useTimelineSelection(segments: TimelineSegment[]) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  /**
   * Single-select behavior: selecting one segment replaces any previous selection.
   */
  const selectSegment = useCallback((segmentId: string) => {
    setSelectedSegmentId(segmentId);
  }, []);

  /**
   * Explicit clear helper for workflow transitions (open/import/reset actions).
   */
  const clearSelectedSegment = useCallback(() => {
    setSelectedSegmentId(null);
  }, []);

  // Keep selection safe without triggering additional render loops.
  const effectiveSelectedSegmentId =
    selectedSegmentId && segments.some((segment) => segment.id === selectedSegmentId)
      ? selectedSegmentId
      : null;

  return {
    selectedSegmentId: effectiveSelectedSegmentId,
    selectSegment,
    clearSelectedSegment,
  };
}
