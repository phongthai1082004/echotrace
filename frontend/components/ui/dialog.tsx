"use client";

import { useEffect, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(26,26,26,0.18)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {children}
      </div>
    </>
  );
}
