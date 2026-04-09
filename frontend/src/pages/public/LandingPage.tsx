import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PhotographerCard from '../../components/cards/PhotographerCard'
import { PhotographerCardSkeleton } from '../../components/ui/Skeletons'
import { usePhotographerStore } from '../../store/photographerStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatAed } from '../../lib/formatCurrency'

export default function LandingPage() {
  const [query, setQuery] = useState('')
  const photographers = usePhotographerStore((s) => s.items)
  const loading = usePhotographerStore((s) => s.loading)
  const fetchList = usePhotographerStore((s) => s.fetchList)

  usePageTitle('Discover Photographers')

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const approvedPhotographers = useMemo(
    () => photographers.filter((p) => p.status === 'approved'),
    [photographers],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return approvedPhotographers
    return approvedPhotographers.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [approvedPhotographers, query])

  const featured = useMemo(() => {
    const feat = approvedPhotographers.filter((p) => p.isFeatured)
    const rest = approvedPhotographers
      .filter((p) => !p.isFeatured)
      .sort((a, b) => b.rating - a.rating)
    return [...feat, ...rest].slice(0, 3)
  }, [approvedPhotographers])

  const categories = useMemo(() => {
    return Array.from(new Set(photographers.map((p) => p.category)))
  }, [photographers])

  const categoryChips = useMemo(() => {
    const base = ['Portraits', 'Events', 'Corporate', 'Reels', 'Weddings', 'Product']
    return [...new Set([...base, ...categories])]
  }, [categories])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <section className="rounded-3xl border border-parchment-200 bg-gradient-to-br from-parchment-200 via-parchment-100 to-parchment-100 shadow-sm overflow-hidden">
        <div className="p-8 sm:p-10 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-parchment-200 bg-parchment-100/80 px-3 py-1 text-sm font-medium text-olive-500">
              <span className="h-2 w-2 rounded-full bg-pine-500" />
              Find your perfect photographer
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-serif font-semibold tracking-tight text-charcoal-700">
              Premium photography, booked with ease.
            </h1>
            <p className="mt-3 text-olive-500 max-w-xl">
              Browse top photographers, request a booking, and message instantly
              using a modern, mobile-friendly marketplace UI.
            </p>

            <div className="mt-6">
              <label className="sr-only" htmlFor="search">
                Search photographers
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or category (e.g., Wedding)"
                  className="flex-1 rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500 shadow-sm"
                />
                <Link
                  to="/photographers"
                  state={{ query }}
                  className="rounded-2xl bg-pine-500 text-parchment-50 px-8 py-3 text-sm font-medium hover:bg-pine-600 transition-colors text-center"
                >
                  Search
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/photographers"
                className="rounded-xl bg-pine-500 text-white px-6 py-3 text-sm font-medium hover:bg-pine-600 transition-colors text-center"
              >
                Browse photographers
              </Link>
              <Link
                to="/register?role=photographer"
                className="rounded-xl border border-parchment-200 text-charcoal-700 hover:bg-parchment-200 px-6 py-3 text-sm font-medium transition-colors text-center"
              >
                Join as photographer
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-pine-500/10 blur-xl" />
            <div className="absolute -bottom-10 -right-8 w-28 h-28 rounded-full bg-copper-500/10 blur-xl" />

            <div className="rounded-3xl bg-parchment-100/80 border border-parchment-200 border-t-2 border-pine-400 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-olive-500">
                    Featured photographers
                  </div>
                  <div className="text-2xl font-serif font-semibold mt-1 text-charcoal-700">Top rated picks</div>
                </div>
                <span className="rounded-full bg-pine-100 text-pine-700 text-xs font-semibold px-3 py-1">★ Top Rated</span>
              </div>

              <div className="mt-5 grid gap-4">
                {featured.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-12 w-12 rounded-full object-cover border border-parchment-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center text-sm font-semibold border border-parchment-200">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-charcoal-700">{p.name}</div>
                      <div className="text-sm text-olive-500">
                        {p.category} · {p.rating.toFixed(1)} rating
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-charcoal-700">{formatAed(p.price)}</div>
                      <Link
                        to={`/photographers/${p.id}/booking`}
                        className="text-xs text-pine-500 font-medium hover:underline"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-12 rounded-3xl border border-parchment-200 bg-parchment-200/80 p-8 sm:p-10 shadow-sm">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-700 text-center">
          How FrameFolio works
        </h2>
        <div className="mt-8 grid md:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'Search', body: 'Filter by style, budget, and availability across the UAE.' },
            { step: '2', title: 'Book', body: 'Request a date, pay your advance securely, and message your photographer.' },
            { step: '3', title: 'Shoot', body: 'Shoot day support, completion, and reviews — all in one place.' },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-500 text-parchment-50 font-serif text-xl font-semibold">
                {s.step}
              </div>
              <div className="mt-4 font-serif text-lg font-semibold text-charcoal-700">{s.title}</div>
              <p className="mt-2 text-sm text-olive-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-olive-500">
        <span className="rounded-full border border-parchment-200 bg-parchment-100 px-4 py-2">
          Verified photographer profiles
        </span>
        <span className="rounded-full border border-parchment-200 bg-parchment-100 px-4 py-2">
          Reviews from real bookings
        </span>
        <span className="rounded-full border border-parchment-200 bg-parchment-100 px-4 py-2">
          AED pricing · UAE-first marketplace
        </span>
      </section>

      {/* Categories */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-serif font-semibold text-charcoal-700">Categories</h2>
          <div className="text-sm text-olive-500">
            Premium photographers across popular styles.
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categoryChips.map((c) => (
            <Link
              key={c}
              to="/photographers"
              state={{ category: c }}
              className="rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm font-medium text-olive-500 hover:text-charcoal-700 hover:border-pine-500/40 hover:bg-pine-50/30 transition-colors text-center"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Search preview */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-serif font-semibold text-charcoal-700">Photographers</h2>
          <div className="text-sm text-olive-500">
            Showing {results.length} premium profiles.
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading && photographers.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <PhotographerCardSkeleton key={i} />)
            : results.slice(0, 6).map((p) => (
              <PhotographerCard
                key={p.id}
                id={p.id}
                name={p.name}
                image={p.image}
                price={p.price}
                rating={p.rating}
                availability={p.availability}
                category={p.category}
                verified={p.verified}
              />
            ))
          }
        </div>

        <div className="mt-7 flex justify-end">
          <Link
            to="/photographers"
            className="rounded-2xl bg-pine-500 text-parchment-50 px-5 py-3 text-sm font-medium hover:bg-pine-600 transition-colors"
          >
            View all photographers
          </Link>
        </div>
      </section>
    </div>
  )
}


