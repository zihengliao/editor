import { useMemo, useState } from "react";
import type { TimelineSegment } from "./types";

const CUT_EPSILON_MS = 120;

function normalizeCuts(cutsMs: number[], durationMs: number): number[] {
  // Keep cut points deterministic for rendering and project save/load:
  // 1) numeric only, 2) integer ms, 3) sorted, 4) unique.
  const uniqueSorted = [...cutsMs]
    .filter((cut) => Number.isFinite(cut))
    .map((cut) => Math.floor(cut))
    .sort((a, b) => a - b)
    .filter((cut, index, allCuts) => index === 0 || cut !== allCuts[index - 1]);

  if (durationMs <= 0) {
    return [];
  }

  // Prevent cuts too close to timeline boundaries to avoid tiny invalid segments.
  return uniqueSorted.filter((cut) => cut > CUT_EPSILON_MS && cut < durationMs - CUT_EPSILON_MS);
}

function buildSegments(cutsMs: number[], durationMs: number): TimelineSegment[] {
  if (durationMs <= 0) {
    return [];
  }

  // Segments are derived from cut boundaries, not edited destructively.
  // Example: cuts [10s, 25s] -> boundaries [0,10,25,end].
  const boundaries = [0, ...cutsMs, durationMs];
  const segments: TimelineSegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index];
    const endMs = boundaries[index + 1];
    segments.push({
      id: `segment-${index}-${startMs}`,
      startMs,
      endMs,
      durationMs: Math.max(endMs - startMs, 0),
    });
  }

  return segments;
}

export function useTimelineCuts(durationMs: number) {
  const [cutsMs, setCutsMs] = useState<number[]>([]);

  const normalizedCuts = useMemo(() => normalizeCuts(cutsMs, durationMs), [cutsMs, durationMs]);
  const segments = useMemo(() => buildSegments(normalizedCuts, durationMs), [normalizedCuts, durationMs]);

  function canCutAt(timeMs: number): boolean {
    if (durationMs <= 0) {
      return false;
    }

    if (timeMs <= CUT_EPSILON_MS || timeMs >= durationMs - CUT_EPSILON_MS) {
      return false;
    }

    // Avoid duplicate cuts at effectively the same visual position.
    return !normalizedCuts.some((cut) => Math.abs(cut - timeMs) <= CUT_EPSILON_MS);
  }

  function addCutAt(timeMs: number): boolean {
    const safeTime = Math.floor(timeMs);
    if (!canCutAt(safeTime)) {
      return false;
    }

    setCutsMs((currentCuts) => [...currentCuts, safeTime]);
    return true;
  }

  function setCutsFromProject(projectCutsMs: number[]) {
    setCutsMs(normalizeCuts(projectCutsMs, durationMs || Number.MAX_SAFE_INTEGER));
  }

  function clearCuts() {
    setCutsMs([]);
  }

  return {
    cutsMs: normalizedCuts,
    segments,
    canCutAt,
    addCutAt,
    setCutsFromProject,
    clearCuts,
  };
}
