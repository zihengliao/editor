import { useCallback, useMemo, useRef, useState } from "react";
import { clampNumber } from "../utils/time";
import type { TimelineRange, TimelineSegment } from "./types";

const CUT_EPSILON_MS = 120;

function buildRangeId(index: number): string {
  return `range-${index}`;
}

function normalizeRanges(ranges: TimelineRange[], durationMs: number): TimelineRange[] {
  if (durationMs <= 0) {
    return [];
  }

  const sortedRanges = [...ranges]
    .filter((range) => Number.isFinite(range.startMs) && Number.isFinite(range.endMs))
    .map((range) => ({
      ...range,
      startMs: Math.floor(clampNumber(range.startMs, 0, durationMs)),
      endMs: Math.floor(clampNumber(range.endMs, 0, durationMs)),
    }))
    .sort((left, right) => left.startMs - right.startMs);

  const normalized: TimelineRange[] = [];

  for (let index = 0; index < sortedRanges.length; index += 1) {
    const range = sortedRanges[index];
    const previous = normalized[normalized.length - 1];
    const startMs = previous ? Math.max(range.startMs, previous.endMs) : range.startMs;
    const endMs = Math.max(startMs, range.endMs);

    if (endMs - startMs <= 0) {
      continue;
    }

    normalized.push({
      id: range.id,
      startMs,
      endMs,
    });
  }

  return normalized;
}

function buildRangesFromCuts(cutsMs: number[], durationMs: number): TimelineRange[] {
  if (durationMs <= 0) {
    return [];
  }

  const uniqueSortedCuts = [...cutsMs]
    .filter((cut) => Number.isFinite(cut))
    .map((cut) => Math.floor(cut))
    .sort((a, b) => a - b)
    .filter((cut, index, allCuts) => index === 0 || cut !== allCuts[index - 1])
    .filter((cut) => cut > CUT_EPSILON_MS && cut < durationMs - CUT_EPSILON_MS);

  const boundaries = [0, ...uniqueSortedCuts, durationMs];
  const ranges: TimelineRange[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index];
    const endMs = boundaries[index + 1];
    if (endMs - startMs <= 0) {
      continue;
    }

    ranges.push({
      id: buildRangeId(index),
      startMs,
      endMs,
    });
  }

  return ranges;
}

