import { SignInButton } from '@/components/auth/SignInButton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-2">Cricket Scorer</h1>
          <p className="text-gray-600">Track matches, stats, and glory</p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex flex-col items-center">
            <SignInButton />
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Sign in to create teams, score matches, and track your cricket stats</p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Your stats. Your matches. Your cricket journey.</p>
        </div>
      </div>
    </div>
  )
}
