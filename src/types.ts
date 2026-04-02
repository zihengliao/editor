export interface VideoFile {
  path: string;
  name: string;
  url: string;
}

export interface RecentVideo {
  path: string;
  name: string;
}

export interface Tag {
  id: string;
  label: string;
  timeMs: number;
  createdAt: string;
}

export interface ClipRange {
  startMs: number | null;
  endMs: number | null;
}

export interface EditorProject {
  version: 1;
  videoPath: string | null;
  tags: Tag[];
  clipRange: ClipRange;
  updatedAt: string;
}

export interface ExportClipPayload {
  inputPath: string;
  startMs: number;
  endMs: number;
}

export interface SaveProjectResult {
  canceled: boolean;
  path?: string;
}

export interface LoadProjectResult {
  canceled: boolean;
  path?: string;
  project?: EditorProject;
}

export interface ExportClipResult {
  canceled: boolean;
  outputPath?: string;
}
