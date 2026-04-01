interface IconProps {
  className?: string;
}

// Keep transport icons as named components for readable button markup.
export function BackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="4" y="6" width="2" height="12" fill="currentColor" />
      <path d="M18 6V18L8 12L18 6Z" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M8 6V18L18 12L8 6Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="7" y="6" width="3" height="12" fill="currentColor" />
      <rect x="14" y="6" width="3" height="12" fill="currentColor" />
    </svg>
  );
}

export function ForwardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect x="18" y="6" width="2" height="12" fill="currentColor" />
      <path d="M6 6V18L16 12L6 6Z" fill="currentColor" />
    </svg>
  );
}
