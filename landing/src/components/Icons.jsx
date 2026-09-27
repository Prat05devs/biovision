/** Line icons drawn to match the stroke style used by the app's cards. */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function HeartPulseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 8.6c0 4.3-6.4 8.6-8.5 10.4C9.9 17.2 3.5 12.9 3.5 8.6a4.1 4.1 0 0 1 8.5-1.6 4.1 4.1 0 0 1 8.5 1.6Z" />
      <path d="M4.5 11.4h3l1.6-2.6 2.1 5 1.6-3h3.2" />
    </svg>
  );
}

export function GaugeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16.5a8.5 8.5 0 1 1 16 0" />
      <path d="m14.6 9.9-3 4.2" />
      <circle cx="12" cy="15.4" r="1.2" />
    </svg>
  );
}

export function BreathIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5h11.2a2.6 2.6 0 1 0-2.5-3.2" />
      <path d="M3 12.5h14.5a2.6 2.6 0 1 1-2.5 3.2" />
      <path d="M3 16.5h7" />
    </svg>
  );
}

export function DropIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5c3.2 3.4 5.5 6.2 5.5 9a5.5 5.5 0 0 1-11 0c0-2.8 2.3-5.6 5.5-9Z" />
    </svg>
  );
}

export function SparkleIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M11 3.5 12.6 8 17 9.6 12.6 11.2 11 15.7 9.4 11.2 5 9.6 9.4 8 11 3.5Z" />
      <path d="M17.5 14v3.4M19.2 15.7h-3.4" />
      <circle cx="6.6" cy="17.4" r="1.2" />
    </svg>
  );
}

export function LeafIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19.5 4.5c0 8-4.6 12.4-9.6 12.4A4.9 4.9 0 0 1 5 12c0-5 4.4-7.5 14.5-7.5Z" />
      <path d="M5.5 19c2.2-4 5.2-7 9-9" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2 19 6v5.4c0 4.2-2.9 7.6-7 9.4-4.1-1.8-7-5.2-7-9.4V6l7-2.8Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} width="20" height="20" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5" />
    </svg>
  );
}

export function TranslateIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6h8M7.5 4.2V6M9.6 6c-.5 4-3 6.8-6.1 8.2" />
      <path d="M5.4 10.4c1 2 2.9 3.4 5 4" />
      <path d="m12.5 19.8 3.6-9 3.6 9M14 17h4.2" />
    </svg>
  );
}

export function MapPinIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c4-4.2 6-7.4 6-10a6 6 0 1 0-12 0c0 2.6 2 5.8 6 10Z" />
      <circle cx="12" cy="11" r="2.4" />
    </svg>
  );
}

export function ScanIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function ChipIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2.4" />
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" opacity="0.35" />
      <path d="M12 3.6V1.8M12 22.2v-1.8M20.4 12h1.8M1.8 12h1.8" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.6" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.4v2.2" />
    </svg>
  );
}

export function DocumentIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h7.5L18 8v12.5H6Z" />
      <path d="M13.2 3.6V8.2H17.8" />
      <path d="M8.8 12.4h6.4M8.8 15.6h4.4" />
    </svg>
  );
}

export function StethoscopeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5v5a4 4 0 0 0 8 0v-5" />
      <path d="M4.4 3.5h3.2M12.4 3.5h3.2" />
      <path d="M10 16.5v-4" />
      <path d="M10 16.5a4.5 4.5 0 0 0 9 0v-2.2" />
      <circle cx="19" cy="12" r="2.1" />
    </svg>
  );
}

export function BrainIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5.2a2.7 2.7 0 0 0-5 1.3 2.6 2.6 0 0 0-1.4 4.3A2.8 2.8 0 0 0 7 15.6a2.6 2.6 0 0 0 5 .9Z" />
      <path d="M12 5.2a2.7 2.7 0 0 1 5 1.3 2.6 2.6 0 0 1 1.4 4.3A2.8 2.8 0 0 1 17 15.6a2.6 2.6 0 0 1-5 .9Z" />
      <path d="M12 16.5v3" />
    </svg>
  );
}

export function FlaskIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3.5v6.2L5.2 17.8A2 2 0 0 0 6.9 20.8h10.2a2 2 0 0 0 1.7-3L14 9.7V3.5" />
      <path d="M8.6 3.5h6.8" />
      <path d="M7.6 15.2h8.8" />
    </svg>
  );
}

export function GlobeIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13.2 2.8 5.8 13.4h5.1l-.9 7.8 7.4-10.6h-5.1Z" />
    </svg>
  );
}

export function AlertIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.2 21 19.8H3Z" />
      <path d="M12 10v4.1M12 17.1v.2" />
    </svg>
  );
}
