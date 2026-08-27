"use client";

import type { ReactNode } from "react";
import { CloseButton } from "@/components/ui/close-button";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";

export interface ModalAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  actions?: ModalAction[];
  footer?: ReactNode;
  widthClass?: string;
  cancelLabel?: string;
  closeOnOverlay?: boolean;
  zClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  footer,
  widthClass = "max-w-md",
  cancelLabel = "Cancel",
  closeOnOverlay = true,
  zClass = "z-50",
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center bg-black/30`}
      onClick={() => closeOnOverlay && onClose()}
    >
      <div
        className={`w-full ${widthClass} mx-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-bold">{title}</p>
          <CloseButton onClick={onClose} size={16} />
        </div>
        {children}
        {footer !== undefined
          ? footer
          : actions && (
              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className={`${neoBtn} flex-1 py-3`}>
                  {cancelLabel}
                </button>
                {actions.map((a, i) => (
                  <button
                    key={i}
                    disabled={a.disabled || a.loading}
                    onClick={a.onClick}
                    className={`${a.className ?? neoBtnPrimary} flex-1 py-3 disabled:opacity-40 disabled:pointer-events-none`}
                  >
                    {a.loading ? "..." : a.label}
                  </button>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}
