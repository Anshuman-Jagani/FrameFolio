import type { Booking } from '../../lib/uiTypes'
import { formatAed, prettyStatus, statusToneClass } from './bookingUi'

type Props = {
  booking: Booking
  /** Photographer name (client view) or client name (photographer view). */
  partnerTitle: string
  mode: 'client' | 'photographer'
  busy?: boolean
  onMessage?: () => void
  onAccept?: () => void
  onReject?: () => void
  onMarkComplete?: () => void
  onCancel?: () => void
  onLeaveReview?: () => void
  hasReview?: boolean
}

export default function BookingRow({
  booking,
  partnerTitle,
  mode,
  busy,
  onMessage,
  onAccept,
  onReject,
  onMarkComplete,
  onCancel,
  onLeaveReview,
  hasReview,
}: Props) {
  const canAct = !busy
  const isPending = booking.status === 'requested'
  const isConfirmed = booking.status === 'accepted'
  const isCompleted = booking.status === 'completed_by_client' || booking.status === 'completed_by_admin'

  return (
    <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="font-semibold text-charcoal-700 truncate">{partnerTitle}</div>
        <div className="text-sm text-olive-500">
          <span className="font-medium text-charcoal-600">{booking.date}</span>
          <span className="mx-2 text-copper-300">·</span>
          <span>{formatAed(booking.price)} total</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-copper-600">
          <span>Advance {formatAed(booking.advanceAmount)}</span>
          <span>Balance {formatAed(booking.remainingAmount)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border',
              statusToneClass(booking.status),
            ].join(' ')}
          >
            {prettyStatus(booking.status)}
          </span>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2 sm:items-end">
        {mode === 'client' ? (
          <>
            {onMessage ? (
              <button
                type="button"
                disabled={!canAct}
                className="rounded-xl bg-pine-500 text-parchment-50 px-4 py-2 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50"
                onClick={onMessage}
              >
                Message
              </button>
            ) : null}
            {isConfirmed && onMarkComplete ? (
              <>
                <button
                  type="button"
                  disabled={!canAct}
                  className="rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  onClick={onMarkComplete}
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  disabled={!canAct}
                  className="rounded-xl border border-rose-300 text-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-50"
                  onClick={onCancel}
                >
                  Cancel Booking
                </button>
              </>
            ) : null}
            {isPending && onCancel ? (
              <button
                type="button"
                disabled={!canAct}
                className="rounded-xl border border-rose-300 text-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-50"
                onClick={onCancel}
              >
                Cancel Booking
              </button>
            ) : null}
            {isCompleted && onLeaveReview ? (
              hasReview ? (
                <span className="inline-flex items-center gap-1 text-amber-500 font-medium text-sm">
                  <span>★★★★★</span> Reviewed
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!canAct}
                  className="rounded-xl bg-pine-500 text-white px-4 py-2 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50"
                  onClick={onLeaveReview}
                >
                  Leave a Review
                </button>
              )
            ) : null}
          </>
        ) : (
          <>
            {isPending ? (
              <>
                {onAccept ? (
                  <button
                    type="button"
                    disabled={!canAct}
                    className="rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    onClick={onAccept}
                  >
                    Accept
                  </button>
                ) : null}
                {onReject ? (
                  <button
                    type="button"
                    disabled={!canAct}
                    className="rounded-xl border border-rose-200 text-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-50 transition-colors disabled:opacity-50"
                    onClick={onReject}
                  >
                    Decline
                  </button>
                ) : null}
              </>
            ) : isConfirmed && onMarkComplete ? (
              <button
                type="button"
                disabled={!canAct}
                className="rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                onClick={onMarkComplete}
              >
                Mark completed
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
