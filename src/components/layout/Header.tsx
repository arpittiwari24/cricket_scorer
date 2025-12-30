'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { user, isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="text-base sm:text-xl font-bold text-black">
            Cricket Scorer
          </Link>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-black hover:underline"
              >
                Home
              </Link>
              <Link
                href="/matches/create"
                className="text-sm font-medium text-black hover:underline"
              >
                New Match
              </Link>
              <Link
                href="/matches"
                className="text-sm font-medium text-black hover:underline"
              >
                Matches
              </Link>
              <Link
                href="/live"
                className="text-sm font-medium text-black hover:underline"
              >
                Live
              </Link>
            </nav>
          )}
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/profile" className="flex items-center gap-2">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                <AvatarFallback className="text-xs sm:text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium text-black truncate max-w-[100px] lg:max-w-none">
                {user.name}
              </span>
            </Link>
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  )
}
