# CourtCut Footage Viewer

Desktop video viewer for basketball film review with a DaVinci-style layout.

## Current scope

- Open local video files (`.mp4`, `.mov`, `.mkv`, `.avi`, `.webm`, `.m4v`)
- Auto-transcode imports to an H.264/AAC playback proxy at source resolution
- Large center footage viewer
- Drag handle to resize viewer height
- Bottom transport bar with a playhead timeline
- Play/pause and small skip controls

## Stack

- Electron (desktop shell + native file picker)
- React + TypeScript + Vite (UI)

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Keyboard shortcuts

- `Space`: play/pause
- `Left Arrow`: back 2 seconds
- `Right Arrow`: forward 2 seconds
