import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export type ToastKind = 'success' | 'info' | 'error';

export interface ToastOptions {
  kind?: ToastKind;
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
}

export interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void;
  dismiss: (id?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5000;

/**
 * ToastProvider coordinates sequential message queues, persistent ARIA live regions,
 * auto-dismiss timers, and hover/focus pause behavior.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Active toast is the head of the queue
  const currentToast = queue[0] ?? null;

  const show = useCallback((message: string, options?: ToastOptions) => {
    const newItem: ToastItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      kind: options?.kind ?? 'info',
      duration: options?.duration ?? DEFAULT_DURATION,
    };

    setQueue((prev) => [...prev, newItem]);
  }, []);

  const dismiss = useCallback((id?: string) => {
    setQueue((prev) => {
      if (!id) return prev.slice(1);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // Timer reference to manage auto-dismiss
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentToast || isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      dismiss(currentToast.id);
    }, currentToast.duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentToast, isPaused, dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {/* Persistent ARIA live region exists in DOM before toasts appear for reliable announcement */}
      <div
        className="toast-viewport-portal"
        aria-live="polite"
        aria-atomic="true"
        role={currentToast?.kind === 'error' ? 'alert' : 'status'}
      >
        {currentToast && (
          <div
            key={currentToast.id}
            className={`toast-banner toast-banner-${currentToast.kind}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          >
            <div className="toast-icon-symbol" aria-hidden="true">
              {currentToast.kind === 'success' && '✓'}
              {currentToast.kind === 'error' && '⚠'}
              {currentToast.kind === 'info' && '★'}
            </div>
            <p className="toast-message">{currentToast.message}</p>
            <button
              type="button"
              className="toast-dismiss-btn"
              onClick={() => dismiss(currentToast.id)}
              aria-label="Dismiss notification"
            >
              <span className="toast-dismiss-text">Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * useToast exposes the show() and dismiss() methods to child components.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
