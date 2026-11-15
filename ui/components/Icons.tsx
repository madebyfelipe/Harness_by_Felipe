/* Ícones de traço, 20px, herdam a cor do texto. */
type P = { size?: number };
const s = (size = 20) => ({ width: size, height: size, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const IconChat = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
  </svg>
);
export const IconBook = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M4 3.5h8.5a2 2 0 0 1 2 2V17H6a2 2 0 0 1-2-2z" />
    <path d="M4 15a2 2 0 0 1 2-2h8.5" />
  </svg>
);
export const IconBot = ({ size }: P) => (
  <svg {...s(size)}>
    <rect x="3.5" y="6" width="13" height="10" rx="2" />
    <path d="M10 6V3.5M7.5 11h.01M12.5 11h.01" />
  </svg>
);
export const IconSpark = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.3 2.3M12.2 12.2l2.3 2.3M14.5 5.5l-2.3 2.3M7.8 12.2l-2.3 2.3" />
  </svg>
);
export const IconPlug = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M7 3v4M13 3v4M5 7h10v2.5a5 5 0 0 1-10 0zM10 14.5V17" />
  </svg>
);
export const IconGrid = ({ size }: P) => (
  <svg {...s(size)}>
    <rect x="3.5" y="3.5" width="5" height="5" />
    <rect x="11.5" y="3.5" width="5" height="5" />
    <rect x="3.5" y="11.5" width="5" height="5" />
    <rect x="11.5" y="11.5" width="5" height="5" />
  </svg>
);
export const IconUser = ({ size }: P) => (
  <svg {...s(size)}>
    <circle cx="10" cy="7" r="3.2" />
    <path d="M3.5 17c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" />
  </svg>
);
export const IconPlus = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M10 4v12M4 10h12" />
  </svg>
);
export const IconMic = ({ size }: P) => (
  <svg {...s(size)}>
    <rect x="7.5" y="2.5" width="5" height="9.5" rx="2.5" />
    <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" />
  </svg>
);
export const IconSend = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M10 16V4M5 9l5-5 5 5" />
  </svg>
);
export const IconStop = ({ size }: P) => (
  <svg {...s(size)}>
    <rect x="5.5" y="5.5" width="9" height="9" fill="currentColor" />
  </svg>
);
export const IconSearch = ({ size }: P) => (
  <svg {...s(size)}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13 13 3.5 3.5" />
  </svg>
);
export const IconMore = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M5 10h.01M10 10h.01M15 10h.01" strokeWidth="2.4" />
  </svg>
);
export const IconTool = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="m11.5 8.5 5-5M13 3.5h3.5V7M8.5 11.5l-5 5M7 16.5H3.5V13" />
  </svg>
);
export const IconBack = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M12.5 4 6.5 10l6 6" />
  </svg>
);
export const IconFeedback = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="M4 4.5h12v8.5H9.5L6 16v-3H4z" />
    <path d="M7.5 8.5h5M7.5 11h3" />
  </svg>
);
export const IconLayers = ({ size }: P) => (
  <svg {...s(size)}>
    <path d="m10 3 7 4-7 4-7-4z" />
    <path d="m3 11 7 4 7-4" />
  </svg>
);
