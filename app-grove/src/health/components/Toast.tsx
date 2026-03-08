import { createContext, useContext, useState, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  isError: boolean;
}

interface ToastContextValue {
  showToast: (text: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, isError = false) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
                t.isError
                  ? 'bg-reminder-text text-white'
                  : 'bg-primary text-on-primary'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
