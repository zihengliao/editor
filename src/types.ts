import type { EditorProjectFile } from "./project/types";

export interface VideoFile {
  path: string;
  name: string;
  url: string;
}

export interface RecentVideo {
  path: string;
  name: string;
}

export type EditorProject = EditorProjectFile;

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
