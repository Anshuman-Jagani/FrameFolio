import { create } from 'zustand'
import { get as apiGet, patch as apiPatch, post as apiPost } from '../lib/api'
import type { Booking, BookingStatus } from '../lib/uiTypes'
import { mapBookingFromApi } from '../lib/bookingMap'

type BookingState = {
  bookings: Booking[]
  loading: boolean
  /** Omit status to load every booking for the current user (dashboards filter client-side). */
  fetchMyBookings: (status?: BookingStatus) => Promise<void>
  requestBooking: (input: {
    photographerId: string
    date: string // YYYY-MM-DD
    price: number // total_amount
  }) => Promise<void>
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>
  createReview: (input: {
    bookingId: string
    rating: number
    comment?: string
  }) => Promise<void>
}

export const useBookingStore = create<BookingState>()((set, get) => ({
  bookings: [],
  loading: false,
  fetchMyBookings: async (status) => {
    set({ loading: true })
    try {
      const res = await apiGet<{
        items: any[]
      }>('/bookings', status ? { status } : undefined)

      const mapped =
        (res as { items?: Record<string, unknown>[] })?.items?.map(mapBookingFromApi) ?? []
      set({ bookings: mapped })
    } finally {
      set({ loading: false })
    }
  },
  requestBooking: async ({ photographerId, date, price }) => {
    const total_amount = price
    const advance_amount = Math.round(total_amount * 0.3 * 100) / 100
    const remaining_amount = Math.round((total_amount - advance_amount) * 100) / 100

    await apiPost('/bookings', {
      photographer_id: photographerId,
      date,
      total_amount,
      advance_amount,
      remaining_amount,
    })

    await get().fetchMyBookings()
  },
  updateBookingStatus: async (bookingId, status) => {
    await apiPatch(`/bookings/${bookingId}/status`, { status })
    await get().fetchMyBookings()
  },
  createReview: async ({ bookingId, rating, comment }) => {
    const body: Record<string, unknown> = {
      booking_id: bookingId,
      rating,
    }
    if (comment?.trim()) body.comment = comment.trim()
    await apiPost('/bookings/reviews', body)
    await get().fetchMyBookings()
  },
}))

