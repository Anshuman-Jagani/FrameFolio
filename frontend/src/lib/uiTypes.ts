export type PhotographerAvailability = 'Available' | 'Limited' | 'Unavailable'
export type PhotographerStatus = 'approved' | 'pending'

export type Photographer = {
  id: string // PhotographerProfile.id
  userId?: string // User.id (needed for messaging receiver_id)
  name: string
  price: number
  rating: number
  image: string
  portfolio: string[]
  portfolioItems?: {
    id: string
    mediaUrl: string
    mediaType: 'image' | 'video'
    caption?: string
    category?: string
    displayOrder?: number
  }[]
  category: string
  availability: PhotographerAvailability
  status: PhotographerStatus
  /** Backend `verified` on profile — surfaced for badges. */
  verified?: boolean
  isFeatured?: boolean
  description?: string
  yearsOfExperience?: number
  location?: string
  instagramUrl?: string
  specializationsList?: string[]
}

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'completed_by_client'
  | 'completed_by_admin'
  | 'cancelled'

export type Booking = {
  id: string
  photographerId: string
  clientId: string
  status: BookingStatus
  date: string // YYYY-MM-DD
  price: number // total_amount
  advanceAmount: number
  remainingAmount: number
  clientName?: string
  photographerName?: string
  createdAt?: string
}

/** Chips on client / photographer dashboards (client-side filter). */
export type DashboardBookingFilter =
  | 'all'
  | 'requested'
  | 'accepted'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export type ChatMessage = {
  id: string
  senderId: string
  text: string
  createdAt: string // ISO timestamp
}

export type ChatThread = {
  id: string // other_user_id
  clientId: string
  photographerId: string
  messages: ChatMessage[]
}

