"use client";

import React, { createContext, useContext, useCallback } from "react";

export type ErrorType = "error" | "warning" | "info";

export interface ErrorMessage {
  id: string;
  message: string;
  type: ErrorType;
  duration?: number;
}

interface ErrorContextType {
  errors: ErrorMessage[];
  addError: (message: string, type?: ErrorType, duration?: number) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = React.useState<ErrorMessage[]>([]);

  const addError = useCallback((message: string, type: ErrorType = "error", duration = 5000) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newError: ErrorMessage = { id, message, type, duration };
    setErrors((prev) => [...prev, newError]);

    if (duration && duration > 0) {
      setTimeout(() => removeError(id), duration);
    }

    return id;
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorHandler must be used within ErrorProvider");
  }
  return context;
}
