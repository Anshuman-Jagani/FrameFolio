import type { ReactNode } from 'react'

export type SideNavItem = {
  key: string
  label: string
  active?: boolean
  icon?: ReactNode
  onClick: () => void
}

export default function SideNav({ items }: { items: SideNavItem[] }) {
  return (
    <nav
      className="rounded-3xl border-r border-taupe-100 bg-cream-100/60 backdrop-blur p-2 shadow-sm"
      aria-label="Dashboard navigation"
    >
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isNewBooking = item.key === 'new_booking'
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={[
                'w-full text-left rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center gap-2',
                item.active
                  ? 'bg-burgundy-500 text-white'
                  : isNewBooking
                    ? 'bg-burgundy-500 text-white text-center hover:bg-burgundy-600 mt-4'
                    : 'text-taupe-600 hover:bg-cream-200',
              ].join(' ')}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

