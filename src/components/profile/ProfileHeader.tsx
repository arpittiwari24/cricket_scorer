'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EditNameDialog } from './EditNameDialog'
import { Pencil } from 'lucide-react'

interface ProfileHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)

  const getInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-white shadow-lg">
              <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
              <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {user.name || 'User'}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  className="mx-auto md:mx-0 w-fit"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Name
                </Button>
              </div>
              <p className="text-sm md:text-base text-slate-600">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditNameDialog
        currentName={user.name || ''}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  )
}
