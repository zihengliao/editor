const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const ffmpegPath = require("ffmpeg-static");
const { setupAppMenu } = require("./menu/appMenu.cjs");

const IPC_CHANNELS = {
  OPEN_VIDEO: "video:open",
  OPEN_VIDEO_PATH: "video:openFromPath",
  SAVE_PROJECT: "project:save",
  LOAD_PROJECT: "project:load",
  TO_FILE_URL: "path:toFileUrl",
  EXPORT_CLIP: "video:exportClip",
  EXPORT_PROGRESS: "video:exportProgress",
  OPEN_TAGGER_WINDOW: "window:openTagger",
};

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let taggerWindow = null;

/**
 * Converts milliseconds into an ffmpeg-friendly timestamp.
 * Example output: 00:10:23.500
 */
function millisecondsToTimestamp(totalMs) {
  const safeMs = Math.max(0, Math.floor(totalMs));
  const hours = Math.floor(safeMs / 3_600_000)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((safeMs % 60_000) / 1_000)
    .toString()
    .padStart(2, "0");
  const milliseconds = (safeMs % 1_000).toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function parseFfmpegTimeToSeconds(timestamp) {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) {
    return 0;
  }

  const [, hh, mm, ss] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
}

/**
 * Builds a deterministic proxy path so re-importing the same source
 * can safely overwrite the previous playback proxy file.
 */
function getPlaybackProxyPath(sourcePath, sourceStats) {
  const safeBaseName = path
    .basename(sourcePath, path.extname(sourcePath))
    .replace(/[^a-z0-9-_]+/gi, "_")
    .slice(0, 48);

  const cacheKey = createHash("sha1")
    .update(`${sourcePath}|${sourceStats.size}|${sourceStats.mtimeMs}`)
    .digest("hex")
    .slice(0, 16);

  const playbackCacheDir = path.join(app.getPath("userData"), "playback-proxies");
  return {
    playbackCacheDir,
    proxyPath: path.join(playbackCacheDir, `${safeBaseName || "video"}-${cacheKey}.mp4`),
  };
}

function transcodeToPlaybackProxy({ inputPath, outputPath }) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary was not found. Reinstall dependencies and try again."));
      return;
    }

    const args = [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      // Keep the source resolution. Padding only prevents odd-dimension
      // failures with yuv420p and does not crop image content.
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    const ffmpegProcess = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    let stderrLog = "";

    ffmpegProcess.stderr.on("data", (buffer) => {
      stderrLog += buffer.toString();
    });

    ffmpegProcess.on("error", (error) => {
      reject(error);
    });

    ffmpegProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      const message = stderrLog.trim().split(/\r?\n/).slice(-8).join("\n");
      reject(new Error(message || `ffmpeg import failed with exit code ${exitCode}`));
    });
  });
}

async function prepareVideoForPlayback(filePath) {
  const sourceStats = await fs.stat(filePath);
  const { playbackCacheDir, proxyPath } = getPlaybackProxyPath(filePath, sourceStats);

  await fs.mkdir(playbackCacheDir, { recursive: true });
  await transcodeToPlaybackProxy({
    inputPath: filePath,
    outputPath: proxyPath,
  });

  const proxyUrl = pathToFileURL(proxyPath);
  proxyUrl.searchParams.set("v", String(Date.now()));

  return {
    path: filePath,
    name: path.basename(filePath),
    url: proxyUrl.toString(),
  };
}

/**
 * Runs ffmpeg to export a clipped segment and pushes progress updates
 * back to the renderer so the UI can show a progress bar.
 */
function exportClipWithFfmpeg({ inputPath, outputPath, startMs, endMs, onProgress }) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg binary was not found. Reinstall dependencies and try again."));
      return;
    }

    const clipDurationSeconds = Math.max((endMs - startMs) / 1000, 0.25);
    const args = [
      "-y",
      "-i",
      inputPath,
      // Keep -ss/-to after -i for frame-accurate cuts.
      "-ss",
      millisecondsToTimestamp(startMs),
      "-to",
      millisecondsToTimestamp(endMs),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    const ffmpegProcess = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    let stderrLog = "";

    ffmpegProcess.stderr.on("data", (buffer) => {
      const text = buffer.toString();
      stderrLog += text;

      const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
      if (!timeMatch) {
        return;
      }

      const elapsedSeconds = parseFfmpegTimeToSeconds(timeMatch[1]);
      const progress = Math.min(elapsedSeconds / clipDurationSeconds, 1);
      onProgress(progress);
    });

    ffmpegProcess.on("error", (error) => {
      reject(error);
    });

    ffmpegProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        onProgress(1);
        resolve();
        return;
      }

      const message = stderrLog.trim().split(/\r?\n/).slice(-4).join("\n");
      reject(new Error(message || `ffmpeg failed with exit code ${exitCode}`));
    });
  });
}

