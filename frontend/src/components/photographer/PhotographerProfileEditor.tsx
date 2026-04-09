import { useEffect, useMemo, useState } from 'react'
import type { Photographer } from '../../lib/uiTypes'
import { del, patch, post } from '../../lib/api'
import { useToast } from '../ui/Toast'

export default function PhotographerProfileEditor({
  profile,
  onRefresh,
}: {
  profile: Photographer | null
  onRefresh: () => Promise<void> | void
}) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)

  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [location, setLocation] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [specializationsText, setSpecializationsText] = useState('')

  const portfolioItems = profile?.portfolioItems ?? []

  useEffect(() => {
    if (!profile) return
    setDescription(profile.description ?? '')
    setPrice(profile.price ?? 0)
    setLocation(profile.location ?? '')
    setInstagramUrl(profile.instagramUrl ?? '')
    setSpecializationsText((profile.specializationsList ?? []).join(', '))
  }, [profile])

  const verificationLabel = useMemo(() => {
    if (!profile) return '—'
    if (profile.verified) return 'Verified'
    return 'Pending approval'
  }, [profile])

  const saveProfile = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {}
      if (description.trim()) payload.description = description.trim()
      if (specializationsText.trim()) payload.specializations = specializationsText.trim()
      if (Number.isFinite(price) && price >= 0) payload.price_per_day = price
      if (location.trim()) payload.location = location.trim()
      if (instagramUrl.trim()) payload.instagram_url = instagramUrl.trim()

      await patch('/photographers/me', payload)
      await onRefresh()
      toast('Profile updated', 'success')
    } finally {
      setLoading(false)
    }
  }

  const [newMediaUrl, setNewMediaUrl] = useState('')
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image')
  const [adding, setAdding] = useState(false)

  const addPortfolioItem = async () => {
    if (!newMediaUrl.trim() || !profile) return
    setAdding(true)
    try {
      await post('/photographers/me/portfolio', {
        media_url: newMediaUrl.trim(),
        media_type: newMediaType,
        // Backend has optional caption/category/display_order; keep minimal for now.
        display_order: portfolioItems.length,
      })
      setNewMediaUrl('')
      setNewMediaType('image')
      await onRefresh()
      toast('Portfolio item added', 'success')
    } finally {
      setAdding(false)
    }
  }

  const removePortfolioItem = async (itemId: string) => {
    setLoading(true)
    try {
      await del(`/photographers/me/portfolio/${itemId}`)
      await onRefresh()
      toast('Portfolio item removed', 'success')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="rounded-3xl border border-parchment-200 bg-parchment-100 p-6">
        <div className="text-sm font-semibold text-charcoal-700">Profile editor</div>
        <div className="text-sm text-olive-500 mt-2">Load your profile to edit details.</div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-parchment-200 bg-parchment-100 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-serif font-semibold text-charcoal-700">Profile edit</div>
          <div className="text-sm text-olive-500 mt-1">
            Verification: <span className="font-semibold text-charcoal-700">{verificationLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="text-sm font-medium text-olive-500" htmlFor="bio">
            Bio / description
          </label>
          <textarea
            id="bio"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-olive-500" htmlFor="rate">
              Hourly rate (per day)
            </label>
            <input
              id="rate"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-olive-500" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-olive-500" htmlFor="tags">
            Speciality tags (comma separated)
          </label>
          <input
            id="tags"
            value={specializationsText}
            onChange={(e) => setSpecializationsText(e.target.value)}
            placeholder="Wedding, Portrait, Event"
            className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-olive-500" htmlFor="ig">
            Instagram URL
          </label>
          <input
            id="ig"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            className="rounded-2xl bg-pine-500 text-parchment-50 px-5 py-3 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50"
            disabled={loading}
            onClick={() => void saveProfile()}
          >
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-lg font-serif font-semibold text-charcoal-700">Portfolio</div>

        {portfolioItems.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-parchment-200 bg-parchment-100 p-5 text-sm text-olive-500">
            No portfolio items yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {portfolioItems.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-parchment-200 bg-parchment-100 overflow-hidden"
              >
                {it.mediaType === 'image' ? (
                  <img src={it.mediaUrl} alt="Portfolio item" className="w-full h-28 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center text-sm text-olive-500">
                    Video
                  </div>
                )}
                <div className="p-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-olive-500 truncate">{it.category ?? '—'}</div>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 text-rose-700 px-2 py-1 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void removePortfolioItem(it.id)}
                    aria-label="Remove portfolio item"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-parchment-200 bg-parchment-200/60 p-4">
          <div className="text-sm font-semibold text-charcoal-700">Add a new item</div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-olive-500" htmlFor="mediaUrl">
                Media URL (image/video)
              </label>
              <input
                id="mediaUrl"
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-olive-500" htmlFor="mediaType">
                Media type
              </label>
              <select
                id="mediaType"
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video')}
                className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700"
              >
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </div>
            <button
              type="button"
              className="rounded-xl bg-pine-500 text-parchment-50 px-4 py-2 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50"
              disabled={adding}
              onClick={() => void addPortfolioItem()}
            >
              {adding ? 'Adding…' : 'Add to portfolio'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-copper-600">
          Legal document upload + services offered are not present in the current backend schema, so this editor focuses on
          profile + portfolio only.
        </div>
      </div>
    </div>
  )
}

