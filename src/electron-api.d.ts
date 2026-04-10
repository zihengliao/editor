import type {
  EditorProject,
  ExportClipPayload,
  ExportClipResult,
  LoadProjectResult,
  SaveProjectResult,
  VideoFile,
} from "./types";
import type { CreateTagPayload, TagGroups, TagUpdateEvent } from "./tagging/types";

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
  getTags: () => Promise<{ tags: TagGroups }>;
  addTag: (payload: CreateTagPayload) => Promise<{ ok: boolean; tag: { stat: string; timeMs: number } }>;
  clearTags: () => Promise<{ ok: boolean }>;
  replaceTags: (tags: TagGroups) => Promise<{ ok: boolean }>;
  setEditedPlayheadMs: (timeMs: number) => Promise<{ ok: boolean }>;
  onTagsUpdated: (listener: (payload: TagUpdateEvent) => void) => () => void;
}

declare global {
  interface Window {
    coachEditor: CoachEditorApi;
  }
}

export {};
