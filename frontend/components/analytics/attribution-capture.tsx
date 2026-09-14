"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// ponytail: capture UTM 1 lần khi app mount — trang không UTM thì giữ nguyên.
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
