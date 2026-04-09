import type { Booking, BookingStatus, DashboardBookingFilter } from '../../lib/uiTypes'

export { formatAed } from '../../lib/formatCurrency'

export function dashboardBookingCounts(
  bookings: Booking[],
): Partial<Record<DashboardBookingFilter, number>> {
  const completed = bookings.filter(
    (b) =>
      b.status === 'completed_by_client' || b.status === 'completed_by_admin',
  ).length
  return {
    all: bookings.length,
    requested: bookings.filter((b) => b.status === 'requested').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    completed,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  }
}

export function filterBookingsByDashboard(
  bookings: Booking[],
  filter: DashboardBookingFilter,
): Booking[] {
  const byDateDesc = (a: Booking, b: Booking) => b.date.localeCompare(a.date)
  if (filter === 'all') return [...bookings].sort(byDateDesc)
  if (filter === 'completed') {
    return bookings
      .filter(
        (b) =>
          b.status === 'completed_by_client' || b.status === 'completed_by_admin',
      )
      .sort(byDateDesc)
  }
  return bookings.filter((b) => b.status === filter).sort(byDateDesc)
}

export function prettyStatus(status: BookingStatus): string {
  switch (status) {
    case 'requested':
      return 'Pending'
    case 'accepted':
      return 'Confirmed'
    case 'rejected':
      return 'Declined'
    case 'completed_by_client':
    case 'completed_by_admin':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function statusToneClass(status: BookingStatus): string {
  if (
    status === 'accepted' ||
    status === 'completed_by_client' ||
    status === 'completed_by_admin'
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (status === 'requested') {
    return 'bg-pine-50 text-pine-500 border-pine-100'
  }
  if (status === 'rejected') {
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }
  if (status === 'cancelled') {
    return 'bg-parchment-200 text-charcoal-700 border-parchment-200'
  }
  return 'bg-parchment-200 text-charcoal-700 border-parchment-200'
}
