import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBookingStore } from '../../store/bookingStore'
import { usePhotographerStore } from '../../store/photographerStore'
import { useToast } from '../../components/ui/Toast'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatAed } from '../../lib/formatCurrency'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function BookingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const photographers = usePhotographerStore((s) => s.items)
  const fetchById = usePhotographerStore((s) => s.fetchById)
  const photographer = useMemo(() => photographers.find((p) => p.id === id), [id, photographers])

  const { user } = useAuthStore()
  const requestBooking = useBookingStore((s) => s.requestBooking)
  const { toast } = useToast()

  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  usePageTitle(`Book ${photographer?.name ?? 'Photographer'}`)

  useEffect(() => {
    if (!id) return
    if (photographers.some((p) => p.id === id)) return
    void fetchById(id)
  }, [id, photographers, fetchById])

  const numberOfDays = useMemo(() => {
    if (!startDate || !endDate) return 1
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }, [startDate, endDate])

  const totalPrice = useMemo(() => {
    if (!photographer) return 0
    return photographer.price * numberOfDays
  }, [photographer, numberOfDays])

  const canRequest = photographer?.availability !== 'Unavailable' && !!startDate

  if (!photographer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-taupe-100 bg-cream-100 p-8">
          Loading photographer...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate(`/photographers/${id}`)}
        className="flex items-center gap-2 text-sm text-taupe-600 hover:text-charcoal-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </button>
      <div className="flex items-start justify-between gap-8 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-charcoal-700">
            Booking request
          </h1>
          <p className="mt-2 text-taupe-700">
            Select date range, review pricing in AED, and submit your booking request.
          </p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_420px] gap-6 items-start">
        <section className="rounded-3xl border border-taupe-100 bg-cream-100/80 backdrop-blur p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-taupe-700">Photographer</div>
              <div className="mt-1 flex items-center gap-3">
                <img
                  src={photographer.image}
                  alt={photographer.name}
                  className="h-12 w-12 rounded-2xl object-cover border border-taupe-100"
                />
                <div>
                  <div className="font-semibold text-charcoal-700">{photographer.name}</div>
                  <div className="text-sm text-taupe-700">{photographer.category}</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-taupe-500">Availability</div>
              <div className="mt-1 rounded-full border border-taupe-100 bg-cream-50/80 px-3 py-1 text-xs font-semibold text-charcoal-700">
                {photographer.availability}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-taupe-500" />
              <span className="text-xs font-medium text-taupe-700">Select date range</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-taupe-600" htmlFor="start-date">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  className="mt-1 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (endDate && new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value)
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-taupe-600" htmlFor="end-date">
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  min={startDate}
                  className="mt-1 w-full rounded-2xl border border-taupe-100 bg-cream-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!startDate}
                />
              </div>
            </div>
          </div>

          {startDate && endDate && (
            <div className="mt-4 p-3 rounded-xl bg-cream-100 border border-taupe-100">
              <div className="text-sm text-taupe-700">
                Duration: <span className="font-medium text-charcoal-700">{numberOfDays} day{numberOfDays > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="rounded-3xl border border-taupe-100 bg-cream-50 p-6 sm:p-8 shadow-sm">
          <div className="text-lg font-serif font-semibold text-charcoal-700">Summary</div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-taupe-700">Daily rate</div>
              <div className="font-semibold text-charcoal-700">{formatAed(photographer.price)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-taupe-700">Number of days</div>
              <div className="font-semibold text-charcoal-700">{numberOfDays}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-taupe-700">Date{startDate && endDate ? 's' : ''}</div>
              <div className="font-semibold text-charcoal-700 text-right text-sm">
                {startDate ? (
                  endDate ? (
                    <span>{startDate} → {endDate}</span>
                  ) : (
                    <span>{startDate}</span>
                  )
                ) : (
                  <span className="text-taupe-400">Select dates</span>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-taupe-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-charcoal-700">Total</div>
              <div className="text-xl font-serif font-semibold text-charcoal-700">{formatAed(totalPrice)}</div>
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-2xl bg-burgundy-500 text-cream-50 px-4 py-3 text-sm font-medium hover:bg-burgundy-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canRequest}
            onClick={() => {
              setError(null)

              if (!user) {
                navigate('/login')
                return
              }
              if (user.role !== 'client') {
                setError('Only clients can request bookings.')
                return
              }
              if (!startDate) {
                setError('Please select a start date.')
                return
              }

              requestBooking({ photographerId: photographer.id, date: startDate, price: totalPrice })
              toast(`Booking request sent for ${numberOfDays} day${numberOfDays > 1 ? 's' : ''}! Check your Client Dashboard.`, 'success')
              navigate('/dashboard/client')
            }}
          >
            Request booking
          </button>

          <div className="mt-4 text-xs text-taupe-500">
            Confirmed bookings appear in your client dashboard with full status tracking.
          </div>
        </aside>
      </div>
    </div>
  )
}
