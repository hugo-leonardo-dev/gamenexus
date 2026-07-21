"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TOAST_DURATION = 4000;
const ANIMATION_DURATION = 300;

function ToastIcon({ type }: { type: Toast["type"] }) {
  switch (type) {
    case "success":
      return (
        <svg className="h-5 w-5 shrink-0 text-retro-green" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "error":
      return (
        <svg className="h-5 w-5 shrink-0 text-retro-red" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    case "info":
      return (
        <svg className="h-5 w-5 shrink-0 text-retro-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      );
  }
}

function ToastItem({
  toast,
  onClose,
  style,
}: {
  toast: Toast;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const borderColor =
    toast.type === "success"
      ? "border-retro-green"
      : toast.type === "error"
        ? "border-retro-red"
        : "border-retro-primary";

  const bgColor =
    toast.type === "success"
      ? "bg-retro-green/10"
      : toast.type === "error"
        ? "bg-retro-red/10"
        : "bg-retro-primary/10";

  const textColor =
    toast.type === "success"
      ? "text-retro-green"
      : toast.type === "error"
        ? "text-retro-red"
        : "text-retro-primary";

  return (
    <div
      style={style}
      className={`
        pointer-events-auto flex items-start gap-3 pixel-border-sm px-4 py-3
        shadow-2xl transition-all duration-300
        ${borderColor} ${bgColor} ${textColor} bg-retro-bg
        ${toast.exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
      role="alert"
      aria-live="polite"
    >
      <ToastIcon type={toast.type} />
      <p className="flex-1 font-pixel text-[8px] leading-relaxed">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Fechar notificação"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    // Primeiro marca como saindo
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Depois remove de fato
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ANIMATION_DURATION);
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 sm:max-w-sm"
        aria-label="Notificações"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
