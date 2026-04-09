import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Clock } from 'lucide-react'

export default function PhotographerPendingPage() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-3xl border border-parchment-200 bg-parchment-200/80 backdrop-blur p-8 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-pine-100 flex items-center justify-center">
            <Clock className="w-8 h-8 text-pine-500" />
          </div>
          
          <h1 className="mt-6 text-2xl font-serif font-semibold text-charcoal-700">
            Profile Submitted
          </h1>
          
          <p className="mt-4 text-olive-500">
            Your profile has been submitted for review. Our team will verify your documents and approve your account within 24-48 hours.
          </p>
          
          <div className="mt-6 rounded-2xl border border-parchment-200 bg-parchment-100 p-4 text-left">
            <div className="text-sm font-medium text-charcoal-700 mb-2">What happens next?</div>
            <ul className="text-sm text-olive-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-pine-500">1.</span>
                Admin will review your profile and verification documents
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pine-500">2.</span>
                Once approved, you'll be able to accept booking requests
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pine-500">3.</span>
                You'll receive an email notification when approved
              </li>
            </ul>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 w-full rounded-2xl border border-parchment-200 bg-parchment-100 text-charcoal-700 px-5 py-3 text-sm font-medium hover:bg-parchment-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}