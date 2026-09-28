/* ─── Inline SVG icon components ───────────────────────────── */

export const RouteIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <path
      d="M3 6.5C3 4.567 4.567 3 6.5 3S10 4.567 10 6.5C10 9 6.5 13 6.5 13S3 9 3 6.5Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 15.5C12 13.567 13.567 12 15.5 12S19 13.567 19 15.5C19 18 15.5 22 15.5 22S12 18 15.5 15.5Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <circle cx="15.5" cy="15.5" r="1.5" stroke="currentColor" strokeWidth="2" />
    <path d="M6.5 13V16C6.5 16.8 7 17.5 7.5 17.5H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const NavigationIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <path d="M3 11L11 3L19 11L11 19L3 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 3L14 11L11 10L8 11L11 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <path d="M11 2L20.5 19H1.5L11 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="11" cy="16.5" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" />
    <path d="M7 4V7L9 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      d="M7 3H3C2.448 3 2 3.448 2 4V15C2 15.552 2.448 16 3 16H14C14.552 16 15 15.552 15 15V11"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    />
    <path d="M10 2H16V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 2L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M15.833 10H4.167M4.167 10L10 15.833M4.167 10L10 4.167" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M4.5 3L14.5 9L4.5 15V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.333 7L5.25 9.917L11.667 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CameraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M23 19C23 19.5523 22.5523 20 22 20H2C1.44772 20 1 19.5523 1 19V8C1 7.44772 1.44772 7 2 7H7L9 4H15L17 7H22C22.5523 7 23 7.44772 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const SignatureIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3.5 16.5C5 13 8.5 12 11.5 14C14 15.5 17 14 18.5 11.5C19.5 10 19 8.5 17.5 7.5C15 6 12 8 10 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="2" />
    <path d="M5.5 9L7.5 11L12.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M3.75 9H14.25M14.25 9L9 3.75M14.25 9L9 14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SmartphoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="3" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="10.5" x2="8" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InactiveDotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="5" fill="#CBD5E1" />
  </svg>
);




