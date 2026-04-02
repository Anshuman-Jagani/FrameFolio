import { useEffect, useMemo, useState } from 'react'
import { get, post } from '../../lib/api'

type AvailabilityRow = { date: string; is_booked: boolean }

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function monthMatrix(year: number, month0: number) {
  const first = new Date(year, month0, 1)
  // Make Monday the first column
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
 * Interactive month editor for the photographer availability calendar.
 * - Click a day to toggle available/unavailable.
 * - Pick a date range and apply as available/unavailable.
 * Uses `GET /availability/me` + `POST /availability/me`.
 */
export default function AvailabilityCalendarEditor({
  globalOpen,
}: {
  globalOpen: boolean
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const [loading, setLoading] = useState(true)

  // Actual availability rows (may be sparse); default display uses `globalOpen`.
  const [rows, setRows] = useState<AvailabilityRow[]>([])

  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return isoDate(d)
  })
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 4)
    return isoDate(d)
  })
  const [rangeIsBooked, setRangeIsBooked] = useState(true) // default: block out

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const from = isoDate(new Date())
    const toDate = new Date()
    toDate.setDate(toDate.getDate() + 120)
    const to = isoDate(toDate)

    void get<AvailabilityRow[]>('/availability/me', { from_date: from, to_date: to })
      .then((data) => {
        if (cancelled) return
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (cancelled) return
        setRows([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const slotMap = useMemo(() => {
    const m = new Map<string, boolean>()
    rows.forEach((r) => m.set(r.date, r.is_booked))
    return m
  }, [rows])

  const matrix = useMemo(() => monthMatrix(cursor.y, cursor.m), [cursor.y, cursor.m])
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

  const getEffectiveIsBooked = (dateStr: string) => {
    // When "closed", enforce unavailable for all days to match booking gate.
    if (!globalOpen) return true
    // If we have an availability row: reflect it; otherwise default open.
    return slotMap.get(dateStr) ?? false
  }

  const toggleDay = async (dateStr: string) => {
    const effectiveIsBooked = getEffectiveIsBooked(dateStr)
    const desiredIsBooked = !effectiveIsBooked

    await post('/availability/me', { dates: [dateStr], is_booked: desiredIsBooked })
    setRows((prev) => {
      const next = [...prev]
      const idx = next.findIndex((r) => r.date === dateStr)
      if (idx >= 0) next[idx] = { date: dateStr, is_booked: desiredIsBooked }
      else next.push({ date: dateStr, is_booked: desiredIsBooked })
      return next
    })
  }

  const applyRange = async () => {
    const a = new Date(rangeStart)
    const b = new Date(rangeEnd)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return

    const start = a <= b ? a : b
    const end = a <= b ? b : a

    const dates: string[] = []
    const maxDays = 60
    let cursorD = new Date(start)
    while (cursorD <= end) {
      dates.push(isoDate(cursorD))
      cursorD.setDate(cursorD.getDate() + 1)
      if (dates.length > maxDays) break
    }
    if (dates.length === 0) return

    await post('/availability/me', { dates, is_booked: rangeIsBooked })
    setRows((prev) => {
      const nextMap = new Map(prev.map((r) => [r.date, r.is_booked]))
      dates.forEach((d) => nextMap.set(d, rangeIsBooked))
      return Array.from(nextMap.entries()).map(([date, is_booked]) => ({
        date,
        is_booked,
      }))
    })
  }

  return (
    <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-charcoal-700">Availability editor</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded-lg border border-taupe-100 px-2 py-1 text-sm text-charcoal-700 hover:text-burgundy-500"
            onClick={() => shift(-1)}
          >
            ‹
          </button>
          <span className="text-sm font-medium text-taupe-800 min-w-[140px] text-center">
            {title}
          </span>
          <button
            type="button"
            aria-label="Next month"
            className="rounded-lg border border-taupe-100 px-2 py-1 text-sm text-charcoal-700 hover:text-burgundy-500"
            onClick={() => shift(1)}
          >
            ›
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-taupe-600">
        Click a day to toggle. Default: if you have no row for a date, it’s treated as available when you’re
        open.
      </p>

      {loading ? (
        <div className="mt-4 h-52 rounded-xl bg-cream-200/60 animate-pulse" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold text-taupe-500 uppercase tracking-wide">
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
                  if (day === null) return <div key={`e-${di}`} className="h-8" />
                  const dateStr = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const effectiveIsBooked = getEffectiveIsBooked(dateStr)
                  const today = new Date()
                  const isToday = today.getFullYear() === cursor.y && today.getMonth() === cursor.m && today.getDate() === day
                  const isPast = new Date(cursor.y, cursor.m, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  
                  const tone = effectiveIsBooked
                    ? 'bg-burgundy-500 text-white border border-burgundy-600 opacity-80'
                    : 'bg-cream-100 text-charcoal-700 border border-taupe-200 hover:bg-burgundy-50 hover:border-burgundy-300'

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      className={[
                        'h-8 rounded-lg border text-center text-xs font-medium flex items-center justify-center transition relative',
                        isPast ? 'opacity-40 cursor-not-allowed pointer-events-none' : tone,
                        isToday && !isPast ? 'ring-2 ring-burgundy-400 outline' : '',
                      ].join(' ')}
                      title={effectiveIsBooked ? `${dateStr}: unavailable` : `${dateStr}: available`}
                      onClick={() => !isPast && void toggleDay(dateStr)}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 rounded-2xl border border-taupe-100 bg-cream-50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-charcoal-700">Block a date range</div>
            <div className="text-xs text-taupe-600 mt-1">
              Apply in one request (max ~60 days).
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-taupe-700" htmlFor="rangeStart">
              Start
            </label>
            <input
              id="rangeStart"
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-taupe-700" htmlFor="rangeEnd">
              End
            </label>
            <input
              id="rangeEnd"
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              rangeIsBooked
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-taupe-200 bg-cream-50 text-taupe-700 hover:bg-cream-100',
            ].join(' ')}
            onClick={() => setRangeIsBooked(true)}
          >
            Set Unavailable
          </button>
          <button
            type="button"
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              !rangeIsBooked
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-taupe-200 bg-cream-50 text-taupe-700 hover:bg-cream-100',
            ].join(' ')}
            onClick={() => setRangeIsBooked(false)}
          >
            Set Available
          </button>

          <button
            type="button"
            className="ml-auto rounded-xl bg-burgundy-500 text-cream-50 px-4 py-2 text-sm font-medium hover:bg-burgundy-600 transition-colors"
            onClick={() => void applyRange()}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

