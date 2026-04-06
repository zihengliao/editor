export interface EditorProjectMedia {
  sourcePath: string;
  fileName: string;
  durationMs: number;
}

export interface EditorProjectRetainedRange {
  startMs: number;
  endMs: number;
}

export interface EditorProjectTimeline {
  currentTimeMs: number;
  cutsMs: number[];
  retainedRanges: EditorProjectRetainedRange[];
}

export interface EditorProjectUi {
  controlsHeightPx: number;
}

export interface EditorProjectFile {
  version: 1;
  projectName: string;
  updatedAt: string;
  media: EditorProjectMedia;
  timeline: EditorProjectTimeline;
  ui: EditorProjectUi;
}
