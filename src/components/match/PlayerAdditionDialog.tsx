'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { searchUsers, addPlayerToTeam } from '@/actions/teams'

interface PlayerAdditionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  role: 'batsman' | 'bowler'
  onPlayerAdded: (playerId: string, playerName: string) => void
  existingPlayerIds: string[]
  existingTeamPlayers: any[] // All players currently in the team
}

export function PlayerAdditionDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  role,
  onPlayerAdded,
  existingPlayerIds,
  existingTeamPlayers
}: PlayerAdditionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [guestName, setGuestName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      const result = await searchUsers(searchQuery)
      if (result.success && result.data) {
        // Filter out users already in team
        const filtered = result.data.filter(
          (user: any) => !existingPlayerIds.includes(user.id)
        )
        setSearchResults(filtered)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, existingPlayerIds])

  const handleAddRegisteredPlayer = async (user: any) => {
    setIsLoading(true)
    try {
      // Check if this user is already in the team
      const existingPlayer = existingTeamPlayers.find(
        (p: any) => p.user_id === user.id && !p.is_guest
      )

      if (existingPlayer) {
        // Player already exists in team, just use their existing ID
        console.log('Player already in team, using existing ID:', existingPlayer.id)
        onPlayerAdded(existingPlayer.id, existingPlayer.player_name)
        onOpenChange(false)
        setSearchQuery('')
        setIsLoading(false)
        return
      }

      // Player not in team, add them
      const result = await addPlayerToTeam({
        teamId,
        userId: user.id,
        playerName: user.name,
        isGuest: false,
        isCaptain: false,
        avatarIndex: 0,
      })

      if (result.success && result.data) {
        onPlayerAdded(result.data.id, user.name)
        onOpenChange(false)
        setSearchQuery('')
      } else {
        alert('Failed to add player: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddGuestPlayer = async () => {
    if (!guestName.trim()) {
      alert('Please enter a player name')
      return
    }

    setIsLoading(true)
    try {
      // Check if a guest player with this name already exists in the team
      const existingGuest = existingTeamPlayers.find(
        (p: any) => p.is_guest && p.player_name.toLowerCase() === guestName.trim().toLowerCase()
      )

      if (existingGuest) {
        // Guest player already exists in team, just use their existing ID
        console.log('Guest player already in team, using existing ID:', existingGuest.id)
        onPlayerAdded(existingGuest.id, existingGuest.player_name)
        onOpenChange(false)
        setGuestName('')
        setIsLoading(false)
        return
      }

      // Guest player not in team, add them
      const result = await addPlayerToTeam({
        teamId,
        playerName: guestName,
        isGuest: true,
        isCaptain: false,
        avatarIndex: Math.floor(Math.random() * 16),
      })

      if (result.success && result.data) {
        onPlayerAdded(result.data.id, guestName)
        onOpenChange(false)
        setGuestName('')
      } else {
        alert('Failed to add player: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {role === 'batsman' ? 'Batsman' : 'Bowler'} to {teamName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Users</TabsTrigger>
            <TabsTrigger value="guest">Add Guest</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div>
              <Label htmlFor="search">Search by name or email</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                disabled={isLoading}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddRegisteredPlayer(user)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No users found
              </p>
            )}
          </TabsContent>

          <TabsContent value="guest" className="space-y-4">
            <div>
              <Label htmlFor="guestName">Player Name</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter player name"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddGuestPlayer()
                  }
                }}
              />
            </div>
            <Button
              onClick={handleAddGuestPlayer}
              disabled={isLoading || !guestName.trim()}
              className="w-full"
            >
              {isLoading ? 'Adding...' : 'Add Guest Player'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
