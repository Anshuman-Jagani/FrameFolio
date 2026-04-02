import { create } from 'zustand'
import type { Booking, BookingStatus } from '../lib/uiTypes'

/** Platform commission — UI + CSV until a payments API exists. */
export const PLATFORM_COMMISSION_PCT = 15

export type EarningsRow = {
  bookingId: string
  clientName: string
  shootDate: string
  grossAed: number
  commissionAed: number
  netAed: number
  payoutStatus: 'pending' | 'released'
}

type EarningsState = {
  rows: EarningsRow[]
  totalGross: number
  totalCommission: number
  totalNet: number
  pendingNet: number
  releasedNet: number
  /** Derive demo earnings from photographer booking list + commission %. */
  hydrateFromBookings: (bookings: Booking[], photographerProfileId: string) => void
  exportCsv: () => void
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function isCompleted(s: BookingStatus) {
  return s === 'completed_by_client' || s === 'completed_by_admin'
}

export const useEarningsStore = create<EarningsState>()((set, get) => ({
  rows: [],
  totalGross: 0,
  totalCommission: 0,
  totalNet: 0,
  pendingNet: 0,
  releasedNet: 0,

  hydrateFromBookings: (bookings, photographerProfileId) => {
    const mine = bookings.filter((b) => b.photographerId === photographerProfileId)
    const rows: EarningsRow[] = mine.map((b) => {
      const gross = b.price
      const commissionAed = round2((gross * PLATFORM_COMMISSION_PCT) / 100)
      const netAed = round2(gross - commissionAed)
      return {
        bookingId: b.id,
        clientName: b.clientName ?? 'Client',
        shootDate: b.date,
        grossAed: gross,
        commissionAed,
        netAed,
        payoutStatus: isCompleted(b.status) ? 'released' : 'pending',
      }
    })

    const totalGross = round2(rows.reduce((s, r) => s + r.grossAed, 0))
    const totalCommission = round2(rows.reduce((s, r) => s + r.commissionAed, 0))
    const totalNet = round2(rows.reduce((s, r) => s + r.netAed, 0))
    const pendingNet = round2(
      rows.filter((r) => r.payoutStatus === 'pending').reduce((s, r) => s + r.netAed, 0),
    )
    const releasedNet = round2(
      rows.filter((r) => r.payoutStatus === 'released').reduce((s, r) => s + r.netAed, 0),
    )

    set({
      rows,
      totalGross,
      totalCommission,
      totalNet,
      pendingNet,
      releasedNet,
    })
  },

  exportCsv: () => {
    const { rows } = get()
    const header = [
      'booking_id',
      'client',
      'shoot_date',
      'gross_aed',
      `commission_${PLATFORM_COMMISSION_PCT}pct_aed`,
      'net_aed',
      'payout_status',
    ]
    const lines = rows.map((r) =>
      [
        r.bookingId,
        `"${r.clientName.replace(/"/g, '""')}"`,
        r.shootDate,
        r.grossAed,
        r.commissionAed,
        r.netAed,
        r.payoutStatus,
      ].join(','),
    )
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `framefolio-earnings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}))
