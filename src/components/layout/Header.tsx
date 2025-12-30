'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { signOut } from 'next-auth/react'
import { MoveLeft } from 'lucide-react'

export function Header() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  if (!isAuthenticated) {
    return null
  }

  const isHomePage = pathname === '/'

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Mobile: Back arrow OR Desktop: Branding */}
          <div className="flex items-center gap-3">
            {/* Mobile back arrow (only if not on home page) */}
            {!isHomePage && (
              <Button
                variant="ghost"
                size="sm"
                className="p-2 md:hidden"
                onClick={() => router.back()}
              >
                <MoveLeft className="w-6 h-6 font-extrabold" />
              </Button>
            )}

            {/* Desktop: Full branding and navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-black">
                Cricket Scorer
              </Link>

              <nav className="flex items-center gap-6">
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
            </div>
          </div>

          {/* User avatar (both mobile and desktop) */}
          {user && (
            <div className="flex items-center gap-2">
              {/* Desktop: Show name + avatar + logout */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="text-sm">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-black truncate max-w-[100px]">
                    {user.name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Logout
                </Button>
              </div>

              {/* Mobile: Just avatar with dropdown */}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 md:hidden"
                onClick={() => setUserMenuOpen(true)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image || ''} alt={user.name || ''} />
                  <AvatarFallback className="text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile User Menu Dialog */}
      <Dialog open={userMenuOpen} onOpenChange={setUserMenuOpen}>
        <DialogContent className="top-[56px] right-4 left-auto translate-x-0 translate-y-0 max-w-[200px] p-0 rounded-lg">
          <nav className="flex flex-col">
            <Link
              href="/profile"
              className="text-base font-medium text-black py-3 px-4 hover:bg-gray-50 border-b"
              onClick={() => setUserMenuOpen(false)}
            >
              Profile
            </Link>
            <button
              className="text-base font-medium text-red-600 py-3 px-4 hover:bg-gray-50 text-left"
              onClick={() => {
                setUserMenuOpen(false)
                signOut({ callbackUrl: '/login' })
              }}
            >
              Logout
            </button>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  )
}
