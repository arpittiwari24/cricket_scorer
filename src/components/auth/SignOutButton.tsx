'use client'

import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2"
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  )
}
