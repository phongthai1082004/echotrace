"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "info" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "#E8F5E1", border: "#5A8F4A", text: "#2D5A1E", icon: "✓" },
  info:    { bg: "#E8E6E0", border: "#222", text: "#222", icon: "i" },
  warning: { bg: "#FFF3C4", border: "#D4A017", text: "#7A5B00", icon: "!" },
  error:   { bg: "#FDE8E8", border: "#B54843", text: "#8B2020", icon: "✕" },
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-0 z-[100] flex flex-col gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const s = typeStyles[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[10px] border-[3px] shadow-[4px_4px_0_#222] animate-slide-in"
              style={{ background: s.bg, borderColor: s.border, color: s.text }}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                style={{ background: s.border, color: "#fff" }}>
                {s.icon}
              </span>
              <p className="text-sm font-bold whitespace-pre-wrap break-words max-w-[320px]">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="ml-2 opacity-40 hover:opacity-70 font-bold">✕</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
