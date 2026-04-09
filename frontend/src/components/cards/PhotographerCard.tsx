import { useNavigate } from 'react-router-dom'
import type { Photographer } from '../../lib/uiTypes'
import { formatAed } from '../../lib/formatCurrency'
import VerifiedBadge from '../ui/VerifiedBadge'

type Props = Pick<
  Photographer,
  'id' | 'name' | 'image' | 'price' | 'rating' | 'availability' | 'category'
> & {
  onBookLabel?: string
  verified?: boolean
}

export default function PhotographerCard({
  id,
  name,
  image,
  price,
  rating,
  availability,
  category,
  onBookLabel = 'Book',
  verified = false,
}: Props) {
  const navigate = useNavigate()

  return (
    <article
      className="group bg-parchment-100 rounded-2xl shadow-sm border border-parchment-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/photographers/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/photographers/${id}`)
      }}
    >
      <div className="relative aspect-[4/3]">
        {image ? (
          <img
            src={image}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-pine-100 flex items-center justify-center">
            <span className="text-pine-700 text-3xl font-semibold">
              {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
          {verified ? <VerifiedBadge className="backdrop-blur-sm" /> : null}
          <span
            className={[
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur',
              availability === 'Available'
                ? 'bg-parchment-200/90 text-charcoal-700 border-parchment-200'
                : availability === 'Limited'
                  ? 'bg-pine-50/90 text-pine-500 border-pine-100'
                  : 'bg-charcoal-700/70 text-parchment-50 border-parchment-200/20',
            ].join(' ')}
          >
            {availability}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-charcoal-700">{name}</div>
            {/* Category badge — improvement #6 */}
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-parchment-200 text-olive-500 font-medium">
                {category}
              </span>
              <span className="text-xs text-copper-500">{rating.toFixed(1)} ★</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold text-charcoal-700">{formatAed(price)}</div>
            <div className="text-xs text-copper-500">per day</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 text-pine-500">
            {'★★★★★'.split('').map((s, idx) => (
              <span key={idx} className={idx < Math.round(rating) ? 'text-sm' : 'text-sm text-parchment-200'}>
                {s}
              </span>
            ))}
          </div>

          <button
            className="rounded-xl bg-pine-500 text-parchment-50 px-3 py-2 text-sm font-medium hover:bg-pine-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/photographers/${id}/booking`)
            }}
          >
            {onBookLabel}
          </button>
        </div>
      </div>
    </article>
  )
}
