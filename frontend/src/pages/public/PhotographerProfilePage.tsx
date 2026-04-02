import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePhotographerStore } from '../../store/photographerStore'
import { useAuthStore } from '../../store/authStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { Photographer } from '../../lib/uiTypes'
import { formatAed } from '../../lib/formatCurrency'
import VerifiedBadge from '../../components/ui/VerifiedBadge'
import { get } from '../../lib/api'
import { ArrowLeft } from 'lucide-react'

type AvailRow = { date: string; is_booked: boolean }

export default function PhotographerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const photographers = usePhotographerStore((s) => s.items)
  const fetchById = usePhotographerStore((s) => s.fetchById)

  const [calendarRows, setCalendarRows] = useState<AvailRow[]>([])
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
  )

  useEffect(() => {
    if (!id) return
    const exists = photographers.some((p) => p.id === id)
    if (!exists) {
      void fetchById(id)
    }
  }, [id, photographers, fetchById])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const today = new Date()
    const from = today.toISOString().slice(0, 10)
    const end = new Date(today)
    end.setDate(end.getDate() + 90)
    const to = end.toISOString().slice(0, 10)
    void get<AvailRow[]>(`/availability/${id}`, { from_date: from, to_date: to })
      .then((rows) => {
        if (!cancelled) setCalendarRows(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setCalendarRows([])
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const photographer = useMemo(() => photographers.find((p) => p.id === id), [id, photographers])

  usePageTitle(photographer?.name ?? 'Photographer Profile')

  const packages = useMemo(
    () => [
      { name: 'Photoshoot only', price: photographer?.price ?? 0, desc: 'Half-day session, colour-corrected stills.' },
      { name: 'Shoot + edit', price: Math.round((photographer?.price ?? 0) * 1.25), desc: 'Extended coverage + curated edits.' },
      { name: 'Photo + video reels', price: Math.round((photographer?.price ?? 0) * 1.55), desc: 'Stills plus short-form vertical reels for social.' },
    ],
    [photographer?.price],
  )

  if (!photographer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-taupe-100 bg-cream-100 p-8">
          <div className="text-lg font-serif font-semibold text-charcoal-700">Loading photographer...</div>
          <div className="text-sm text-taupe-700 mt-2">Try browsing the list.</div>
          <button
            type="button"
            className="mt-6 rounded-2xl bg-burgundy-500 text-cream-50 px-5 py-3 text-sm font-medium hover:bg-burgundy-600 transition-colors"
            onClick={() => navigate('/photographers')}
          >
            Back to photographers
          </button>
        </div>
      </div>
    )
  }

  const availabilityTone: Record<Photographer['availability'], string> = {
    Available: 'bg-burgundy-50 text-burgundy-500 border-burgundy-100',
    Limited: 'bg-cream-200 text-charcoal-700 border-taupe-100',
    Unavailable: 'bg-charcoal-700/10 text-charcoal-700 border-taupe-100',
  }

  const openDates = calendarRows.filter((r) => !r.is_booked).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate('/dashboard/client?tab=browse')}
        className="flex items-center gap-2 text-sm text-taupe-600 hover:text-charcoal-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </button>
      <section className="rounded-3xl border border-taupe-100 bg-cream-100/80 backdrop-blur p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="flex items-start gap-6">
              <img
                src={photographer.image || 'https://api.dicebear.com/7.x/initials/svg?seed=PH'}
                alt={photographer.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border border-taupe-100 object-cover"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-charcoal-700">
                    {photographer.name}
                  </div>
                  {photographer.verified ? <VerifiedBadge /> : null}
                </div>
                <div className="mt-1 text-taupe-700">
                  {photographer.category} ·{' '}
                  <span className="font-medium text-charcoal-700">
                    {photographer.rating.toFixed(1)}
                  </span>{' '}
                  ({photographer.verified ? 'verified reviews' : 'new talent'})
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-taupe-100 bg-cream-50/80 px-3 py-1 text-sm">
                  <span className="text-taupe-700">Availability:</span>
                  <span
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-semibold',
                      availabilityTone[photographer.availability],
                    ].join(' ')}
                  >
                    {photographer.availability}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[340px]">
            <div className="rounded-3xl border border-taupe-100 bg-cream-50 p-5 shadow-sm">
              <div className="text-sm text-taupe-700">From</div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-4xl font-serif font-semibold text-charcoal-700">
                  {formatAed(photographer.price)}
                </div>
                <div className="text-sm text-taupe-700">per day</div>
              </div>
              <div className="mt-5">
                <label className="text-xs font-medium text-taupe-700" htmlFor="shoot-date">
                  Preferred shoot date
                </label>
                <input
                  id="shoot-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm text-charcoal-700"
                />
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-2xl bg-burgundy-500 text-cream-50 px-4 py-3 text-sm font-medium hover:bg-burgundy-600 transition-colors"
                onClick={() =>
                  navigate(`/photographers/${photographer.id}/booking`, {
                    state: { initialDate: selectedDate },
                  })
                }
              >
                Book now
              </button>
              {user?.role === 'client' ? (
                <Link
                  to="/dashboard/client"
                  className="mt-3 block w-full rounded-2xl border border-taupe-200 text-center text-sm font-medium text-charcoal-700 py-3 hover:bg-cream-200 transition-colors"
                >
                  Message from dashboard
                </Link>
              ) : (
                <p className="mt-3 text-xs text-taupe-600 text-center">
                  Log in as a client to message this photographer after you book.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="mt-10">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-700">Packages &amp; services</h2>
        <p className="text-sm text-taupe-700 mt-1">Indicative bundles in AED — confirm details in your booking thread.</p>
        <div className="mt-5 grid md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-3xl border border-taupe-100 bg-cream-50 p-5 flex flex-col"
            >
              <div className="font-serif text-lg font-semibold text-charcoal-700">{pkg.name}</div>
              <div className="mt-2 text-2xl font-semibold text-charcoal-700">{formatAed(pkg.price)}</div>
              <p className="mt-2 text-sm text-taupe-700 flex-1">{pkg.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-serif font-semibold text-charcoal-700">Portfolio</h2>
          <div className="text-sm text-taupe-700">Recent work from this creative.</div>
        </div>
        {photographer.portfolio.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-taupe-100 bg-cream-100 p-8 text-center text-taupe-700 text-sm">
            Portfolio images will appear here once uploaded.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            {photographer.portfolio.map((src, idx) => (
              <div
                key={src + idx}
                className="rounded-3xl overflow-hidden border border-taupe-100 bg-cream-100"
              >
                <img
                  src={src}
                  alt={`${photographer.name} portfolio ${idx + 1}`}
                  className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Availability snapshot */}
      <section className="mt-10 rounded-3xl border border-taupe-100 bg-cream-100/80 p-6 shadow-sm">
        <h2 className="text-xl font-serif font-semibold text-charcoal-700">Availability calendar</h2>
        <p className="text-sm text-taupe-700 mt-1">
          Next 90 days: <strong>{openDates}</strong> open slots loaded from the API (read-only for clients).
        </p>
        <div className="mt-4 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {calendarRows.slice(0, 24).map((r) => (
            <span
              key={r.date}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium border',
                r.is_booked
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200',
              ].join(' ')}
            >
              {r.date}
            </span>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-700">Reviews</h2>
        <div className="mt-4 rounded-2xl border border-taupe-100 bg-cream-50 p-8 text-center text-sm text-taupe-700">
          Written reviews from verified bookings will appear here. Average rating today:{' '}
          <strong className="text-charcoal-700">{photographer.rating.toFixed(1)} ★</strong>
        </div>
      </section>
    </div>
  )
}