function createMainWindow() {
  const isMac = process.platform === "darwin";

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#e3e5e8",
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    titleBarOverlay: isMac
      ? false
      : {
          color: "#14181e",
          symbolColor: "#d8dee8",
          height: 32,
        },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Demo app: allow loading local playback proxies from renderer.
      webSecurity: false,
    },
  });

  if (isDev) {
    // Make DevTools easy to open during development.
    mainWindow.webContents.openDevTools({ mode: "detach" });

    mainWindow.webContents.on("before-input-event", (event, input) => {
      const normalizedKey = String(input.key || "").toUpperCase();
      const isInspectorShortcut =
        input.type === "keyDown" &&
        (input.control || input.meta) &&
        input.shift &&
        ["I", "J"].includes(normalizedKey);

      if (!isInspectorShortcut) {
        return;
      }

      event.preventDefault();

      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    });

    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function createTaggerWindow() {
  if (taggerWindow && !taggerWindow.isDestroyed()) {
    taggerWindow.focus();
    return;
  }

  taggerWindow = new BrowserWindow({
    width: 520,
    height: 700,
    minWidth: 420,
    minHeight: 500,
    title: "CourtCut Tagger",
    autoHideMenuBar: true,
    backgroundColor: "#161b22",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    url.searchParams.set("view", "tagger");
    taggerWindow.loadURL(url.toString());
  } else {
    taggerWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      query: { view: "tagger" },
    });
  }

  taggerWindow.on("closed", () => {
    taggerWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.OPEN_VIDEO, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Video Files",
          extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    return prepareVideoForPlayback(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_TAGGER_WINDOW, async () => {
  createTaggerWindow();
  return { ok: true };
});

  ipcMain.handle(IPC_CHANNELS.OPEN_VIDEO_PATH, async (_event, videoPath) => {
    if (!videoPath || typeof videoPath !== "string") {
      return null;
    }

    return prepareVideoForPlayback(videoPath);
  });

  ipcMain.handle(IPC_CHANNELS.TO_FILE_URL, async (_event, filePath) => {
    if (!filePath || typeof filePath !== "string") {
      return null;
    }

    return pathToFileURL(filePath).toString();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PROJECT, async (_event, payload) => {
    const { project, suggestedName } = payload ?? {};
    if (!project || typeof project !== "object") {
      throw new Error("Invalid project payload.");
    }

    const result = await dialog.showSaveDialog({
      title: "Save Editing Session",
      defaultPath: suggestedName || "basketball-session.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await fs.writeFile(result.filePath, JSON.stringify(project, null, 2), "utf8");
    return { canceled: false, path: result.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.LOAD_PROJECT, async () => {
    const result = await dialog.showOpenDialog({
      title: "Open Editing Session",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const rawFile = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(rawFile);

    return {
      canceled: false,
      path: filePath,
      project: parsed,
    };
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CLIP, async (event, payload) => {
    const { inputPath, startMs, endMs } = payload ?? {};

    if (!inputPath || typeof inputPath !== "string") {
      throw new Error("No video input path was provided.");
    }

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new Error("Clip range is invalid. Ensure out-point is after in-point.");
    }

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const safeStart = Math.floor(startMs / 1000);
    const safeEnd = Math.floor(endMs / 1000);

    const saveResult = await dialog.showSaveDialog({
      title: "Export Clip",
      defaultPath: `${baseName}_clip_${safeStart}-${safeEnd}.mp4`,
      filters: [{ name: "MP4", extensions: ["mp4"] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    event.sender.send(IPC_CHANNELS.EXPORT_PROGRESS, 0);

    await exportClipWithFfmpeg({
      inputPath,
      outputPath: saveResult.filePath,
      startMs,
      endMs,
      onProgress: (value) => event.sender.send(IPC_CHANNELS.EXPORT_PROGRESS, value),
    });

    return {
      canceled: false,
      outputPath: saveResult.filePath,
    };
  });
}

app.whenReady().then(() => {
  setupAppMenu(app);
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
