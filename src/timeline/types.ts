export interface TimelineSegment {
  id: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
}

export interface TimelineRange {
  id: string;
  startMs: number;
  endMs: number;
}
