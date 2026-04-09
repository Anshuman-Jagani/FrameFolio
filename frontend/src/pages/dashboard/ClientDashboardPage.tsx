import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PhotographerListPage from '../public/PhotographerListPage'
import { useAuthStore } from '../../store/authStore'
import { useBookingStore } from '../../store/bookingStore'
import { useChatStore } from '../../store/chatStore'
import { usePhotographerStore } from '../../store/photographerStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { Booking, DashboardBookingFilter } from '../../lib/uiTypes'
import BookingRow from '../../components/bookings/BookingRow'
import { filterBookingsByDashboard } from '../../components/bookings/bookingUi'
import { BookingRowSkeleton } from '../../components/ui/Skeletons'
import { 
  LayoutList, Clock, CalendarCheck, CheckCircle2,
  MessageCircle, Plus, Camera, Star, User, LogOut
} from 'lucide-react'
import { formatAed } from '../../lib/formatCurrency'

type ClientTab = 'overview' | 'bookings' | 'messages' | 'browse' | 'profile'

export default function ClientDashboardPage() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookings = useBookingStore((s) => s.bookings)
  const loading = useBookingStore((s) => s.loading)
  const fetchMyBookings = useBookingStore((s) => s.fetchMyBookings)
  const updateBookingStatus = useBookingStore((s) => s.updateBookingStatus)
  const createReview = useBookingStore((s) => s.createReview)

  const { chats, conversation, fetchChats, fetchConversation, sendMessage } = useChatStore()

  const photographers = usePhotographerStore((s) => s.items)
  const fetchById = usePhotographerStore((s) => s.fetchById)

  const [filter, setFilter] = useState<DashboardBookingFilter>('all')
  const [tab, setTab] = useState<ClientTab>(() => {
    const tabParam = searchParams.get('tab')
    return (tabParam as ClientTab) || 'overview'
  })
  const [activeOtherUserId, setActiveOtherUserId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const handleLogout = () => {
    useAuthStore.getState().logout()
    navigate('/login')
  }

  usePageTitle('Client Dashboard')

  useEffect(() => {
    if (!user) return
    void fetchMyBookings()
    void fetchChats()
    void fetchById('')
  }, [user, fetchMyBookings, fetchChats, fetchById])

  useEffect(() => {
    if (bookings.length === 0) return
    const photographerIds = Array.from(new Set(bookings.map((b) => b.photographerId)))
    void Promise.all(
      photographerIds.map(async (pid) => {
        if (photographers.some((p) => p.id === pid)) return
        await fetchById(pid)
      }),
    )
  }, [bookings, photographers, fetchById])

  useEffect(() => {
    if (activeOtherUserId) return
    if (chats.length === 0) return
    const first = chats[0]?.otherUserId
    if (first) {
      setActiveOtherUserId(first)
      void fetchConversation(first)
    }
  }, [chats, activeOtherUserId, fetchConversation])

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

  const partnerPhotographer = useMemo(() => {
    if (!activeOtherUserId) return null
    return photographers.find((p) => p.userId === activeOtherUserId) ?? null
  }, [activeOtherUserId, photographers])

  const recentBookings = useMemo(() => 
    [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
    [bookings]
  )

  const openConversationWithPhotographer = async (photographerId: string) => {
    const existing = photographers.find((p) => p.id === photographerId)
    const p = existing ?? (await fetchById(photographerId))
    const receiverId = p?.userId
    if (!receiverId) return
    setActiveOtherUserId(receiverId)
    void fetchConversation(receiverId)
    setTab('messages')
  }

  const partnerNameForBooking = (b: Booking) =>
    b.photographerName ||
    photographers.find((x) => x.id === b.photographerId)?.name ||
    'Photographer'

  const submitReview = async () => {
    if (!reviewBooking) return
    setReviewSubmitting(true)
    try {
      await createReview({
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment,
      })
      setReviewBooking(null)
      setReviewComment('')
      setReviewRating(5)
    } finally {
      setReviewSubmitting(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const StatCard = ({ label, value, icon: Icon, onClick }: { 
    label: string, value: number, icon: typeof LayoutList, onClick?: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-parchment-200 bg-parchment-100 px-5 py-4 relative text-left hover:shadow-md transition-all w-full"
    >
      <Icon className="absolute top-4 right-4 w-5 h-5 text-copper-400" />
      <div className="text-xs font-semibold uppercase tracking-wide text-copper-600">{label}</div>
      <div className="text-2xl font-serif font-semibold text-charcoal-700 mt-1">{value}</div>
    </button>
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
                { key: 'bookings', label: 'My Bookings', icon: CalendarCheck },
                { key: 'messages', label: 'Messages', icon: MessageCircle },
                { key: 'browse', label: 'Browse Photographers', icon: Camera },
                { key: 'profile', label: 'Profile', icon: User },
              ].map((item) => {
                const Icon = item.icon
                const isActive = tab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key as ClientTab)}
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
              
              <button
                type="button"
                onClick={() => setTab('browse')}
                className="w-full text-left rounded-xl bg-pine-500 text-white px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 hover:bg-pine-600"
              >
                <Plus className="w-5 h-5" />
                New Booking
              </button>
            </div>
          </nav>
        </aside>

        <div>
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto pb-3 flex gap-2">
            {[
              { key: 'overview', label: 'Overview', icon: LayoutList },
              { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
              { key: 'messages', label: 'Messages', icon: MessageCircle },
              { key: 'browse', label: 'Browse', icon: Camera },
              { key: 'profile', label: 'Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon
              const isActive = tab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as ClientTab)}
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
              Manage your bookings and find the perfect photographer for your next shoot.
            </p>
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Total Bookings" 
                  value={counts.all} 
                  icon={LayoutList}
                  onClick={() => { setTab('bookings'); setFilter('all') }}
                />
                <StatCard 
                  label="Pending" 
                  value={counts.requested} 
                  icon={Clock}
                  onClick={() => { setTab('bookings'); setFilter('requested') }}
                />
                <StatCard 
                  label="Confirmed" 
                  value={counts.accepted} 
                  icon={CalendarCheck}
                  onClick={() => { setTab('bookings'); setFilter('accepted') }}
                />
                <StatCard 
                  label="Completed" 
                  value={counts.completed} 
                  icon={CheckCircle2}
                  onClick={() => { setTab('bookings'); setFilter('completed') }}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setTab('browse')}
                  className="cursor-pointer rounded-2xl border border-parchment-200 bg-parchment-100 p-6 hover:bg-parchment-200 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-copper-200 text-olive-500 flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">Book a Photographer</div>
                      <div className="text-sm text-copper-600">Find and book your perfect shoot</div>
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

              {/* Recent Bookings */}
              <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">Recent Bookings</h2>
                  <button 
                    onClick={() => setTab('bookings')}
                    className="text-sm text-pine-500 font-medium hover:underline"
                  >
                    View all
                  </button>
                </div>
                
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="w-12 h-12 text-copper-300 mx-auto mb-3" />
                    <div className="font-medium text-charcoal-700">No bookings yet</div>
                    <div className="text-sm text-copper-500 mt-1">Start by browsing photographers</div>
                    <button
                      onClick={() => setTab('browse')}
                      className="mt-4 rounded-xl bg-pine-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-pine-600"
                    >
                      Browse Photographers
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-4 rounded-xl bg-parchment-200/60 border border-parchment-200">
                        <div className="flex items-center gap-4">
                          {photographers.find(p => p.id === b.photographerId)?.image ? (
                            <img 
                              src={photographers.find(p => p.id === b.photographerId)?.image} 
                              alt={partnerNameForBooking(b)}
                              className="w-12 h-12 rounded-xl object-cover border border-parchment-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-pine-100 text-pine-700 flex items-center justify-center font-semibold">
                              {partnerNameForBooking(b).split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-charcoal-700">{partnerNameForBooking(b)}</div>
                            <div className="text-sm text-copper-600">{b.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            b.status === 'requested' ? 'bg-amber-100 text-amber-700' :
                            b.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            b.status === 'completed_by_client' || b.status === 'completed_by_admin' ? 'bg-blue-100 text-blue-700' :
                            b.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-copper-100 text-olive-500'
                          }`}>
                            {b.status === 'requested' ? 'Pending' :
                             b.status === 'accepted' ? 'Confirmed' :
                             b.status === 'completed_by_client' || b.status === 'completed_by_admin' ? 'Completed' :
                             b.status === 'rejected' ? 'Declined' : 'Cancelled'}
                          </span>
                          <span className="font-semibold text-charcoal-700">{formatAed(b.price)}</span>
                        </div>
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
                  { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
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
                        ? 'Start by browsing photographers for your next shoot'
                        : 'Try a different filter or view all bookings'}
                    </div>
                    {bookings.length === 0 && (
                      <button
                        onClick={() => setTab('browse')}
                        className="mt-4 rounded-xl bg-pine-500 text-white px-5 py-2.5 text-sm font-medium hover:bg-pine-600"
                      >
                        Browse Photographers
                      </button>
                    )}
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
                      partnerTitle={partnerNameForBooking(b)}
                      mode="client"
                      busy={loading}
                      onMessage={() => void openConversationWithPhotographer(b.photographerId)}
                      onMarkComplete={
                        b.status === 'accepted'
                          ? () => {
                              if (window.confirm('Mark this booking as completed? The photographer will be notified.')) {
                                void updateBookingStatus(b.id, 'completed_by_client')
                              }
                            }
                          : undefined
                      }
                      onCancel={
                        b.status === 'requested' || b.status === 'accepted'
                          ? () => {
                              if (window.confirm('Cancel this booking? Cancellation rules may apply close to the shoot date.')) {
                                void updateBookingStatus(b.id, 'cancelled')
                              }
                            }
                          : undefined
                      }
                      onLeaveReview={
                        b.status === 'completed_by_client' || b.status === 'completed_by_admin'
                          ? () => {
                              setReviewBooking(b)
                              setReviewRating(5)
                              setReviewComment('')
                            }
                          : undefined
                      }
                    />
                  ))
                )}
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
                        const p = photographers.find((x) => x.userId === c.otherUserId)
                        const active = c.otherUserId === activeOtherUserId
                        return (
                          <button
                            key={c.otherUserId}
                            type="button"
                            onClick={() => {
                              setActiveOtherUserId(c.otherUserId)
                              void fetchConversation(c.otherUserId)
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-parchment-200/50 hover:bg-parchment-200 transition-colors ${
                              active ? 'bg-pine-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {p?.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-full object-cover border border-parchment-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center text-sm font-semibold">
                                  {p?.name?.split(' ').map(n => n[0]).join('').slice(0,2) || 'U'}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate text-charcoal-700">
                                  {p?.name || 'User'}
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
                  {activeOtherUserId ? (
                    <>
                      <div className="p-4 border-b border-parchment-200 bg-parchment-200/50">
                        <div className="flex items-center gap-3">
                          {partnerPhotographer?.image ? (
                            <img
                              src={partnerPhotographer.image}
                              alt={partnerPhotographer.name}
                              className="w-10 h-10 rounded-full object-cover border border-parchment-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center">
                              {partnerPhotographer?.name?.split(' ').map(n => n[0]).join('').slice(0,2) || 'P'}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-charcoal-700">
                              {partnerPhotographer?.name || 'Photographer'}
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
                                void sendMessage(activeOtherUserId, messageText.trim()).then(() =>
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
                              void sendMessage(activeOtherUserId, messageText.trim()).then(() =>
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

          {/* Browse Tab */}
          {tab === 'browse' && (
            <div>
              <PhotographerListPage embedded />
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="rounded-2xl border border-parchment-200 bg-parchment-100 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-serif font-semibold text-charcoal-700">Profile Settings</h2>
                <p className="text-sm text-copper-500 mt-1">Manage your account details</p>
              </div>

              <div className="grid gap-6 max-w-lg">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-pine-100 text-pine-700 flex items-center justify-center text-2xl font-semibold">
                    {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <button type="button" className="text-sm text-pine-500 font-medium hover:underline">
                      Change photo
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-sm font-medium text-olive-500" htmlFor="profile-name">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    defaultValue={user?.fullName || ''}
                    className="mt-2 w-full rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-sm font-medium text-olive-500">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="mt-2 w-full rounded-xl border border-parchment-200 bg-parchment-200 px-4 py-2.5 text-sm text-copper-500 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium text-olive-500" htmlFor="profile-phone">
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    className="mt-2 w-full rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-2.5 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
                    placeholder="+971 50 123 4567"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    className="rounded-xl bg-pine-500 text-white px-6 py-2.5 text-sm font-medium hover:bg-pine-600 transition-colors"
                    onClick={() => {
                      const nameInput = (document.getElementById('profile-name') as HTMLInputElement)?.value
                      if (nameInput) {
                        useAuthStore.getState().updateFullName(nameInput)
                        alert('Profile saved successfully!')
                      }
                    }}
                  >
                    Save Changes
                  </button>
                </div>

                {/* Logout Section */}
                <div className="pt-6 border-t border-parchment-200">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out of your account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-parchment-200 bg-parchment-100 p-6 shadow-2xl">
            <h2 id="review-title" className="text-xl font-serif font-semibold text-charcoal-700">
              Leave a Review
            </h2>
            <p className="text-sm text-copper-600 mt-2">
              How was your experience with {partnerNameForBooking(reviewBooking)}?
            </p>

            <div className="mt-6">
              <label className="text-sm font-medium text-olive-500 block mb-3">
                Your rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= reviewRating 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-copper-300'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-olive-500" htmlFor="review-comment">
                Your review (optional)
              </label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
                placeholder="Share your experience with this photographer..."
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-parchment-200 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-parchment-200"
                onClick={() => setReviewBooking(null)}
                disabled={reviewSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-pine-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-pine-600 disabled:opacity-50"
                disabled={reviewSubmitting}
                onClick={() => void submitReview()}
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