function buildSegments(ranges: TimelineRange[]): TimelineSegment[] {
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

export function useTimelineCuts(durationMs: number) {
  const rangeIdRef = useRef(0);
  const [ranges, setRanges] = useState<TimelineRange[]>([]);

  const nextRangeId = useCallback(() => {
    rangeIdRef.current += 1;
    return buildRangeId(rangeIdRef.current);
  }, []);

  const normalizedRanges = useMemo(
    () => normalizeRanges(ranges, durationMs),
    [ranges, durationMs],
  );
  const segments = useMemo(() => buildSegments(normalizedRanges), [normalizedRanges]);
  const editedDurationMs = useMemo(
    () => segments.reduce((total, segment) => total + segment.durationMs, 0),
    [segments],
  );
  const cutsMs = useMemo(
    () => segments.slice(0, -1).map((segment) => segment.endMs),
    [segments],
  );

  const sourceMsToEditedMs = useCallback(
    (sourceTimeMs: number) => {
      if (normalizedRanges.length === 0) {
        return 0;
      }

      const safeSourceTime = Math.floor(sourceTimeMs);
      let editedCursor = 0;

      for (let index = 0; index < normalizedRanges.length; index += 1) {
        const range = normalizedRanges[index];
        const rangeDuration = range.endMs - range.startMs;

        if (safeSourceTime < range.startMs) {
          return editedCursor;
        }

        if (safeSourceTime <= range.endMs) {
          return editedCursor + (safeSourceTime - range.startMs);
        }

        editedCursor += rangeDuration;
      }

      return editedDurationMs;
    },
    [editedDurationMs, normalizedRanges],
  );

  const editedMsToSourceMs = useCallback(
    (editedTimeMs: number) => {
      if (normalizedRanges.length === 0) {
        return 0;
      }

      const safeEditedMs = Math.floor(clampNumber(editedTimeMs, 0, Math.max(editedDurationMs, 0)));
      let editedCursor = 0;

      for (let index = 0; index < normalizedRanges.length; index += 1) {
        const range = normalizedRanges[index];
        const rangeDuration = range.endMs - range.startMs;
        const nextEditedCursor = editedCursor + rangeDuration;

        if (safeEditedMs <= nextEditedCursor) {
          return range.startMs + (safeEditedMs - editedCursor);
        }

        editedCursor = nextEditedCursor;
      }

      const lastRange = normalizedRanges[normalizedRanges.length - 1];
      return lastRange.endMs;
    },
    [editedDurationMs, normalizedRanges],
  );

  const alignSourceTimeToRetainedRange = useCallback(
    (sourceTimeMs: number) => {
      if (normalizedRanges.length === 0) {
        return null;
      }

      const safeSourceTime = Math.floor(clampNumber(sourceTimeMs, 0, durationMs));

      for (let index = 0; index < normalizedRanges.length; index += 1) {
        const range = normalizedRanges[index];

        if (safeSourceTime >= range.startMs && safeSourceTime <= range.endMs) {
          return safeSourceTime;
        }

        if (safeSourceTime < range.startMs) {
          return range.startMs;
        }
      }

      return null;
    },
    [durationMs, normalizedRanges],
  );

  function canCutAt(sourceTimeMs: number): boolean {
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

    if (distanceFromStart <= CUT_EPSILON_MS || distanceFromEnd <= CUT_EPSILON_MS) {
      return false;
    }

    return true;
  }

  function addCutAt(sourceTimeMs: number): boolean {
    const safeSourceTime = Math.floor(sourceTimeMs);
    if (!canCutAt(safeSourceTime)) {
      return false;
    }

    setRanges((currentRanges) => {
      const nextRanges: TimelineRange[] = [];

      for (let index = 0; index < currentRanges.length; index += 1) {
        const range = currentRanges[index];
        if (safeSourceTime <= range.startMs || safeSourceTime >= range.endMs) {
          nextRanges.push(range);
          continue;
        }

        nextRanges.push(
          { id: nextRangeId(), startMs: range.startMs, endMs: safeSourceTime },
          { id: nextRangeId(), startMs: safeSourceTime, endMs: range.endMs },
        );
      }

      return normalizeRanges(nextRanges, durationMs);
    });

    return true;
  }

  function deleteSegmentById(segmentId: string): boolean {
    if (!normalizedRanges.some((range) => range.id === segmentId)) {
      return false;
    }

    setRanges((currentRanges) => currentRanges.filter((range) => range.id !== segmentId));
    return true;
  }

  function setCutsFromProject(projectCutsMs: number[], sourceDurationMs?: number) {
    const effectiveDurationMs =
      sourceDurationMs && Number.isFinite(sourceDurationMs) && sourceDurationMs > 0
        ? Math.floor(sourceDurationMs)
        : durationMs > 0
          ? durationMs
          : Number.MAX_SAFE_INTEGER;

    const projectRanges = buildRangesFromCuts(projectCutsMs, effectiveDurationMs);
    rangeIdRef.current = projectRanges.length;
    setRanges(projectRanges);
  }

  function setRangesFromProject(projectRanges: Array<{ startMs: number; endMs: number }>) {
    const nextRanges = normalizeRanges(
      projectRanges.map((range, index) => ({
        id: buildRangeId(index),
        startMs: range.startMs,
        endMs: range.endMs,
      })),
      Number.MAX_SAFE_INTEGER,
    );

    rangeIdRef.current = nextRanges.length;
    setRanges(nextRanges);
  }

  function resetToFullDuration(nextDurationMs?: number) {
    const targetDurationMs = Math.floor(
      Number.isFinite(nextDurationMs) ? (nextDurationMs as number) : durationMs,
    );

    if (targetDurationMs <= 0) {
      setRanges([]);
      return;
    }

    rangeIdRef.current = 0;
    setRanges([
      {
        id: buildRangeId(0),
        startMs: 0,
        endMs: targetDurationMs,
      },
    ]);
  }

  function clearCuts() {
    setRanges([]);
  }

  return {
    ranges: normalizedRanges,
    cutsMs,
    segments,
    editedDurationMs,
    sourceMsToEditedMs,
    editedMsToSourceMs,
    alignSourceTimeToRetainedRange,
    canCutAt,
    addCutAt,
    deleteSegmentById,
    setCutsFromProject,
    setRangesFromProject,
    resetToFullDuration,
    clearCuts,
  };
}
