import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { post } from '../../lib/api'
import { usePageTitle } from '../../hooks/usePageTitle'
import { Camera, Loader2 } from 'lucide-react'

const SPECIALIZATIONS = ['Wedding', 'Portrait', 'Corporate', 'Events', 'Reels', 'Product', 'Architecture']
const SERVICES = ['Photoshoot only', 'Photoshoot + Editing', 'Photo + Video', 'Reels']

export default function PhotographerSetupPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  usePageTitle('Complete Your Profile')

  const [bio, setBio] = useState('')
  const [specializations, setSpecializations] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSpecializationToggle = (tag: string) => {
    setSpecializations(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleServiceToggle = (service: string) => {
    setServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!bio.trim()) {
      setError('Please provide a bio description.')
      return
    }
    if (specializations.length === 0) {
      setError('Please select at least one specialization.')
      return
    }
    if (!hourlyRate || Number(hourlyRate) <= 0) {
      setError('Please enter a valid daily rate.')
      return
    }
    if (services.length === 0) {
      setError('Please select at least one service offered.')
      return
    }

    setLoading(true)
    try {
      console.log('Submitting profile with:', {
        description: bio.trim(),
        specializations: specializations.join(', '),
        price_per_day: Number(hourlyRate),
        services: services.join(', '),
      })
      await post('/photographers/me', {
        description: bio.trim(),
        specializations: specializations.join(', '),
        price_per_day: Number(hourlyRate),
        services: services.join(', '),
      })

      navigate('/photographer-pending')
    } catch (e) {
      console.error('Profile submission error:', e)
      const msg = e instanceof Error ? e.message : 'Failed to create profile'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-parchment-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-semibold text-charcoal-700">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-olive-500">
            Fill in your details to start receiving booking requests. Admin will verify your profile.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="rounded-3xl border border-parchment-200 bg-parchment-200/80 backdrop-blur p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-olive-500 mb-4">
              <Camera className="w-4 h-4" />
              Basic Info
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-olive-500" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-parchment-200 bg-parchment-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700 placeholder:text-copper-500"
                  placeholder="Tell clients about your style and experience..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-olive-500 block mb-2">
                  Specializations
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSpecializationToggle(tag)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                        specializations.includes(tag)
                          ? 'bg-pine-500 text-white border-pine-500'
                          : 'border-parchment-200 text-charcoal-700 hover:border-pine-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-olive-500" htmlFor="hourlyRate">
                  Daily rate (AED)
                </label>
                <div className="mt-2 flex items-center rounded-2xl border border-parchment-200 bg-parchment-100 px-4">
                  <span className="text-sm text-copper-500">AED</span>
                  <input
                    id="hourlyRate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="flex-1 bg-transparent px-2 py-3 text-sm outline-none focus:ring-2 focus:ring-pine-500/30 text-charcoal-700"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-olive-500 block mb-2">
                  Services Offered
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => handleServiceToggle(service)}
                      className={`px-4 py-2 rounded-xl border text-sm text-left transition-colors ${
                        services.includes(service)
                          ? 'border-pine-500 bg-pine-50 text-charcoal-700'
                          : 'border-parchment-200 text-charcoal-700 hover:border-pine-300'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-pine-500 text-parchment-50 px-5 py-3 text-sm font-medium hover:bg-pine-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl border border-parchment-200 bg-parchment-100 text-charcoal-700 px-5 py-3 text-sm font-medium hover:bg-parchment-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}