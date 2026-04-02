const { contextBridge, ipcRenderer } = require("electron");

const IPC_CHANNELS = {
  OPEN_VIDEO: "video:open",
  OPEN_VIDEO_PATH: "video:openFromPath",
  SAVE_PROJECT: "project:save",
  LOAD_PROJECT: "project:load",
  TO_FILE_URL: "path:toFileUrl",
  EXPORT_CLIP: "video:exportClip",
  EXPORT_PROGRESS: "video:exportProgress",
};

contextBridge.exposeInMainWorld("coachEditor", {
  openVideoFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_VIDEO),
  openVideoFromPath: (videoPath) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_VIDEO_PATH, videoPath),
  saveProject: (project, suggestedName) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_PROJECT, { project, suggestedName }),
  loadProject: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_PROJECT),
  toFileUrl: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.TO_FILE_URL, filePath),
  exportClip: (payload) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CLIP, payload),

  // The unsubscribe function keeps the renderer cleanup ergonomic.
  onExportProgress: (listener) => {
    const wrappedListener = (_event, progress) => listener(progress);
    ipcRenderer.on(IPC_CHANNELS.EXPORT_PROGRESS, wrappedListener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EXPORT_PROGRESS, wrappedListener);
    };
  },
});
