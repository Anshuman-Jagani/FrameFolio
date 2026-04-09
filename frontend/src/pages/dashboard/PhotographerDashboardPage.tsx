import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBookingStore } from '../../store/bookingStore'
import { useChatStore } from '../../store/chatStore'
import { usePhotographerStore } from '../../store/photographerStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { DashboardBookingFilter, Photographer, PhotographerAvailability } from '../../lib/uiTypes'
import BookingRow from '../../components/bookings/BookingRow'
import { filterBookingsByDashboard } from '../../components/bookings/bookingUi'
import { get, patch } from '../../lib/api'
import { BookingRowSkeleton } from '../../components/ui/Skeletons'
import { useEarningsStore, PLATFORM_COMMISSION_PCT } from '../../store/earningsStore'
import { formatAed } from '../../lib/formatCurrency'
import AvailabilityCalendarEditor from '../../components/availability/AvailabilityCalendarEditor'
import PhotographerProfileEditor from '../../components/photographer/PhotographerProfileEditor'
import { 
  LayoutList, Clock, CalendarCheck,
  MessageCircle, Calendar, User, LogOut,
  TrendingUp, Wallet, Percent
} from 'lucide-react'

const availabilityOptions: PhotographerAvailability[] = ['Available', 'Unavailable']

type PhotographerTab = 'overview' | 'bookings' | 'availability' | 'earnings' | 'messages' | 'profile'

