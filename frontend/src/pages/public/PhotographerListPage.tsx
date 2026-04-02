import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PhotographerCard from '../../components/cards/PhotographerCard'
import { PhotographerCardSkeleton } from '../../components/ui/Skeletons'
import type { PhotographerAvailability, Photographer } from '../../lib/uiTypes'
import { usePhotographerStore } from '../../store/photographerStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import { Search, ChevronDown } from 'lucide-react'

type Filters = {
  query: string
  category: string
  customCategory: string
  location: string
  minPrice: number
  maxPrice: number
  availability: PhotographerAvailability | 'Any'
}

const GENERIC_CATEGORIES = [
  'Wedding',
  'Portrait',
  'Corporate',
  'Events',
  'Reels',
  'Product',
  'Architecture',
  'Fashion',
  'Food',
  'Real Estate',
  'Travel',
  'Sports',
  'Maternity',
  'Newborn',
  'Birthday',
  'Graduation',
  'Other',
]

const availabilityOptions: Array<Filters['availability']> = [
  'Any',
  'Available',
  'Limited',
  'Unavailable',
]

type PhotographerListPageProps = {
  embedded?: boolean
}

export default function PhotographerListPage({ embedded = false }: PhotographerListPageProps) {
  const location = useLocation()
  const prefill = (location.state as { query?: string; category?: string }) ?? {}
  const photographers = usePhotographerStore((s) => s.items)
  const loading = usePhotographerStore((s) => s.loading)
  const fetchList = usePhotographerStore((s) => s.fetchList)

  usePageTitle(embedded ? 'New booking' : 'Browse Photographers')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    query: prefill.query ?? '',
    category: prefill.category ?? '',
    customCategory: '',
    location: '',
    minPrice: 0,
    maxPrice: 10000,
    availability: 'Any',
  })

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

  const [debouncedFilters, setDebouncedFilters] = useState(filters)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilters(filters), 400)
    return () => window.clearTimeout(t)
  }, [filters])

  useEffect(() => {
    const categoryToUse = filters.category === 'custom' ? filters.customCategory : filters.category
    void fetchList({
      search: debouncedFilters.query.trim() || undefined,
      location: debouncedFilters.location.trim() || undefined,
      minPrice: debouncedFilters.minPrice,
      maxPrice: debouncedFilters.maxPrice,
      specialization: categoryToUse || undefined,
      isAvailable:
        debouncedFilters.availability === 'Any'
          ? undefined
          : debouncedFilters.availability === 'Available',
    })
  }, [fetchList, debouncedFilters])

  const uniqueCategories = useMemo(() => {
    const cats = new Set(photographers.map((p) => p.category).filter(Boolean))
    return Array.from(cats)
  }, [photographers])

  const allCategories = useMemo(() => {
    const combined = new Set([...GENERIC_CATEGORIES, ...uniqueCategories])
    return Array.from(combined).sort()
  }, [uniqueCategories])

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const categoryToUse = filters.category === 'custom' ? filters.customCategory.toLowerCase() : filters.category.toLowerCase()
    return photographers
      .filter((p) => p.status === 'approved')
      .filter((p) => {
        if (categoryToUse && p.category.toLowerCase() !== categoryToUse) return false
        if (filters.availability !== 'Any' && p.availability !== filters.availability)
          return false
        if (p.price < filters.minPrice) return false
        if (p.price > filters.maxPrice) return false
        if (!q) return true
        return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      })
  }, [filters, photographers])

  const handleCategorySelect = (cat: string) => {
    if (cat === 'custom') {
      setFilters((s) => ({ ...s, category: 'custom', customCategory: '' }))
    } else {
      setFilters((s) => ({ ...s, category: cat, customCategory: '' }))
    }
    setCategoryDropdownOpen(false)
  }

  const displayCategory = filters.category === 'custom' 
    ? filters.customCategory 
    : filters.category || 'All categories'

  const FiltersPanel = (
    <div className="rounded-3xl border border-taupe-100 bg-cream-100/80 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-charcoal-700">Filters</div>
        <button
          onClick={() =>
            setFilters({
              query: '',
              category: '',
              customCategory: '',
              location: '',
              minPrice: 0,
              maxPrice: 10000,
              availability: 'Any',
            })
          }
          className="text-xs text-burgundy-500 hover:underline"
        >
          Reset all
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <div>
          <label className="text-xs font-medium text-taupe-700">Search</label>
          <div className="mt-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe-400" />
            <input
              value={filters.query}
              onChange={(e) => setFilters((s) => ({ ...s, query: e.target.value }))}
              placeholder="Name or keyword..."
              className="w-full rounded-xl border border-taupe-100 bg-cream-50 pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-taupe-700">Category</label>
          <div className="mt-1 relative">
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="w-full rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm text-left flex items-center justify-between"
            >
              <span className={filters.category ? 'text-charcoal-700' : 'text-taupe-500'}>
                {displayCategory}
              </span>
              <ChevronDown className={`w-4 h-4 text-taupe-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {categoryDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-taupe-100 bg-cream-50 shadow-lg">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect('')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-cream-100"
                  >
                    All categories
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-cream-100"
                    >
                      {cat}
                    </button>
                  ))}
                  <div className="border-t border-taupe-100 my-1" />
                  <button
                    type="button"
                    onClick={() => handleCategorySelect('custom')}
                    className="w-full px-4 py-2 text-left text-sm text-burgundy-500 hover:bg-cream-100"
                  >
                    + Custom category
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {filters.category === 'custom' && (
            <input
              value={filters.customCategory}
              onChange={(e) => setFilters((s) => ({ ...s, customCategory: e.target.value }))}
              placeholder="Enter category..."
              className="mt-2 w-full rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
            />
          )}
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-medium text-taupe-700">Location</label>
          <input
            value={filters.location}
            onChange={(e) => setFilters((s) => ({ ...s, location: e.target.value }))}
            placeholder="e.g. Dubai Marina"
            className="mt-1 w-full rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700 placeholder:text-taupe-500"
          />
        </div>

        {/* Availability */}
        <div>
          <label className="text-xs font-medium text-taupe-700">Availability</label>
          <select
            value={filters.availability}
            onChange={(e) =>
              setFilters((s) => ({
                ...s,
                availability: e.target.value as Filters['availability'],
              }))
            }
            className="mt-1 w-full rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-burgundy-500/30 text-charcoal-700"
          >
            {availabilityOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range - spans full width */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-taupe-700">
            Price range (AED): {filters.minPrice} - {filters.maxPrice}
          </label>
          <div className="mt-3 relative h-6">
            <div className="absolute top-2 left-0 right-0 h-1.5 bg-taupe-200 rounded-full" />
            <div
              className="absolute top-2 h-1.5 bg-burgundy-500 rounded-full"
              style={{
                left: `${(filters.minPrice / 10000) * 100}%`,
                right: `${100 - (filters.maxPrice / 10000) * 100}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={filters.minPrice}
              onChange={(e) =>
                setFilters((s) => ({
                  ...s,
                  minPrice: Math.min(Number(e.target.value), s.maxPrice - 100),
                }))
              }
              className="absolute top-0 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
            />
            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters((s) => ({
                  ...s,
                  maxPrice: Math.max(Number(e.target.value), s.minPrice + 100),
                }))
              }
              className="absolute top-0 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute top-1.5 w-4 h-4 bg-burgundy-500 rounded-full shadow-md pointer-events-none transform -translate-x-1/2"
              style={{ left: `${(filters.minPrice / 10000) * 100}%` }}
            />
            <div
              className="absolute top-1.5 w-4 h-4 bg-burgundy-500 rounded-full shadow-md pointer-events-none transform -translate-x-1/2"
              style={{ left: `${(filters.maxPrice / 10000) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-taupe-500 mt-1">
            <span>0</span>
            <span>2500</span>
            <span>5000</span>
            <span>7500</span>
            <span>10000</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'}>
      {!embedded ? (
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-charcoal-700">
              Photographers
            </h1>
            <p className="text-taupe-700 mt-2">
              Browse premium profiles. Request a booking in two clicks.
            </p>
          </div>
          <div className="text-sm text-taupe-700">
            Showing <span className="font-medium text-charcoal-700">{results.length}</span>{' '}
            profiles
          </div>
        </div>
      ) : (
        <div className="text-sm text-taupe-700 mb-4">
          Browse photographers and request a date that works for you.
        </div>
      )}

      {!embedded ? (
        <>
          {/* Mobile filter toggle */}
          <div className="mt-6 lg:hidden">
            <button
              className="flex items-center gap-2 rounded-2xl border border-taupe-100 bg-cream-100 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-cream-200 transition-colors"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <span>Filters</span>
              <span className={`transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>
          <div className="mt-8 grid lg:grid-cols-[300px_1fr] gap-6">
            <aside
              className={`lg:sticky top-24 self-start ${filtersOpen ? 'block' : 'hidden lg:block'}`}
            >
              {FiltersPanel}
            </aside>
            <section>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading && photographers.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <PhotographerCardSkeleton key={i} />
                    ))
                  : results.map((p: Photographer) => (
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
                    ))}
              </div>

              {results.length === 0 ? (
                <div className="mt-10 rounded-3xl border border-taupe-100 bg-cream-100 p-8 text-center">
                  <div className="text-charcoal-700 font-semibold">No photographers found</div>
                  <div className="text-taupe-700 mt-2 text-sm">Try adjusting the filters.</div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {FiltersPanel}

          <section>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading && photographers.length === 0
                ? Array.from({ length: 6 }).map((_, i) => <PhotographerCardSkeleton key={i} />)
                : results.map((p: Photographer) => (
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
                  ))}
            </div>

            {results.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-taupe-100 bg-cream-100 p-8 text-center">
                <div className="text-charcoal-700 font-semibold">No photographers found</div>
                <div className="text-taupe-700 mt-2 text-sm">Try adjusting the filters.</div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}
