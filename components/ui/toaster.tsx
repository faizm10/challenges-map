"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant }: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100%-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-3xl border bg-white/95 p-4 shadow-xl backdrop-blur-md transition",
              item.variant === "success"
                ? "border-emerald-200"
                : "border-red-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 shrink-0",
                  item.variant === "success" ? "text-emerald-600" : "text-red-600"
                )}
              >
                {item.variant === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <button
                className="rounded-full p-1 text-muted-foreground transition hover:bg-black/5"
                onClick={() => dismiss(item.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider");
  }

  return context;
}
