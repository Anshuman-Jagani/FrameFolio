import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const icon = t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'
  const accent =
    t.type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : t.type === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-parchment-200 bg-parchment-100 text-charcoal-700'
  const iconColor =
    t.type === 'success' ? 'text-emerald-600' : t.type === 'error' ? 'text-rose-600' : 'text-pine-500'

  return (
    <div
      ref={ref}
      className={[
        'pointer-events-auto max-w-sm w-full rounded-2xl border px-4 py-3 shadow-lg flex items-start gap-3 transition-all duration-300',
        accent,
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      ].join(' ')}
    >
      <span className={['text-base font-bold mt-0.5 shrink-0', iconColor].join(' ')}>{icon}</span>
      <p className="text-sm flex-1 font-medium">{t.message}</p>
      <button
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-sm leading-none"
        onClick={() => onDismiss(t.id)}
      >
        ✕
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
