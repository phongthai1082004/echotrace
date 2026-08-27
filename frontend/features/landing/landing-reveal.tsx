"use client";

import { useEffect, type ReactNode } from "react";
import { LANDING_CSS } from "./landing-css";
import { useReveal } from "./use-reveal";

// ponytail: wrapper client để chạy scroll-reveal + inject CSS (không thể làm ở server component).
export function LandingReveal({ children }: { children: ReactNode }) {
	useReveal();
	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = LANDING_CSS;
		document.head.appendChild(style);
		return () => {
			document.head.removeChild(style);
		};
	}, []);
	return <>{children}</>;
}
