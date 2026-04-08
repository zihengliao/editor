import type {
  EditorProject,
  ExportClipPayload,
  ExportClipResult,
  LoadProjectResult,
  SaveProjectResult,
  VideoFile,
} from "./types";

interface CoachEditorApi {
  openVideoFile: () => Promise<VideoFile | null>;
  openVideoFromPath: (videoPath: string) => Promise<VideoFile | null>;
  saveProject: (
    project: EditorProject,
    suggestedName?: string,
  ) => Promise<SaveProjectResult>;
  loadProject: () => Promise<LoadProjectResult>;
  toFileUrl: (filePath: string) => Promise<string | null>;
  exportClip: (payload: ExportClipPayload) => Promise<ExportClipResult>;
  onExportProgress: (listener: (progress: number) => void) => () => void;
  openTaggerWindow: () => Promise<{ ok: boolean }>;
}

declare global {
  interface Window {
    coachEditor: CoachEditorApi;
  }
}

export {};
