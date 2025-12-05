import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastCtx = createContext(null);

// PUBLIC_INTERFACE
export function useToasts() {
  /** PUBLIC_INTERFACE Access toast push function. */
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToasts must be used within ToastHost');
  return ctx;
}

// PUBLIC_INTERFACE
export default function ToastHost({ children }) {
  /** PUBLIC_INTERFACE Provider and container for toasts. */
  const [items, setItems] = useState([]);
  const idRef = useRef(1);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(({ type = 'info', title, message, ttl = 3200 }) => {
    const id = idRef.current++;
    const toast = { id, type, title, message };
    setItems((prev) => [toast, ...prev]);
    if (ttl > 0) {
      setTimeout(() => remove(id), ttl);
    }
  }, [remove]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
            {t.message ? <div style={{ fontSize: 13, opacity: 0.9 }}>{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
