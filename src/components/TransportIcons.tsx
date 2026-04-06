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

export function CutIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 680 360"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="272,163 558,155 558,160 272,178" fill="currentColor" />
      <polygon points="272,182 558,200 558,205 272,197" fill="currentColor" />
      <line
        x1="160"
        y1="150"
        x2="282"
        y2="170"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <line
        x1="160"
        y1="210"
        x2="282"
        y2="190"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cx="346" cy="180" r="15" fill="currentColor" />
      <circle cx="346" cy="180" r="6.5" fill="white" />
      <ellipse
        cx="160"
        cy="110"
        rx="53"
        ry="41"
        fill="white"
        stroke="currentColor"
        strokeWidth="11"
      />
      <ellipse
        cx="160"
        cy="250"
        rx="53"
        ry="41"
        fill="white"
        stroke="currentColor"
        strokeWidth="11"
      />
    </svg>
  );
}
