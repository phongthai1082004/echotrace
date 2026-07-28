"use client";

import dynamic from "next/dynamic";

const StudioRouteInner = dynamic(() => import("./studio-route-inner"), { ssr: false });

export default function StudioRoute() {
  return <StudioRouteInner />;
}
