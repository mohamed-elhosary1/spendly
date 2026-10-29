import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast({ type: 'error', title, message }),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, info, warning }}
    >
      {children}

      {/* Floating Toast Container */}
      <div
        className="fixed bottom-4 end-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-3"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
            info: <Info className="h-5 w-5 text-sky-500 shrink-0" />,
          };

          const borders = {
            success: 'border-emerald-500/30 bg-card/95',
            error: 'border-rose-500/30 bg-card/95',
            warning: 'border-amber-500/30 bg-card/95',
            info: 'border-sky-500/30 bg-card/95',
          };

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 fade-in duration-200',
                borders[toast.type]
              )}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-bold text-foreground mb-0.5">{toast.title}</h4>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
