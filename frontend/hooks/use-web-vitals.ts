/**
 * Track Core Web Vitals: LCP, INP, CLS
 * For development / monitoring purposes
 */

import { useEffect } from "react";

export function useWebVitals() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        console.log("LCP:", entry.startTime);
      }
    });
    lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

    // INP (Interaction to Next Paint)
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === "click" || entry.name === "keydown" || entry.name === "pointerdown") {
          const inp = (entry as any).duration;
          console.log("INP:", inp);
        }
      }
    });
    inpObserver.observe({ entryTypes: ["event"] });

    // CLS (Cumulative Layout Shift)
    let cls = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const shift = (entry as any).value;
          cls += shift;
          console.log("CLS:", cls);
        }
      }
    });
    clsObserver.observe({ entryTypes: ["layout-shift"] });

    return () => {
      lcpObserver.disconnect();
      inpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);
}
