import { useCallback, useMemo, useRef } from "react";
import type { TimelineRange } from "./types";
import { CUT_EPSILON_MS } from "./model/constants";
import { buildRangeId } from "./model/ids";
import { alignSourceTimeToRetainedRange, editedMsToSourceMs, sourceMsToEditedMs } from "./model/mapping";
import { buildRangesFromCuts, normalizeRanges } from "./model/ranges";
import { buildCutsFromSegments, buildSegments, getEditedDurationMs } from "./model/segments";
import { useRangeHistory } from "./history/useRangeHistory";

function normalizeForCurrentDuration(ranges: TimelineRange[], durationMs: number): TimelineRange[] {
  if (durationMs <= 0) {
    return [];
  }

  return normalizeRanges(ranges, durationMs);
}

export function useTimelineCuts(durationMs: number) {
  const rangeIdRef = useRef(0);
  const {
    ranges,
    commit,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useRangeHistory([]);

  const normalizedRanges = useMemo(
    () => normalizeForCurrentDuration(ranges, durationMs),
    [ranges, durationMs],
  );
  const segments = useMemo(() => buildSegments(normalizedRanges), [normalizedRanges]);
  const editedDurationMs = useMemo(() => getEditedDurationMs(segments), [segments]);
  const cutsMs = useMemo(() => buildCutsFromSegments(segments), [segments]);

  const sourceMsToEdited = useCallback(
    (sourceTimeMs: number) => sourceMsToEditedMs(sourceTimeMs, normalizedRanges, editedDurationMs),
    [normalizedRanges, editedDurationMs],
  );

  const editedToSourceMs = useCallback(
    (editedTimeMs: number) => editedMsToSourceMs(editedTimeMs, normalizedRanges, editedDurationMs),
    [normalizedRanges, editedDurationMs],
  );

  const alignSourceTime = useCallback(
    (sourceTimeMs: number) => alignSourceTimeToRetainedRange(sourceTimeMs, normalizedRanges, durationMs),
    [normalizedRanges, durationMs],
  );

  const nextRangeId = useCallback(() => {
    rangeIdRef.current += 1;
    return buildRangeId(rangeIdRef.current);
  }, []);

  const resetRangeIdCounter = useCallback((nextRanges: TimelineRange[]) => {
    rangeIdRef.current = nextRanges.length;
  }, []);

  const canCutAt = useCallback(
    (sourceTimeMs: number): boolean => {
      if (durationMs <= 0 || normalizedRanges.length === 0) {
        return false;
      }

      const safeSourceTime = Math.floor(sourceTimeMs);
      const containingRange = normalizedRanges.find(
        (range) => safeSourceTime > range.startMs && safeSourceTime < range.endMs,
      );

      if (!containingRange) {
        return false;
      }

      const distanceFromStart = safeSourceTime - containingRange.startMs;
      const distanceFromEnd = containingRange.endMs - safeSourceTime;

      return distanceFromStart > CUT_EPSILON_MS && distanceFromEnd > CUT_EPSILON_MS;
    },
    [durationMs, normalizedRanges],
  );

  const addCutAt = useCallback(
    (sourceTimeMs: number): boolean => {
      const safeSourceTime = Math.floor(sourceTimeMs);
      if (!canCutAt(safeSourceTime)) {
        return false;
      }

      const nextRanges: TimelineRange[] = [];

      for (let index = 0; index < ranges.length; index += 1) {
        const range = ranges[index];

        if (safeSourceTime <= range.startMs || safeSourceTime >= range.endMs) {
          nextRanges.push(range);
          continue;
        }

        nextRanges.push(
          { id: nextRangeId(), startMs: range.startMs, endMs: safeSourceTime },
          { id: nextRangeId(), startMs: safeSourceTime, endMs: range.endMs },
        );
      }

      commit(normalizeForCurrentDuration(nextRanges, durationMs));
      return true;
    },
    [canCutAt, ranges, nextRangeId, commit, durationMs],
  );

  const deleteSegmentById = useCallback(
    (segmentId: string): boolean => {
      if (!ranges.some((range) => range.id === segmentId)) {
        return false;
      }

      commit(ranges.filter((range) => range.id !== segmentId));
      return true;
    },
    [ranges, commit],
  );

  const setCutsFromProject = useCallback(
    (projectCutsMs: number[], sourceDurationMs?: number) => {
      const effectiveDurationMs =
        sourceDurationMs && Number.isFinite(sourceDurationMs) && sourceDurationMs > 0
          ? Math.floor(sourceDurationMs)
          : durationMs > 0
            ? durationMs
            : Number.MAX_SAFE_INTEGER;

      const projectRanges = buildRangesFromCuts(projectCutsMs, effectiveDurationMs);
      resetRangeIdCounter(projectRanges);
      reset(projectRanges);
    },
    [durationMs, resetRangeIdCounter, reset],
  );

  const setRangesFromProject = useCallback(
    (projectRanges: Array<{ startMs: number; endMs: number }>) => {
      const nextRanges = normalizeRanges(
        projectRanges.map((range, index) => ({
          id: buildRangeId(index),
          startMs: range.startMs,
          endMs: range.endMs,
        })),
        Number.MAX_SAFE_INTEGER,
      );

      resetRangeIdCounter(nextRanges);
      reset(nextRanges);
    },
    [resetRangeIdCounter, reset],
  );

  const resetToFullDuration = useCallback(
    (nextDurationMs?: number) => {
      const targetDurationMs = Math.floor(
        Number.isFinite(nextDurationMs) ? (nextDurationMs as number) : durationMs,
      );

      if (targetDurationMs <= 0) {
        reset([]);
        return;
      }

      const nextRanges = [{ id: buildRangeId(0), startMs: 0, endMs: targetDurationMs }];
      rangeIdRef.current = 1;
      reset(nextRanges);
    },
    [durationMs, reset],
  );

  const clearCuts = useCallback(() => {
    rangeIdRef.current = 0;
    reset([]);
  }, [reset]);

  return {
    ranges: normalizedRanges,
    cutsMs,
    segments,
    editedDurationMs,
    sourceMsToEditedMs: sourceMsToEdited,
    editedMsToSourceMs: editedToSourceMs,
    alignSourceTimeToRetainedRange: alignSourceTime,
    canCutAt,
    addCutAt,
    deleteSegmentById,
    setCutsFromProject,
    setRangesFromProject,
    resetToFullDuration,
    clearCuts,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
