import type { Booking, BookingStatus } from './uiTypes'

/** Map `/bookings` and `/admin/bookings` API items to UI `Booking`. */
export function mapBookingFromApi(b: unknown): Booking {
  const x = b as Record<string, unknown>
  return {
    id: String(x?.id ?? ''),
    photographerId: String(x?.photographer_id ?? ''),
    clientId: String(x?.client_id ?? ''),
    status: x?.status as BookingStatus,
    date: String(x?.date ?? ''),
    price: Number(x?.total_amount ?? 0),
    advanceAmount: Number(x?.advance_amount ?? 0),
    remainingAmount: Number(x?.remaining_amount ?? 0),
    clientName: x?.client_name ? String(x.client_name) : undefined,
    photographerName: x?.photographer_name ? String(x.photographer_name) : undefined,
    createdAt: x?.created_at ? String(x.created_at) : undefined,
  }
}
