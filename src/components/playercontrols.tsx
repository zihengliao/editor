import { BackIcon, ForwardIcon, PauseIcon, PlayIcon } from "./TransportIcons";
import { formatClockTime } from "../utils/time";

interface PlayerControlsProps {
  hasVideo: boolean;
  isImporting: boolean;
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  playheadPercent: number;
  statusMessage: string;
  onSkipBack: () => void;
  onTogglePlayback: () => void;
  onSkipForward: () => void;
  onSeek: (timeMs: number) => void;
}

export function PlayerControls({
  hasVideo,
  isImporting,
  isPlaying,
  currentTimeMs,
  durationMs,
  playheadPercent,
  statusMessage,
  onSkipBack,
  onTogglePlayback,
  onSkipForward,
  onSeek,
}: PlayerControlsProps) {
  return (
    <footer className="grid gap-2.5 border-t border-[#303743] bg-gradient-to-b from-[#20252d] to-[#191e26] px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-[860px]:grid-cols-1 max-[860px]:justify-items-center max-[860px]:gap-2.5">
        <div className="min-w-0" aria-hidden="true" />

        <div className="flex items-center justify-center gap-2.5" aria-label="Playback controls">
          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onSkipBack}
            disabled={!hasVideo || isImporting}
            aria-label="Skip backward 2 seconds"
          >
            <BackIcon />
          </button>

          <button
            type="button"
            className="grid h-10 w-[52px] place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onTogglePlayback}
            disabled={!hasVideo || isImporting}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="grid h-10 w-11 place-items-center rounded-lg border border-[#3a4352] bg-[#242a33] text-white transition enabled:hover:bg-[#2f3744] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onSkipForward}
            disabled={!hasVideo || isImporting}
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

      <div className="relative grid items-center">
        <div className="pointer-events-none absolute left-1.5 right-1.5 h-1.5 rounded-full bg-[#596273]" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#fb923c] to-[#f97316]"
            style={{ width: `${playheadPercent}%` }}
          />
        </div>

        <input
          type="range"
          className="h-4 w-full appearance-none bg-transparent accent-[#f97316] disabled:cursor-not-allowed disabled:opacity-45"
          min={0}
          max={Math.max(durationMs, 1)}
          step={10}
          value={Math.min(currentTimeMs, Math.max(durationMs, 1))}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={!hasVideo || isImporting}
          aria-label="Playback timeline"
        />
      </div>

      <p className="text-xs text-[#9aa4b3]">{statusMessage}</p>
    </footer>
  );
}
