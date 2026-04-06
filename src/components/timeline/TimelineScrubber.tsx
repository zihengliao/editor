import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineSegment } from "../../timeline/types";

interface TimelineScrubberProps {
  hasVideo: boolean;
  cutsMs: number[];
  segments: TimelineSegment[];
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

const MAJOR_TICK_PX = 120;
const MINOR_TICK_PX = 12;

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

function buildMajorTickLabels(durationMs: number, rulerWidthPx: number): TimelineLabel[] {
  // Timestamps are generated from physical major-tick spacing (120px).
  // This keeps labels perfectly synced with ruler marks and video duration.
  if (durationMs <= 0 || rulerWidthPx <= 0) {
    return [{ leftPercent: 0, timeMs: 0, label: "00:00:00" }];
  }

  const majorTickCount = Math.floor(rulerWidthPx / MAJOR_TICK_PX);
  const labels: TimelineLabel[] = [];

  for (let index = 0; index <= majorTickCount; index += 1) {
    const xPx = index * MAJOR_TICK_PX;
    const ratio = xPx / rulerWidthPx;
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
  cutsMs,
  segments,
  currentTimeMs,
  durationMs,
  playheadPercent,
  isDisabled,
  onSeek,
}: TimelineScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const [rulerWidthPx, setRulerWidthPx] = useState(0);

  useEffect(() => {
    const scrubberElement = scrubberRef.current;
    if (!scrubberElement) {
      return;
    }

    const updateWidth = () => {
      setRulerWidthPx(Math.floor(scrubberElement.clientWidth));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(scrubberElement);

    return () => observer.disconnect();
  }, []);

  const labels = useMemo(
    () => buildMajorTickLabels(durationMs, rulerWidthPx),
    [durationMs, rulerWidthPx],
  );

  function seekFromPointer(clientX: number) {
    const scrubberElement = scrubberRef.current;
    if (!scrubberElement || durationMs <= 0 || isDisabled) {
      return;
    }

    const rect = scrubberElement.getBoundingClientRect();
    const offsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = rect.width === 0 ? 0 : offsetX / rect.width;
    onSeek(Math.floor(durationMs * ratio));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
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
          className="absolute inset-x-0 top-0 h-2"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, rgba(102,112,130,0.38) 0px, rgba(102,112,130,0.38) 1px, transparent 1px, transparent ${MINOR_TICK_PX}px)`,
          }}
          aria-hidden="true"
        />

        <div
          className="absolute inset-x-0 top-0 h-5"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, rgba(132,144,162,0.62) 0px, rgba(132,144,162,0.62) 1px, transparent 1px, transparent ${MAJOR_TICK_PX}px)`,
          }}
          aria-hidden="true"
        />

        {labels.map((timelineLabel) => (
          <span
            key={timelineLabel.timeMs}
            className="absolute top-1 text-[10px] text-[#8b95a6]"
            style={{ left: `${timelineLabel.leftPercent}%`, transform: "translateX(4px)" }}
          >
            {timelineLabel.label}
          </span>
        ))}
      </div>

      <div className="relative h-10 bg-[#1b2028] py-2">
        {hasVideo ? (
          <div className="relative h-full w-full" aria-hidden="true">
            <div className="h-full w-full border border-[#2a5b86] bg-gradient-to-r from-[#3d78aa] to-[#3f79ab]" />

            {/* Draw cut separators as an overlay so boundaries align exactly to time position. */}
            {cutsMs.map((cutMs) => {
              const cutLeftPercent = durationMs > 0 ? (cutMs / durationMs) * 100 : 0;
              return (
                <span
                  key={`cut-${cutMs}`}
                  className="pointer-events-none absolute inset-y-0 w-px bg-[#1b2028]"
                  style={{ left: `${cutLeftPercent}%` }}
                />
              );
            })}

            {/* Keep segments in DOM for upcoming selection/edit interactions. */}
            <div className="sr-only">
            {segments.map((segment) => (
              <span key={segment.id}>
                {segment.startMs}-{segment.endMs}
              </span>
            ))}
            </div>
          </div>
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
