import type { TimelineRange } from "../types";

export interface RangeHistoryState {
  past: TimelineRange[][];
  present: TimelineRange[];
  future: TimelineRange[][];
}
