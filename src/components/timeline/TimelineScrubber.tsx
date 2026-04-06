import { useMemo, useRef } from "react";

interface TimelineScrubberProps {
  hasVideo: boolean;
  currentTimeMs: number;
  durationMs: number;
  playheadPercent: number;
  isDisabled: boolean;
  onSeek: (timeMs: number) => void;
}

interface TimelineLabel {
  leftPercent: number;
  timeMs: number;
  label: string;
}

function formatTimelineLabel(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function buildTimelineLabels(durationMs: number): TimelineLabel[] {
  // Build evenly-spaced ruler labels across the total duration.
  // Example with 7 labels: 0%, 16.6%, 33.3%, ... 100%.
  // We compute each label's timestamp from ratio * duration.
  if (durationMs <= 0) {
    return [{ leftPercent: 0, timeMs: 0, label: "00:00:00" }];
  }

  const desiredLabelCount = 7;
  const labels: TimelineLabel[] = [];

  for (let index = 0; index < desiredLabelCount; index += 1) {
    const ratio = index / (desiredLabelCount - 1);
    const timeMs = Math.floor(durationMs * ratio);
    labels.push({
      leftPercent: ratio * 100,
      timeMs,
      label: formatTimelineLabel(timeMs),
    });
  }

  return labels;
}

export function TimelineScrubber({
  hasVideo,
  currentTimeMs,
  durationMs,
  playheadPercent,
  isDisabled,
  onSeek,
}: TimelineScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const labels = useMemo(() => buildTimelineLabels(durationMs), [durationMs]);

  function seekFromPointer(clientX: number) {
    const scrubberElement = scrubberRef.current;
    if (!scrubberElement || durationMs <= 0 || isDisabled) {
      return;
    }

    const rect = scrubberElement.getBoundingClientRect();
    // Convert mouse X position into a 0..1 ratio inside the scrubber:
    //  - offsetX is local position from the left edge
    //  - clamped to avoid negative or overrun values
    //  - ratio = offsetX / totalWidth
    const offsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width === 0 ? 0 : offsetX / rect.width;

    // Map that ratio to an absolute timeline time in milliseconds.
    onSeek(Math.floor(durationMs * ratio));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();

    // Seek once immediately where the user pressed,
    // then keep seeking while dragging (pointermove).
    seekFromPointer(event.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      seekFromPointer(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      ref={scrubberRef}
      className="relative overflow-hidden border border-[#2b3240] bg-[#141820]"
      onPointerDown={handlePointerDown}
      role="slider"
      aria-label="Playback timeline"
      aria-valuemin={0}
      aria-valuemax={Math.max(durationMs, 1)}
      aria-valuenow={Math.min(currentTimeMs, Math.max(durationMs, 1))}
      aria-disabled={isDisabled}
    >
      <div className="relative h-8 border-b border-[#262d3a] bg-[#1b2028]">
        <div
          className="absolute inset-x-0 top-0 h-5"
          style={{
            backgroundImage:
              // Minor ruler marks are intentionally short to match timeline editors.
              "repeating-linear-gradient(to right, rgba(102,112,130,0.38) 0px, rgba(102,112,130,0.38) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(to right, rgba(132,144,162,0.52) 0px, rgba(132,144,162,0.52) 1px, transparent 1px, transparent 40px)",
          }}
          aria-hidden="true"
        />

        {labels.map((timelineLabel) => (
          <span
            key={timelineLabel.timeMs}
            className="absolute top-1 text-[10px] text-[#8b95a6]"
            style={{ left: `${timelineLabel.leftPercent}%`, transform: "translateX(-50%)" }}
          >
            {timelineLabel.label}
          </span>
        ))}
      </div>

      <div className="relative h-10 bg-[#1b2028] px-2 py-2">
        {hasVideo ? (
          <div
            className="h-full w-full border border-[#2a5b86] bg-gradient-to-r from-[#3d78aa] to-[#3f79ab]"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {hasVideo ? (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-[#f04c3e]"
          style={{ left: `${playheadPercent}%` }}
          aria-hidden="true"
        >
          <span className="absolute -left-[5px] top-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#f04c3e]" />
        </div>
      ) : null}
    </div>
  );
}
