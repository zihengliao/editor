const { contextBridge, ipcRenderer } = require("electron");

const IPC_CHANNELS = {
  OPEN_VIDEO: "video:open",
  OPEN_VIDEO_PATH: "video:openFromPath",
  SAVE_PROJECT: "project:save",
  LOAD_PROJECT: "project:load",
  TO_FILE_URL: "path:toFileUrl",
  EXPORT_CLIP: "video:exportClip",
  EXPORT_PROGRESS: "video:exportProgress",
  OPEN_TAGGER_WINDOW: "window:openTagger",
  TAG_GET_ALL: "tag:getAll",
  TAG_ADD: "tag:add",
  TAG_CLEAR: "tag:clear",
  TAG_REPLACE: "tag:replace",
  TAG_UPDATED: "tag:updated",
  TAG_SET_EDITED_PLAYHEAD: "tag:setEditedPlayhead",
};

contextBridge.exposeInMainWorld("coachEditor", {
  openVideoFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_VIDEO),
  openVideoFromPath: (videoPath) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_VIDEO_PATH, videoPath),
  saveProject: (project, suggestedName) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROJECT, { project, suggestedName }),
  loadProject: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROJECT),
  toFileUrl: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.TO_FILE_URL, filePath),
  exportClip: (payload) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CLIP, payload),
  openTaggerWindow: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_TAGGER_WINDOW),
  getTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_GET_ALL),
  addTag: (payload) => ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD, payload),
  clearTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_CLEAR),
  replaceTags: (tags) => ipcRenderer.invoke(IPC_CHANNELS.TAG_REPLACE, { tags }),
  setEditedPlayheadMs: (timeMs) => ipcRenderer.invoke(IPC_CHANNELS.TAG_SET_EDITED_PLAYHEAD, timeMs),
  
  // The unsubscribe function keeps the renderer cleanup ergonomic.
  onExportProgress: (listener) => {
    const wrappedListener = (_event, progress) => listener(progress);
    ipcRenderer.on(IPC_CHANNELS.EXPORT_PROGRESS, wrappedListener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EXPORT_PROGRESS, wrappedListener);
    };
  },

  onTagsUpdated: (listener) => {
    const wrappedListener = (_event, payload) => listener(payload);
    ipcRenderer.on(IPC_CHANNELS.TAG_UPDATED, wrappedListener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TAG_UPDATED, wrappedListener);
    };
  },
});
