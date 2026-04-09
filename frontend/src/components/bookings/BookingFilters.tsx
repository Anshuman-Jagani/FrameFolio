import type { DashboardBookingFilter } from '../../lib/uiTypes'

const OPTIONS: { id: DashboardBookingFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Pending' },
  { id: 'accepted', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Declined' },
  { id: 'cancelled', label: 'Cancelled' },
]

type Props = {
  value: DashboardBookingFilter
  onChange: (next: DashboardBookingFilter) => void
  counts?: Partial<Record<DashboardBookingFilter, number>>
}

export default function BookingFilters({ value, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => {
        const active = value === o.id
        const n = counts?.[o.id]
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'border-pine-500 bg-pine-500 text-parchment-50'
                : 'border-parchment-200 bg-parchment-100 text-olive-500 hover:border-parchment-200 hover:bg-parchment-200',
            ].join(' ')}
          >
            {o.label}
            {n !== undefined && n > 0 ? (
              <span className={active ? ' opacity-90' : ' text-copper-500'}>
                {' '}
                ({n})
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
