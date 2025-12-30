import { SignInButton } from '@/components/auth/SignInButton'
import { InstallButton } from '@/components/pwa/InstallButton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* App Header with Icon */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl shadow-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
            Cricket Scorer
          </h1>
          <p className="text-gray-600 text-lg">Track matches, stats, and glory</p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Install Button */}
          <InstallButton />

          {/* Sign In Button */}
          <div className="flex flex-col items-center">
            <SignInButton />
          </div>

          <div className="text-center text-sm text-gray-500 bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <p>Sign in to create teams, score matches, and track your cricket stats</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Your stats. Your matches. Your cricket journey.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
