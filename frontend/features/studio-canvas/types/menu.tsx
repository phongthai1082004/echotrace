import React from "react";

export const navItems: { label: string; icon: React.ReactNode }[] = [
  {
    label: "Photos",
    icon: <><rect x="3" y="3" width="18" height="18" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>
  },
  {
    label: "Layout",
    icon: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="4" /><rect x="14" y="11" width="7" height="10" /></>
  },
  {
    label: "Stickers",
    icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  },
  {
    label: "Filter",
    icon: <><circle cx="12" cy="8" r="5" /><circle cx="7" cy="18" r="3.5" /><circle cx="17" cy="18" r="3.5" /></>
  },
  {
    label: "Layers",
    icon: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>
  },
];