export default function PhotographerDashboardPage() {
  const { user } = useAuthStore()
  const bookings = useBookingStore((s) => s.bookings)
  const loading = useBookingStore((s) => s.loading)
  const fetchMyBookings = useBookingStore((s) => s.fetchMyBookings)
  const updateBookingStatus = useBookingStore((s) => s.updateBookingStatus)

  const fetchMyProfile = usePhotographerStore((s) => s.fetchMyProfile)

  const hydrateFromBookings = useEarningsStore((s) => s.hydrateFromBookings)
  const exportCsv = useEarningsStore((s) => s.exportCsv)
  const earningsRows = useEarningsStore((s) => s.rows)
  const totalGross = useEarningsStore((s) => s.totalGross)
  const totalCommission = useEarningsStore((s) => s.totalCommission)
  const pendingNet = useEarningsStore((s) => s.pendingNet)
  const releasedNet = useEarningsStore((s) => s.releasedNet)

  const [availability, setAvailability] = useState<PhotographerAvailability>('Unavailable')
  const [filter, setFilter] = useState<DashboardBookingFilter>('all')
  const [tab, setTab] = useState<PhotographerTab>('overview')
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<Photographer | null>(null)

  const { chats, conversation, fetchChats, fetchConversation, sendMessage } = useChatStore()
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [clientUsers, setClientUsers] = useState<Record<string, { name: string; image: string }>>({})

  const navigate = useNavigate()

  usePageTitle('Photographer Dashboard')

  useEffect(() => {
    if (!user) return
    void fetchMyProfile().then((p) => {
      if (!p || p.status === 'pending') {
        navigate('/photographer-pending', { replace: true })
        return
      }
      setAvailability(p.availability)
      setMyProfileId(p.id)
      setMyProfile(p)
      void fetchMyBookings()
      void fetchChats()
    })
  }, [user, fetchMyProfile, fetchChats, fetchMyBookings, navigate])

  useEffect(() => {
    if (!myProfileId) return
    hydrateFromBookings(bookings, myProfileId)
  }, [bookings, myProfileId, hydrateFromBookings])

  const visibleBookings = useMemo(
    () => filterBookingsByDashboard(bookings, filter),
    [bookings, filter],
  )

  const counts = useMemo(() => ({
    all: bookings.length,
    requested: bookings.filter(b => b.status === 'requested').length,
    accepted: bookings.filter(b => b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed_by_client' || b.status === 'completed_by_admin').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }), [bookings])

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === 'requested').length,
    [bookings],
  )

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>()
    bookings.forEach((b) => {
      m.set(b.clientId, b.clientName || 'Client')
    })
    return m
  }, [bookings])

  useEffect(() => {
    if (activeClientId) return
    if (chats.length === 0) return
    const first = chats[0]?.otherUserId
    if (!first) return
    setActiveClientId(first)
    void fetchConversation(first)
  }, [chats, activeClientId, fetchConversation])

  useEffect(() => {
    if (chats.length === 0) return
    const ids = chats.map((c) => c.otherUserId)
    const missing = ids.filter((id) => !clientUsers[id])
    if (missing.length === 0) return

    void Promise.all(
      missing.map(async (id) => {
        const u = await get<{ full_name: string; profile_picture_url?: string }>(
          `/users/public/${id}`,
        )
        return { id, name: u.full_name, image: u.profile_picture_url ?? '' }
      }),
    ).then((items) => {
      setClientUsers((prev) => {
        const next = { ...prev }
        items.forEach((it) => {
          next[it.id] = { name: it.name, image: it.image }
        })
        return next
      })
    })
  }, [chats, clientUsers, get])

  const onAvailabilityChange = async (next: PhotographerAvailability) => {
    await patch('/photographers/me', { is_available: next === 'Available' })
    setAvailability(next)
  }

  const refreshMyProfile = async () => {
    const p = await fetchMyProfile()
    if (!p) return
    setMyProfile(p)
    setAvailability(p.availability)
    setMyProfileId(p.id)
  }

  const handleLogout = () => {
    useAuthStore.getState().logout()
    navigate('/login')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const upcomingBookings = useMemo(() => 
    bookings
      .filter(b => b.status === 'accepted')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3),
    [bookings]
  )

  const StatCard = ({ label, value, icon: Icon }: { 
    label: string, value: number | string, icon: typeof LayoutList
  }) => (
    <div className="rounded-2xl border border-parchment-200 bg-parchment-100 px-5 py-4 relative">
      <Icon className="absolute top-4 right-4 w-5 h-5 text-copper-400" />
      <div className="text-xs font-semibold uppercase tracking-wide text-copper-600">{label}</div>
      <div className="text-2xl font-serif font-semibold text-charcoal-700 mt-1">{value}</div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:block sticky top-20">
          <nav className="rounded-3xl border-r border-parchment-200 bg-parchment-200/60 p-3 shadow-sm">
            <div className="flex flex-col gap-1">
              {[
                { key: 'overview', label: 'Overview', icon: LayoutList },
                { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
                { key: 'availability', label: 'Availability', icon: Calendar },
                { key: 'earnings', label: 'Earnings', icon: Wallet },
                { key: 'messages', label: 'Messages', icon: MessageCircle },
                { key: 'profile', label: 'Profile', icon: User },
              ].map((item) => {
                const Icon = item.icon
                const isActive = tab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key as PhotographerTab)}
                    className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 ${
                      isActive 
                        ? 'bg-pine-500 text-white' 
                        : 'text-olive-500 hover:bg-parchment-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              })}

              <div className="my-3 border-t border-parchment-200" />

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 text-copper-600 hover:bg-parchment-200"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </aside>

        <div>
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto pb-3 flex gap-2">
            {[
              { key: 'overview', label: 'Overview', icon: LayoutList },
              { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
              { key: 'availability', label: 'Availability', icon: Calendar },
              { key: 'earnings', label: 'Earnings', icon: Wallet },
              { key: 'messages', label: 'Messages', icon: MessageCircle },
              { key: 'profile', label: 'Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon
              const isActive = tab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as PhotographerTab)}
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-pine-500 text-white' 
                      : 'bg-parchment-200 text-olive-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-charcoal-700">
              {getGreeting()}, {user?.fullName || user?.email?.split('@')[0] || 'there'}!
            </h1>
            <p className="mt-2 text-olive-500">
              Manage your bookings, availability, and earnings from your dashboard.
            </p>
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Pending Requests" 
                  value={pendingCount} 
                  icon={Clock}
                />
                <StatCard 
                  label="Confirmed" 
                  value={counts.accepted} 
                  icon={CalendarCheck}
                />
                <StatCard 
                  label="Total Bookings" 
                  value={counts.all} 
                  icon={LayoutList}
                />
                <StatCard 
                  label="Earnings" 
                  value={formatAed(totalGross)} 
                  icon={TrendingUp}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setTab('availability')}
                  className="cursor-pointer rounded-2xl border border-parchment-200 bg-parchment-100 p-6 hover:bg-parchment-200 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-copper-200 text-olive-500 flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">Update Availability</div>
                      <div className="text-sm text-copper-600">Set your available dates</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setTab('messages')}
                  className="cursor-pointer rounded-2xl border border-parchment-200 bg-parchment-100 p-6 hover:bg-parchment-200 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-copper-200 text-olive-500 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">View Messages</div>
                      <div className="text-sm text-copper-600">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Shoots */}
              <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">Upcoming Shoots</h2>
                  <button 
                    onClick={() => setTab('bookings')}
                    className="text-sm text-pine-500 font-medium hover:underline"
                  >
                    View all
                  </button>
                </div>
                
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarCheck className="w-12 h-12 text-copper-300 mx-auto mb-3" />
                    <div className="font-medium text-charcoal-700">No upcoming shoots</div>
                    <div className="text-sm text-copper-500 mt-1">When clients book you, they'll appear here</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-parchment-200/60 border border-parchment-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-pine-100 text-pine-700 flex items-center justify-center font-semibold">
                            {(b.clientName || 'Client').split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div className="font-semibold text-charcoal-700">{b.clientName || 'Client'}</div>
                            <div className="text-sm text-copper-600">{b.date}</div>
                          </div>
                        </div>
                        <span className="font-semibold text-charcoal-700">{formatAed(b.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {tab === 'bookings' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: counts.all },
                  { key: 'requested', label: 'Pending', count: counts.requested },
                  { key: 'accepted', label: 'Confirmed', count: counts.accepted },
                  { key: 'completed', label: 'Completed', count: counts.completed },
                  { key: 'rejected', label: 'Declined', count: counts.rejected },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key as DashboardBookingFilter)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      filter === item.key
                        ? 'bg-pine-500 text-white'
                        : 'bg-parchment-200 text-olive-500 hover:bg-parchment-200'
                    }`}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              {/* Booking List */}
              <div className="space-y-3">
                {loading && bookings.length === 0 ? (
                  <>
                    <BookingRowSkeleton />
                    <BookingRowSkeleton />
                  </>
                ) : visibleBookings.length === 0 ? (
                  <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-8 text-center">
                    <CalendarCheck className="w-12 h-12 text-copper-300 mx-auto mb-3" />
                    <div className="font-medium text-charcoal-700">
                      {bookings.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
                    </div>
                    <div className="text-sm text-copper-500 mt-1">
                      {bookings.length === 0 
                        ? 'When clients book you, their requests will appear here'
                        : 'Try a different filter or view all bookings'}
                    </div>
                    {bookings.length > 0 && filter !== 'all' && (
                      <button
                        onClick={() => setFilter('all')}
                        className="mt-4 rounded-xl border border-parchment-200 text-charcoal-700 px-5 py-2.5 text-sm font-medium hover:bg-parchment-200"
                      >
                        Show all bookings
                      </button>
                    )}
                  </div>
                ) : (
                  visibleBookings.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      partnerTitle={b.clientName || 'Client'}
                      mode="photographer"
                      busy={loading}
                      onAccept={
                        b.status === 'requested'
                          ? () => {
                              if (window.confirm('Accept this booking? Other pending requests for the same date will be declined.')) {
                                void updateBookingStatus(b.id, 'accepted')
                              }
                            }
                          : undefined
                      }
                      onReject={
                        b.status === 'requested'
                          ? () => {
                              if (window.confirm('Decline this booking request?')) {
                                void updateBookingStatus(b.id, 'rejected')
                              }
                            }
                          : undefined
                      }
                      onMarkComplete={
                        b.status === 'accepted'
                          ? () => {
                              if (window.confirm('Mark this booking as completed?')) {
                                void updateBookingStatus(b.id, 'completed_by_client')
                              }
                            }
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {tab === 'availability' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-charcoal-700">Availability</h2>
                    <p className="text-sm text-copper-500 mt-1">Set your working dates and schedule</p>
                  </div>
                  <select
                    value={availability}
                    onChange={(e) => void onAvailabilityChange(e.target.value as PhotographerAvailability)}
                    className="rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-2 text-sm text-charcoal-700"
                  >
                    {availabilityOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <AvailabilityCalendarEditor globalOpen={availability === 'Available'} />
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {tab === 'earnings' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-charcoal-700">Earnings</h2>
                    <p className="text-sm text-copper-500 mt-1">
                      Platform fee: <strong>{PLATFORM_COMMISSION_PCT}%</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportCsv()}
                    className="rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-parchment-200 flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 relative">
                    <TrendingUp className="absolute top-3 right-3 w-4 h-4 text-emerald-500" />
                    <div className="text-xs font-semibold uppercase text-copper-600">Total Earned</div>
                    <div className="text-lg font-semibold text-charcoal-700">{formatAed(totalGross)}</div>
                  </div>
                  <div className="rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 relative">
                    <Clock className="absolute top-3 right-3 w-4 h-4 text-amber-400" />
                    <div className="text-xs font-semibold uppercase text-copper-600">Pending Payout</div>
                    <div className="text-lg font-semibold text-charcoal-700">{formatAed(pendingNet)}</div>
                  </div>
                  <div className="rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 relative">
                    <Percent className="absolute top-3 right-3 w-4 h-4 text-rose-400" />
                    <div className="text-xs font-semibold uppercase text-copper-600">Commission</div>
                    <div className="text-lg font-semibold text-charcoal-700">{formatAed(totalCommission)}</div>
                  </div>
                  <div className="rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 relative">
                    <Wallet className="absolute top-3 right-3 w-4 h-4 text-blue-400" />
                    <div className="text-xs font-semibold uppercase text-copper-600">Net Received</div>
                    <div className="text-lg font-semibold text-charcoal-700">{formatAed(releasedNet)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-parchment-200">
                  <table className="min-w-full text-sm w-full">
                    <thead className="bg-parchment-200/60 text-left text-olive-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Booking</th>
                        <th className="px-3 py-2 font-semibold">Client</th>
                        <th className="px-3 py-2 font-semibold">Shoot Date</th>
                        <th className="px-3 py-2 font-semibold">Gross (AED)</th>
                        <th className="px-3 py-2 font-semibold">Commission</th>
                        <th className="px-3 py-2 font-semibold">Net (AED)</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-copper-600">
                            Bookings will populate this table automatically.
                          </td>
                        </tr>
                      ) : (
                        earningsRows.map((r) => (
                          <tr key={r.bookingId} className="border-t border-parchment-200 bg-parchment-100">
                            <td className="px-3 py-2 font-mono text-xs text-copper-600">
                              {r.bookingId.slice(0, 8)}…
                            </td>
                            <td className="px-3 py-2">{r.clientName}</td>
                            <td className="px-3 py-2">{r.shootDate}</td>
                            <td className="px-3 py-2">{formatAed(r.grossAed)}</td>
                            <td className="px-3 py-2">{PLATFORM_COMMISSION_PCT}%</td>
                            <td className="px-3 py-2">{formatAed(r.netAed)}</td>
                            <td className="px-3 py-2 capitalize">{r.payoutStatus}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {tab === 'messages' && (
            <div className="rounded-2xl border border-parchment-200 bg-parchment-100 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] min-h-[500px]">
                {/* Chat List */}
                <div className="border-b sm:border-b-0 sm:border-r border-parchment-200">
                  <div className="p-4 border-b border-parchment-200">
                    <h2 className="font-serif font-semibold text-charcoal-700">Messages</h2>
                    <p className="text-sm text-copper-500 mt-1">{chats.length} conversations</p>
                  </div>
                  <div className="max-h-[400px] overflow-auto">
                    {chats.length === 0 ? (
                      <div className="p-4 text-center text-copper-500 text-sm">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-copper-300" />
                        No messages yet
                      </div>
                    ) : (
                      chats.map((c) => {
                        const meta = clientUsers[c.otherUserId]
                        const name = meta?.name || clientNameById.get(c.otherUserId) || 'Client'
                        const active = c.otherUserId === activeClientId
                        return (
                          <button
                            key={c.otherUserId}
                            type="button"
                            onClick={() => {
                              setActiveClientId(c.otherUserId)
                              void fetchConversation(c.otherUserId)
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-parchment-200/50 hover:bg-parchment-200 transition-colors ${
                              active ? 'bg-pine-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {meta?.image ? (
                                <img
                                  src={meta.image}
                                  alt={name}
                                  className="w-10 h-10 rounded-full object-cover border border-parchment-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center text-sm font-semibold">
                                  {name.split(' ').map(n => n[0]).join('').slice(0,2)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate text-charcoal-700">
                                  {name}
                                </div>
                                <div className="text-xs text-copper-500 truncate">
                                  {c.lastMessage || 'No messages yet'}
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Chat Panel */}
                <div className="flex flex-col">
                  {activeClientId ? (
                    <>
                      <div className="p-4 border-b border-parchment-200 bg-parchment-200/50">
                        <div className="flex items-center gap-3">
                          {clientUsers[activeClientId]?.image ? (
                            <img
                              src={clientUsers[activeClientId].image}
                              alt={clientUsers[activeClientId].name}
                              className="w-10 h-10 rounded-full object-cover border border-parchment-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center">
                              {(clientUsers[activeClientId]?.name || 'Client').split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-charcoal-700">
                              {clientUsers[activeClientId]?.name || clientNameById.get(activeClientId) || 'Client'}
                            </div>
                            <div className="text-xs text-copper-500">Direct messages</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 p-4 overflow-auto space-y-3">
                        {conversation.length === 0 ? (
                          <div className="text-center text-copper-500 py-8">
                            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-copper-300" />
                            Say hi to start the conversation
                          </div>
                        ) : (
                          conversation.map((m) => {
                            const mine = m.senderId === user?.id
                            return (
                              <div
                                key={m.id}
                                className={mine ? 'flex justify-end' : 'flex justify-start'}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                    mine
                                      ? 'bg-pine-500 text-white'
                                      : 'bg-parchment-200 text-charcoal-700 border border-parchment-200'
                                  }`}
                                >
                                  {m.text}
                                  <div className={`text-[10px] mt-1 ${mine ? 'text-parchment-200' : 'text-copper-400'}`}>
                                    {new Date(m.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="p-4 border-t border-parchment-200">
                        <div className="flex items-center gap-3">
                          <input
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                                void sendMessage(activeClientId, messageText.trim()).then(() =>
                                  setMessageText(''),
                                )
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="rounded-xl bg-pine-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50"
                            disabled={!messageText.trim()}
                            onClick={() => {
                              void sendMessage(activeClientId, messageText.trim()).then(() =>
                                setMessageText(''),
                              )
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-copper-500">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-copper-300" />
                        <div className="font-medium text-charcoal-700">Select a conversation</div>
                        <div className="text-sm mt-1">Choose from your existing chats</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-serif font-semibold text-charcoal-700">Profile Settings</h2>
                <p className="text-sm text-copper-500 mt-1">Manage your public profile and portfolio</p>
              </div>
              <PhotographerProfileEditor profile={myProfile} onRefresh={refreshMyProfile} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
