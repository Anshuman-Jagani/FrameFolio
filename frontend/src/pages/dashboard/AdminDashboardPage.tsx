import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePhotographerStore } from '../../store/photographerStore'
import { usePageTitle } from '../../hooks/usePageTitle'
import { get, patch, del } from '../../lib/api'
import { mapBookingFromApi } from '../../lib/bookingMap'
import { formatAed } from '../../lib/formatCurrency'
import type { Booking } from '../../lib/uiTypes'
import { prettyStatus, statusToneClass } from '../../components/bookings/bookingUi'
import { PLATFORM_COMMISSION_PCT } from '../../store/earningsStore'
import { 
  LayoutList, CalendarCheck, CheckCircle2,
  Camera, LogOut,
  TrendingUp, Users, DollarSign, BarChart3, Download,
  UserCheck, ClipboardList
} from 'lucide-react'

type Tab = 'overview' | 'approvals' | 'accounts' | 'bookings' | 'analytics' | 'commission' | 'support'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  status: string
}

type Stats = {
  total_users?: number
  total_photographers?: number
  total_bookings?: number
  completed_bookings?: number
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore()
  const photographers = usePhotographerStore((s) => s.items)
  const fetchList = usePhotographerStore((s) => s.fetchList)

  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('')

  usePageTitle('Admin — FrameFolio UAE')

  const pendingPhotographers = useMemo(
    () => photographers.filter((p) => p.status === 'pending'),
    [photographers],
  )

  const load = async () => {
    await fetchList()
    const s = await get<Stats>('/admin/stats')
    setStats(s)
    const b = await get<{ items: unknown[] }>('/admin/bookings', {
      page: 1,
      page_size: 100,
      ...(bookingStatusFilter ? { status: bookingStatusFilter } : {}),
    })
    setBookings((b.items ?? []).map(mapBookingFromApi))
    const u = await get<{ items: UserRow[] }>('/admin/users', {
      page: 1,
      page_size: 100,
      ...(userSearch.trim() ? { search: userSearch.trim() } : {}),
    })
    setUsers(u.items ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (tab === 'bookings' || tab === 'accounts') {
      void (async () => {
        const b = await get<{ items: unknown[] }>('/admin/bookings', {
          page: 1,
          page_size: 100,
          ...(bookingStatusFilter ? { status: bookingStatusFilter } : {}),
        })
        setBookings((b.items ?? []).map(mapBookingFromApi))
      })()
    }
  }, [tab, bookingStatusFilter])

  useEffect(() => {
    if (tab !== 'accounts') return
    const t = setTimeout(() => {
      void (async () => {
        const u = await get<{ items: UserRow[] }>('/admin/users', {
          page: 1,
          page_size: 100,
          ...(userSearch.trim() ? { search: userSearch.trim() } : {}),
        })
        setUsers(u.items ?? [])
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, tab])

  const verifyPhotographer = async (profileId: string, verified: boolean) => {
    await patch(`/admin/photographers/${profileId}/verify?verified=${verified}`)
    await fetchList()
    const b = await get<{ items: unknown[] }>('/admin/bookings', { page: 1, page_size: 100 })
    setBookings((b.items ?? []).map(mapBookingFromApi))
  }

  const setUserStatus = async (userId: string, status: 'active' | 'inactive' | 'suspended') => {
    await patch(`/admin/users/${userId}/status?status=${status}`)
    const u = await get<{ items: UserRow[] }>('/admin/users', {
      page: 1,
      page_size: 100,
      ...(userSearch.trim() ? { search: userSearch.trim() } : {}),
    })
    setUsers(u.items)
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    await del(`/admin/users/${userId}`)
    setUsers(users.filter(u => u.id !== userId))
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

  const StatCard = ({ label, value, icon: Icon }: { 
    label: string, value: number | string, icon: typeof LayoutList
  }) => (
    <div className="rounded-2xl border border-taupe-100 bg-cream-50 px-5 py-4 relative">
      <Icon className="absolute top-4 right-4 w-5 h-5 text-taupe-400" />
      <div className="text-xs font-semibold uppercase tracking-wide text-taupe-600">{label}</div>
      <div className="text-2xl font-serif font-semibold text-charcoal-700 mt-1">{value}</div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:block sticky top-20">
          <nav className="rounded-3xl border-r border-taupe-100 bg-cream-100/60 p-3 shadow-sm">
            <div className="flex flex-col gap-1">
              {[
                { key: 'overview', label: 'Overview', icon: LayoutList },
                { key: 'approvals', label: 'Approvals', icon: UserCheck },
                { key: 'accounts', label: 'Accounts', icon: Users },
                { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                { key: 'commission', label: 'Commission', icon: DollarSign },
                { key: 'support', label: 'Support / FAQ', icon: ClipboardList },
              ].map((item) => {
                const Icon = item.icon
                const isActive = tab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key as Tab)}
                    className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 ${
                      isActive 
                        ? 'bg-burgundy-500 text-white' 
                        : 'text-taupe-700 hover:bg-cream-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              })}

              <div className="my-3 border-t border-taupe-100" />

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 text-taupe-600 hover:bg-cream-200"
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
              { key: 'approvals', label: 'Approvals', icon: UserCheck },
              { key: 'accounts', label: 'Accounts', icon: Users },
              { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'commission', label: 'Commission', icon: DollarSign },
              { key: 'support', label: 'Support', icon: ClipboardList },
            ].map((item) => {
              const Icon = item.icon
              const isActive = tab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as Tab)}
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-burgundy-500 text-white' 
                      : 'bg-cream-100 text-taupe-700'
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
              {getGreeting()}, {user?.fullName || user?.email?.split('@')[0] || 'Admin'}!
            </h1>
            <p className="mt-2 text-taupe-700">
              Manage the platform, approve photographers, and monitor bookings.
            </p>
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Total Users" 
                  value={stats?.total_users ?? '—'} 
                  icon={Users}
                />
                <StatCard 
                  label="Photographers" 
                  value={stats?.total_photographers ?? '—'} 
                  icon={Camera}
                />
                <StatCard 
                  label="Total Bookings" 
                  value={stats?.total_bookings ?? '—'} 
                  icon={CalendarCheck}
                />
                <StatCard 
                  label="Completed" 
                  value={stats?.completed_bookings ?? '—'} 
                  icon={CheckCircle2}
                />
              </div>

              {/* Quick Links */}
              <div className="grid md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setTab('approvals')}
                  className="cursor-pointer rounded-2xl border border-taupe-200 bg-cream-50 p-6 hover:bg-cream-100 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-taupe-200 text-taupe-700 flex items-center justify-center">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">Pending Approvals</div>
                      <div className="text-sm text-taupe-600">{pendingPhotographers.length} photographer{pendingPhotographers.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setTab('bookings')}
                  className="cursor-pointer rounded-2xl border border-taupe-200 bg-cream-50 p-6 hover:bg-cream-100 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-taupe-200 text-taupe-700 flex items-center justify-center">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">View Bookings</div>
                      <div className="text-sm text-taupe-600">{bookings.length} total bookings</div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setTab('analytics')}
                  className="cursor-pointer rounded-2xl border border-taupe-200 bg-cream-50 p-6 hover:bg-cream-100 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-taupe-200 text-taupe-700 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal-700">Analytics</div>
                      <div className="text-sm text-taupe-600">Platform insights</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approvals Tab */}
          {tab === 'approvals' && (
            <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">Photographer Approvals</h2>
                  <p className="text-sm text-taupe-500 mt-1">
                    {pendingPhotographers.length} pending request{pendingPhotographers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {pendingPhotographers.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 text-taupe-300 mx-auto mb-3" />
                  <div className="font-medium text-charcoal-700">No pending approvals</div>
                  <div className="text-sm text-taupe-500 mt-1">New photographer registrations will appear here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPhotographers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-cream-100/60 border border-taupe-100"
                    >
                      <div className="flex items-center gap-4">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-14 h-14 rounded-xl object-cover border border-taupe-100"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-burgundy-100 text-burgundy-700 flex items-center justify-center text-xl font-semibold">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-charcoal-700">{p.name}</div>
                          <div className="text-sm text-taupe-600">{p.category}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-xl bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600"
                          onClick={() => void verifyPhotographer(p.id, true)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-rose-200 text-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-50"
                          onClick={() => void verifyPhotographer(p.id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Accounts Tab */}
          {tab === 'accounts' && (
            <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">User Accounts</h2>
                  <p className="text-sm text-taupe-500 mt-1">Manage users and their access</p>
                </div>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm max-w-xs"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-taupe-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-cream-200/60 text-left text-taupe-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-taupe-100 bg-cream-50">
                        <td className="px-4 py-3 font-medium text-charcoal-700">{u.full_name || '—'}</td>
                        <td className="px-4 py-3 text-taupe-700">{u.email}</td>
                        <td className="px-4 py-3 capitalize">{u.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            u.status === 'suspended' ? 'bg-rose-100 text-rose-700' :
                            'bg-taupe-100 text-taupe-700'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {u.status !== 'active' ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-emerald-600 hover:underline"
                                onClick={() => void setUserStatus(u.id, 'active')}
                              >
                                Activate
                              </button>
                            ) : null}
                            {u.status !== 'suspended' ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-rose-600 hover:underline"
                                onClick={() => void setUserStatus(u.id, 'suspended')}
                              >
                                Suspend
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-600 hover:underline"
                              onClick={() => void deleteUser(u.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="p-8 text-center text-taupe-500">
                    No users found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {tab === 'bookings' && (
            <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">All Bookings</h2>
                  <p className="text-sm text-taupe-500 mt-1">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
                </div>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="rounded-xl border border-taupe-100 bg-cream-50 px-4 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="requested">Pending</option>
                  <option value="accepted">Confirmed</option>
                  <option value="completed_by_client">Completed</option>
                  <option value="rejected">Declined</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-taupe-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-cream-200/60 text-left text-taupe-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Booking</th>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Photographer</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-t border-taupe-100 bg-cream-50">
                        <td className="px-4 py-3 font-mono text-xs text-taupe-600">{b.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-charcoal-700">{b.clientName || '—'}</td>
                        <td className="px-4 py-3 text-charcoal-700">{b.photographerName || '—'}</td>
                        <td className="px-4 py-3">{b.date}</td>
                        <td className="px-4 py-3">{formatAed(b.price)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusToneClass(b.status)}`}>
                            {prettyStatus(b.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <div className="p-8 text-center text-taupe-500">
                    No bookings found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-charcoal-700">Analytics</h2>
                    <p className="text-sm text-taupe-500 mt-1">Platform performance metrics</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl border border-taupe-200 bg-cream-50 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-cream-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <StatCard label="Total Bookings" value={stats?.total_bookings ?? '—'} icon={BarChart3} />
                  <StatCard label="Revenue (AED)" value={formatAed((stats?.total_bookings ?? 0) * 500)} icon={DollarSign} />
                  <StatCard label="Photographers" value={stats?.total_photographers ?? '—'} icon={Camera} />
                  <StatCard label="Clients" value={(stats?.total_users ?? 0) - (stats?.total_photographers ?? 0)} icon={Users} />
                  <StatCard label="Avg Value" value={formatAed(500)} icon={TrendingUp} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-taupe-100 bg-cream-100/50 p-4">
                    <h3 className="text-sm font-semibold text-charcoal-700 mb-4">Bookings over time</h3>
                    <div className="h-40 flex items-center justify-center text-sm text-taupe-500">
                      Chart placeholder — last 6 months
                    </div>
                  </div>
                  <div className="rounded-xl border border-taupe-100 bg-cream-100/50 p-4">
                    <h3 className="text-sm font-semibold text-charcoal-700 mb-4">Revenue over time</h3>
                    <div className="h-40 flex items-center justify-center text-sm text-taupe-500">
                      Chart placeholder — last 6 months
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Photographers */}
              <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
                <h3 className="text-lg font-serif font-semibold text-charcoal-700 mb-4">Top Photographers</h3>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: 'Ahmed Al Mansoori', bookings: 45, revenue: 22500 },
                    { rank: 2, name: 'Fatima Hassan', bookings: 38, revenue: 19000 },
                    { rank: 3, name: 'Omar Khan', bookings: 32, revenue: 16000 },
                    { rank: 4, name: 'Layla Ahmed', bookings: 28, revenue: 14000 },
                    { rank: 5, name: 'Saeed Al Nuaimi', bookings: 24, revenue: 12000 },
                  ].map((p) => (
                    <div key={p.rank} className="flex items-center justify-between p-3 rounded-lg bg-cream-100/60">
                      <span className="text-taupe-700">
                        <span className="font-semibold text-charcoal-700">{p.rank}.</span> {p.name}
                      </span>
                      <span className="text-sm text-taupe-500">{p.bookings} bookings · {formatAed(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Commission Tab */}
          {tab === 'commission' && (
            <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-charcoal-700">Commission</h2>
                  <p className="text-sm text-taupe-500 mt-1">Platform rate: {PLATFORM_COMMISSION_PCT}%</p>
                </div>
              </div>

              <div className="rounded-xl border border-taupe-100 bg-cream-50 px-5 py-4 mb-6">
                <div className="text-xs font-semibold uppercase text-taupe-600">Total Commission (AED)</div>
                <div className="text-2xl font-serif font-semibold text-charcoal-700 mt-1">
                  {formatAed((stats?.completed_bookings ?? 0) * 500 * (PLATFORM_COMMISSION_PCT / 100))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-taupe-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-cream-200/60 text-left text-taupe-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Booking</th>
                      <th className="px-3 py-2 font-semibold">Photographer</th>
                      <th className="px-3 py-2 font-semibold">Gross</th>
                      <th className="px-3 py-2 font-semibold">%</th>
                      <th className="px-3 py-2 font-semibold">Commission</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-taupe-100 bg-cream-50">
                      <td className="px-3 py-2 font-mono text-xs">8db781e0…</td>
                      <td className="px-3 py-2">Ahmed Al Mansoori</td>
                      <td className="px-3 py-2">{formatAed(500)}</td>
                      <td className="px-3 py-2">{PLATFORM_COMMISSION_PCT}%</td>
                      <td className="px-3 py-2">{formatAed(75)}</td>
                      <td className="px-3 py-2">2024-01-15</td>
                    </tr>
                    <tr className="border-t border-taupe-100 bg-cream-100/50">
                      <td className="px-3 py-2 font-mono text-xs">9ac392f1…</td>
                      <td className="px-3 py-2">Fatima Hassan</td>
                      <td className="px-3 py-2">{formatAed(750)}</td>
                      <td className="px-3 py-2">{PLATFORM_COMMISSION_PCT}%</td>
                      <td className="px-3 py-2">{formatAed(112.5)}</td>
                      <td className="px-3 py-2">2024-01-18</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Support Tab */}
          {tab === 'support' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-charcoal-700">Support Queries</h2>
                    <p className="text-sm text-taupe-500 mt-1">Manage user inquiries</p>
                  </div>
                </div>
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 text-taupe-300 mx-auto mb-3" />
                  <div className="font-medium text-charcoal-700">No support queries</div>
                  <div className="text-sm text-taupe-500 mt-1">User inquiries will appear here</div>
                </div>
              </div>

              <div className="rounded-2xl border border-taupe-100 bg-cream-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-charcoal-700">FAQ Management</h2>
                    <p className="text-sm text-taupe-500 mt-1">Manage frequently asked questions</p>
                  </div>
                  <button type="button" className="rounded-xl bg-burgundy-500 text-white px-4 py-2 text-sm font-medium hover:bg-burgundy-600">
                    Add FAQ
                  </button>
                </div>
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 text-taupe-300 mx-auto mb-3" />
                  <div className="font-medium text-charcoal-700">No FAQs yet</div>
                  <div className="text-sm text-taupe-500 mt-1">Add FAQs to help users</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
