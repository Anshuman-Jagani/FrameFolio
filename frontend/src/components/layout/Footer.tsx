import { Link, useLocation } from 'react-router-dom'

export default function Footer() {
  const location = useLocation()
  if (location.pathname.startsWith('/dashboard')) return null
  
  return (
    <footer className="border-t border-taupe-100 bg-cream-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-8 md:items-center md:justify-between">
          <div className="flex flex-col">
            <div className="font-serif font-semibold tracking-wide text-lg text-charcoal-700">FrameFolio</div>
            <p className="text-sm text-taupe-700 max-w-md mt-1">
              Premium photographer marketplace UI with mock data and ready
              backend integration points.
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              to="/photographers"
              className="text-sm text-taupe-700 hover:text-charcoal-700 transition-colors"
            >
              Browse photographers
            </Link>
            <Link
              to="/login"
              className="text-sm text-taupe-700 hover:text-charcoal-700 transition-colors"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="mt-8 text-xs text-taupe-500">
          © {new Date().getFullYear()} FrameFolio. All rights reserved.
        </div>
      </div>
    </footer>
  )
}


