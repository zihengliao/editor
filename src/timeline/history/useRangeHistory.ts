import { useCallback, useState } from "react";
import type { TimelineRange } from "../types";
import type { RangeHistoryState } from "./types";

const MAX_HISTORY_SIZE = 100;

function cloneRanges(ranges: TimelineRange[]): TimelineRange[] {
  return ranges.map((range) => ({ ...range }));
}

function areRangesEqual(left: TimelineRange[], right: TimelineRange[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftRange = left[index];
    const rightRange = right[index];
    if (
      leftRange.id !== rightRange.id ||
      leftRange.startMs !== rightRange.startMs ||
      leftRange.endMs !== rightRange.endMs
    ) {
      return false;
    }
  }

  return true;
}

export function useRangeHistory(initialRanges: TimelineRange[] = []) {
  const [history, setHistory] = useState<RangeHistoryState>({
    past: [],
    present: cloneRanges(initialRanges),
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const commit = useCallback((nextRanges: TimelineRange[]) => {
    setHistory((currentHistory) => {
      const safeNextRanges = cloneRanges(nextRanges);
      if (areRangesEqual(currentHistory.present, safeNextRanges)) {
        return currentHistory;
      }

      const nextPast = [...currentHistory.past, cloneRanges(currentHistory.present)].slice(
        -MAX_HISTORY_SIZE,
      );

      return {
        past: nextPast,
        present: safeNextRanges,
        future: [],
      };
    });
  }, []);

  const reset = useCallback((nextRanges: TimelineRange[]) => {
    setHistory({
      past: [],
      present: cloneRanges(nextRanges),
      future: [],
    });
  }, []);

  const undo = useCallback((): boolean => {
    let didUndo = false;
    setHistory((currentHistory) => {
      if (currentHistory.past.length === 0) {
        return currentHistory;
      }

      didUndo = true;
      const previousRanges = currentHistory.past[currentHistory.past.length - 1];
      const remainingPast = currentHistory.past.slice(0, -1);
      return {
        past: remainingPast,
        present: cloneRanges(previousRanges),
        future: [cloneRanges(currentHistory.present), ...currentHistory.future],
      };
    });

    return didUndo;
  }, []);

  const redo = useCallback((): boolean => {
    let didRedo = false;
    setHistory((currentHistory) => {
      if (currentHistory.future.length === 0) {
        return currentHistory;
      }

      didRedo = true;
      const nextRanges = currentHistory.future[0];
      const remainingFuture = currentHistory.future.slice(1);
      const nextPast = [...currentHistory.past, cloneRanges(currentHistory.present)].slice(
        -MAX_HISTORY_SIZE,
      );

      return {
        past: nextPast,
        present: cloneRanges(nextRanges),
        future: remainingFuture,
      };
    });

    return didRedo;
  }, []);

  return {
    ranges: history.present,
    commit,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
