import { create } from 'zustand'
import { get as apiGet } from '../lib/api'
import type { Photographer } from '../lib/uiTypes'

type ListFilters = {
  search?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  specialization?: string
  isAvailable?: boolean
  isFeatured?: boolean
}

const mapListItem = (item: any): Photographer => {
  const availability = item?.is_available ? 'Available' : 'Unavailable'
  const status = item?.verified ? 'approved' : 'pending'

  // specializations_list is a backend field name; our UI uses `category`.
  const specialization = Array.isArray(item?.specializations_list)
    ? item.specializations_list[0]
    : undefined

  return {
    id: String(item?.id ?? ''),
    userId: item?.user_id ? String(item.user_id) : undefined,
    name: item?.full_name ?? 'Unknown',
    price: Number(item?.price_per_day ?? 0),
    rating: Number(item?.rating ?? 0),
    image: item?.profile_picture_url ?? '',
    portfolio: [],
    category:
      specialization ?? item?.location ?? item?.specializations ?? 'Photography',
    availability,
    status,
    verified: item?.verified === true,
    isFeatured: item?.is_featured === true,
    specializationsList: Array.isArray(item?.specializations_list) ? item.specializations_list : [],
  }
}

const mapProfile = (profile: any): Photographer => {
  const availability = profile?.is_available ? 'Available' : 'Unavailable'
  const status = profile?.verified ? 'approved' : 'pending'
  const specialization = Array.isArray(profile?.specializations_list)
    ? profile.specializations_list[0]
    : undefined
  const rawPortfolioItems = Array.isArray(profile?.portfolio_items)
    ? profile.portfolio_items
    : []

  return {
    id: String(profile?.id ?? ''),
    userId: profile?.user_id ? String(profile.user_id) : undefined,
    name: profile?.full_name ?? 'Unknown',
    price: Number(profile?.price_per_day ?? 0),
    rating: Number(profile?.rating ?? 0),
    image: profile?.profile_picture_url ?? '',
    portfolio: rawPortfolioItems.map((x: any) => String(x?.media_url ?? '')),
    category: specialization ?? profile?.location ?? 'Photography',
    availability,
    status,
    verified: profile?.verified === true,
    isFeatured: profile?.is_featured === true,
    description: profile?.description ?? undefined,
    yearsOfExperience: profile?.years_of_experience ?? undefined,
    location: profile?.location ?? undefined,
    instagramUrl: profile?.instagram_url ?? undefined,
    specializationsList: Array.isArray(profile?.specializations_list) ? profile.specializations_list : [],
    portfolioItems: rawPortfolioItems.map((x: any) => ({
      id: String(x?.id ?? ''),
      mediaUrl: String(x?.media_url ?? ''),
      mediaType: (x?.media_type === 'video' ? 'video' : 'image') as 'image' | 'video',
      caption: x?.caption ?? undefined,
      category: x?.category ?? undefined,
      displayOrder: x?.display_order ?? undefined,
    })),
  }
}

type PhotographerState = {
  items: Photographer[]
  loading: boolean
  fetchList: (filters?: ListFilters) => Promise<void>
  fetchById: (id: string) => Promise<Photographer | null>
  fetchMyProfile: () => Promise<Photographer | null>
}

export const usePhotographerStore = create<PhotographerState>()((set, storeGet) => ({
  items: [],
  loading: false,
  fetchList: async (filters) => {
    set({ loading: true })
    try {
      const res = await apiGet<{
        items: any[]
      }>('/photographers', {
        page: 1,
        page_size: 100,
        search: filters?.search,
        location: filters?.location,
        min_price: filters?.minPrice,
        max_price: filters?.maxPrice,
        specialization: filters?.specialization,
        is_available: filters?.isAvailable,
        is_featured: filters?.isFeatured,
      } as Record<string, unknown>)

      const mapped = (res as any)?.items?.map(mapListItem) ?? []
      set({ items: mapped })
    } finally {
      set({ loading: false })
    }
  },
  fetchById: async (id) => {
    const existing = storeGet().items.find((p) => p.id === id)
    if (existing && existing.portfolio.length > 0) return existing

    const profile = await apiGet<any>(`/photographers/${id}`)
    const mapped = mapProfile(profile)
    set({
      items: [
        ...storeGet().items.filter((p) => p.id !== mapped.id),
        mapped,
      ],
    })
    return mapped
  },
  fetchMyProfile: async () => {
    const profile = await apiGet<any>('/photographers/me')
    const mapped = mapProfile(profile)
    set({
      items: [
        ...storeGet().items.filter((p) => p.id !== mapped.id),
        mapped,
      ],
    })
    return mapped
  },
}))

