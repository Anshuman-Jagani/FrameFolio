/** Reusable Input and Select primitives using the luxury palette */
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

const inputBase =
  'w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-2.5 text-sm text-charcoal-700 placeholder:text-taupe-500 outline-none focus:ring-2 focus:ring-burgundy-500/30 transition-shadow disabled:opacity-60'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  id: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-taupe-700 mb-1.5" htmlFor={id}>
          {label}
        </label>
      )}
      <input id={id} className={[inputBase, className].join(' ')} {...props} />
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  id: string
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-taupe-700 mb-1.5" htmlFor={id}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={[inputBase, 'cursor-pointer', className].join(' ')}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
