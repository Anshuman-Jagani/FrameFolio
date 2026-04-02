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
                ? 'border-burgundy-500 bg-burgundy-500 text-cream-50'
                : 'border-taupe-200 bg-cream-50 text-taupe-700 hover:border-taupe-300 hover:bg-cream-100',
            ].join(' ')}
          >
            {o.label}
            {n !== undefined && n > 0 ? (
              <span className={active ? ' opacity-90' : ' text-taupe-500'}>
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
