import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-serif font-bold text-parchment-200 select-none leading-none">
        404
      </div>
      <h1 className="mt-4 text-3xl sm:text-4xl font-serif font-semibold text-charcoal-700 tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-olive-500 max-w-md">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          to="/"
          className="rounded-2xl bg-pine-500 text-parchment-50 px-6 py-3 text-sm font-medium hover:bg-pine-600 transition-colors"
        >
          Back to home
        </Link>
        <Link
          to="/photographers"
          className="rounded-2xl border border-parchment-200 text-charcoal-700 px-6 py-3 text-sm font-medium hover:bg-parchment-200 transition-colors"
        >
          Browse photographers
        </Link>
      </div>

      {/* Decorative */}
      <div className="mt-16 flex items-center gap-3 opacity-30 select-none">
        <div className="h-px w-16 bg-copper-500" />
        <span className="font-serif text-lg text-copper-500">FrameFolio</span>
        <div className="h-px w-16 bg-copper-500" />
      </div>
    </div>
  )
}
