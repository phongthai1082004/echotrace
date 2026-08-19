import React from "react";

export const navItems: { label: string; icon: React.ReactNode }[] = [
  {
    label: "Layouts",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
  },
  {
    label: "Photos",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
  },
  {
    label: "Stickers",
    icon: (
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    ),
  },
  {
    label: "Frames",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="4.5" cy="4.5" r="1.5" />
        <path d="M12 2L18 8 16 10 14 8 12 16 10 8 8 10 6 8Z" />
      </>
    ),
  },
  {
    label: "Filter",
    icon: (
      <>
        <circle cx="12" cy="8" r="5" />
        <circle cx="7" cy="18" r="3.5" />
        <circle cx="17" cy="18" r="3.5" />
      </>
    ),
  },
];
