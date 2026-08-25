import { useState, useCallback } from "react";

export interface UseModalResult<T = any> {
  isOpen: boolean;
  data: T | null;


  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
  setData: (data: T) => void;
  reset: () => void;
}

export function useModal<T = any>(initialData?: T): UseModalResult<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setDataState] = useState<T | null>(initialData ?? null);

  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setDataState(newData);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setData = useCallback((newData: T) => {
    setDataState(newData);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setDataState(initialData ?? null);
  }, [initialData]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData,
    reset,
  };
}
