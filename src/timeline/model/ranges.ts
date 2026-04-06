import { clampNumber } from "../../utils/time";
import type { TimelineRange } from "../types";
import { CUT_EPSILON_MS } from "./constants";
import { buildRangeId } from "./ids";

export function normalizeRanges(ranges: TimelineRange[], durationMs: number): TimelineRange[] {
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

export function buildRangesFromCuts(cutsMs: number[], durationMs: number): TimelineRange[] {
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
