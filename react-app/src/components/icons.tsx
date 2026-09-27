import type { ReactNode } from 'react';

interface SvgProps {
  sw?: number;
  className?: string;
  children: ReactNode;
}
function Svg({ sw = 2, className, children }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} className={className}>
      {children}
    </svg>
  );
}

export type NavIconKey = 'dashboard' | 'thismonth' | 'savings' | 'recurring' | 'loans' | 'insights' | 'more';

export function NavIcon({ name, sw = 1.8 }: { name: NavIconKey; sw?: number }) {
  switch (name) {
    case 'dashboard':
      return <Svg sw={sw}><path d="M3 12h6V3H3v9zm0 9h6v-6H3v6zm10 0h6v-9h-6v9zm0-18v6h6V3h-6z" /></Svg>;
    case 'thismonth':
      return <Svg sw={sw}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 9h18" /></Svg>;
    case 'savings':
      return <Svg sw={sw}><path d="M19 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-2" /><path d="M21 12a2 2 0 00-2-2h-4a2 2 0 000 4h4a2 2 0 002-2z" /></Svg>;
    case 'recurring':
      return <Svg sw={sw}><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" /></Svg>;
    case 'loans':
      return <Svg sw={sw}><path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M12 3L3 8h18z" /></Svg>;
    case 'insights':
      return <Svg sw={sw}><path d="M4 19V5M20 19V11M12 19V8M4 19h16" /><path d="M6 8l4-4 4 3 5-5" /></Svg>;
    case 'more':
      return (
        <Svg sw={sw}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </Svg>
      );
  }
}

export const GuideIcon = () => (
  <Svg><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4" /><path d="M12 17h.01" /></Svg>
);
export const FeedbackIcon = () => (
  <Svg><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.9 8.9 0 01-4-.9L3 21l1.9-4.9A8.4 8.4 0 0121 11.5z" /></Svg>
);
export const LangIcon = () => (
  <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></Svg>
);
export const RatesIcon = () => (
  <Svg><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Svg>
);
export const ExportIcon = () => (
  <Svg><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Svg>
);
export const MenuIcon = () => (
  <Svg><path d="M3 6h18M3 12h18M3 18h18" /></Svg>
);
export const ChevronLeft = () => (
  <Svg sw={2.2}><path d="M15 18l-6-6 6-6" /></Svg>
);
export const ChevronRight = () => (
  <Svg sw={2.2}><path d="M9 18l6-6-6-6" /></Svg>
);
export const EditIcon = () => (
  <Svg><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></Svg>
);
export const TrashIcon = () => (
  <Svg><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></Svg>
);
export const BoltIcon = () => (
  <Svg sw={1.8}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></Svg>
);
export const RefreshIcon = () => (
  <Svg><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" /></Svg>
);
export const WarnIcon = () => (
  <Svg><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></Svg>
);
export const CheckIcon = () => (
  <Svg><path d="M20 6L9 17l-5-5" /></Svg>
);
export const InfoCircleIcon = () => (
  <Svg><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Svg>
);
