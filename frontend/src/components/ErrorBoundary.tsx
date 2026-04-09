import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = { children: ReactNode }

type State = { hasError: boolean; message?: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('FrameFolio UI error:', err, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="rounded-3xl border border-parchment-200 bg-parchment-200 p-8 shadow-sm">
            <h1 className="text-2xl font-serif font-semibold text-charcoal-700">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-olive-500">
              {this.state.message ?? 'An unexpected error occurred in this section.'}
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-2xl bg-pine-500 text-parchment-50 px-5 py-3 text-sm font-medium hover:bg-pine-600 transition-colors"
            >
              Back home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
