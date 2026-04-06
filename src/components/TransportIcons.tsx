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

export function DeleteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M8 7V5.5C8 4.7 8.7 4 9.5 4H14.5C15.3 4 16 4.7 16 5.5V7H19V9H18V18C18 19.1 17.1 20 16 20H8C6.9 20 6 19.1 6 18V9H5V7H8ZM10 7H14V6H10V7ZM8 9V18H16V9H8ZM10 11H12V16H10V11ZM14 11H12V16H14V11Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function UndoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 5C15.8 5 19 7.5 19.8 11H17.7C17 8.7 14.7 7 12 7C9.5 7 7.3 8.4 6.2 10.5L9 13.2H3.5V7.7L4.8 9C6.2 6.6 8.9 5 12 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RedoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 5C15.1 5 17.8 6.6 19.2 9L20.5 7.7V13.2H15L17.8 10.5C16.7 8.4 14.5 7 12 7C9.3 7 7 8.7 6.3 11H4.2C5 7.5 8.2 5 12 5Z"
        fill="currentColor"
      />
    </svg>
  );
}
