import { useEffect, useMemo, useState } from 'react'
import { get } from '../../lib/api'

type Slot = { date: string; is_booked: boolean }

function monthMatrix(year: number, month0: number) {
  const first = new Date(year, month0, 1)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Read-only month view of `/availability/me` for photographers (defaults: ~90 days from today).
 */
export default function AvailabilityMonthPreview() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void get<Slot[]>('/availability/me')
      .then((data) => {
        if (!cancelled) setSlots(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const slotMap = useMemo(() => {
    const m = new Map<string, Slot>()
    slots.forEach((s) => m.set(s.date, s))
    return m
  }, [slots])

  const matrix = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  )

  const title = new Date(cursor.y, cursor.m, 1).toLocaleString('en-AE', {
    month: 'long',
    year: 'numeric',
  })

  const shift = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  return (
    <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-charcoal-700">Calendar preview</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded-lg border border-parchment-200 px-2 py-1 text-sm text-charcoal-700 hover:bg-parchment-200"
            onClick={() => shift(-1)}
          >
            ‹
          </button>
          <span className="text-sm font-medium text-copper-800 min-w-[140px] text-center">{title}</span>
          <button
            type="button"
            aria-label="Next month"
            className="rounded-lg border border-parchment-200 px-2 py-1 text-sm text-charcoal-700 hover:bg-parchment-200"
            onClick={() => shift(1)}
          >
            ›
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-copper-600">
        Green = open day · Amber = booked/blocked · Dates loaded from your availability API.
      </p>

      {loading ? (
        <div className="mt-4 h-40 rounded-xl bg-parchment-200/60 animate-pulse" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold text-copper-500 uppercase tracking-wide">
            {weekdays.map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 space-y-1">
            {matrix.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((day, di) => {
                  if (day === null) {
                    return <div key={`e-${di}`} className="h-8" />
                  }
                  const iso = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const slot = slotMap.get(iso)
                  const tone = !slot
                    ? 'bg-parchment-200 text-copper-400 border-parchment-200'
                    : slot.is_booked
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  return (
                    <div
                      key={iso}
                      className={[
                        'h-8 rounded-lg border text-center text-xs font-medium flex items-center justify-center',
                        tone,
                      ].join(' ')}
                      title={iso}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
