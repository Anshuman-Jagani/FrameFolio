/** Skeleton loader shimmer components */

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'animate-pulse bg-gradient-to-r from-parchment-200 via-parchment-100 to-parchment-200 bg-[length:200%_100%] rounded-xl',
        className,
      ].join(' ')}
      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' }}
    />
  )
}

export function PhotographerCardSkeleton() {
  return (
    <div className="bg-parchment-100 rounded-2xl border border-parchment-200 overflow-hidden">
      <Shimmer className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-4 w-3/4 rounded-lg" />
        <Shimmer className="h-3 w-1/2 rounded-lg" />
        <div className="flex items-center justify-between pt-1">
          <Shimmer className="h-4 w-1/3 rounded-lg" />
          <Shimmer className="h-8 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function BookingRowSkeleton() {
  return (
    <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-4 flex items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-1/3 rounded-lg" />
        <Shimmer className="h-3 w-1/2 rounded-lg" />
        <Shimmer className="h-6 w-20 rounded-full mt-2" />
      </div>
      <Shimmer className="h-9 w-24 rounded-xl shrink-0" />
    </div>
  )
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-3xl border border-parchment-200 bg-parchment-200/80 p-6 sm:p-8">
      <div className="flex items-start gap-6">
        <Shimmer className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Shimmer className="h-8 w-1/2 rounded-lg" />
          <Shimmer className="h-4 w-1/3 rounded-lg" />
          <Shimmer className="h-7 w-28 rounded-full" />
        </div>
      </div>
    </div>
  )
}
