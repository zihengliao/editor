import {
  BackIcon,
  CutIcon,
  DeleteIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from "./TransportIcons";
import { TimelineScrubber } from "./timeline/TimelineScrubber";
import { formatClockTime } from "../utils/time";
import type { TimelineSegment } from "../timeline/types";

interface PlayerControlsProps {
  hasVideo: boolean;
  isImporting: boolean;
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  playheadPercent: number;
  statusMessage: string;
  cutsMs: number[];
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  canCut: boolean;
  canDeleteSelected: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isTransportDisabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSkipBack: () => void;
  onCut: () => void;
  onDeleteSelected: () => void;
  onTogglePlayback: () => void;
  onSkipForward: () => void;
  onSeek: (timeMs: number) => void;
  onSelectSegment: (segmentId: string) => void;
}

export function PlayerControls({
  hasVideo,
  isImporting,
  isPlaying,
  currentTimeMs,
  durationMs,
  playheadPercent,
  statusMessage,
  cutsMs,
  segments,
  selectedSegmentId,
  canCut,
  canDeleteSelected,
  canUndo,
  canRedo,
  isTransportDisabled,
  onUndo,
  onRedo,
  onSkipBack,
  onCut,
  onDeleteSelected,
  onTogglePlayback,
  onSkipForward,
  onSeek,
  onSelectSegment,
}: PlayerControlsProps) {
  return (
    <footer className="grid h-full content-start gap-2.5 border-t border-[#303743] bg-gradient-to-b from-[#20252d] to-[#191e26] px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-[860px]:grid-cols-1 max-[860px]:justify-items-center max-[860px]:gap-2.5">
        <div className="min-w-0" aria-hidden="true" />

        <div className="flex items-center justify-center gap-2.5" aria-label="Playback controls">
          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onUndo}
            disabled={!canUndo || isImporting}
            aria-label="Undo"
          >
            <UndoIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onRedo}
            disabled={!canRedo || isImporting}
            aria-label="Redo"
          >
            <RedoIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onSkipBack}
            disabled={!hasVideo || isImporting || isTransportDisabled}
            aria-label="Skip backward 2 seconds"
          >
            <BackIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onCut}
            disabled={!hasVideo || isImporting || isTransportDisabled || !canCut}
            aria-label="Cut at playhead"
          >
            <CutIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onDeleteSelected}
            disabled={!hasVideo || isImporting || isTransportDisabled || !canDeleteSelected}
            aria-label="Delete selected segment"
          >
            <DeleteIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-[52px] place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onTogglePlayback}
            disabled={!hasVideo || isImporting || isTransportDisabled}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onSkipForward}
            disabled={!hasVideo || isImporting || isTransportDisabled}
            aria-label="Skip forward 2 seconds"
          >
            <ForwardIcon />
          </button>
        </div>

        <div
          className="justify-self-end text-[13px] text-[#9aa4b3] max-[860px]:justify-self-center"
          aria-live="polite"
        >
          {formatClockTime(currentTimeMs)} / {formatClockTime(durationMs)}
        </div>
      </div>

      <TimelineScrubber
        hasVideo={hasVideo}
        cutsMs={cutsMs}
        segments={segments}
        selectedSegmentId={selectedSegmentId}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        playheadPercent={playheadPercent}
        isDisabled={!hasVideo || isImporting}
        onSeek={onSeek}
        onSelectSegment={onSelectSegment}
      />

      <p className="text-xs text-[#9aa4b3]">{statusMessage}</p>
    </footer>
  );
}
