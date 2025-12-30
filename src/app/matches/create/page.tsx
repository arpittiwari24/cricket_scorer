'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTeam, addPlayerToTeam, searchUsers } from '@/actions/teams'
import { createMatch, setupMatch } from '@/actions/matches'
import { useAuth } from '@/hooks/useAuth'

interface Player {
  id: string
  name: string
  isGuest: boolean
  userId?: string
  avatarIndex: number
  isCaptain: boolean
}

export default function CreateMatchPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Match details
  const [overs, setOvers] = useState('20')
  const [venue, setVenue] = useState('')

  // Team 1
  const [team1Name, setTeam1Name] = useState('')
  const [team1Players, setTeam1Players] = useState<Player[]>([])
  const [team1PlayerName, setTeam1PlayerName] = useState('')
  const [team1SearchQuery, setTeam1SearchQuery] = useState('')
  const [team1SearchResults, setTeam1SearchResults] = useState<any[]>([])

  // Team 2
  const [team2Name, setTeam2Name] = useState('')
  const [team2Players, setTeam2Players] = useState<Player[]>([])
  const [team2PlayerName, setTeam2PlayerName] = useState('')
  const [team2SearchQuery, setTeam2SearchQuery] = useState('')
  const [team2SearchResults, setTeam2SearchResults] = useState<any[]>([])

  // Match setup
  const [battingFirst, setBattingFirst] = useState<'team1' | 'team2' | ''>('')
  const [batsman1, setBatsman1] = useState('')
  const [batsman2, setBatsman2] = useState('')
  const [bowler, setBowler] = useState('')

  const handleSearchTeam1 = async (query: string) => {
    setTeam1SearchQuery(query)
    if (query.length < 2) {
      setTeam1SearchResults([])
      return
    }
    const result = await searchUsers(query)
    if (result.success && result.data) {
      setTeam1SearchResults(result.data)
    }
  }

  const handleSearchTeam2 = async (query: string) => {
    setTeam2SearchQuery(query)
    if (query.length < 2) {
      setTeam2SearchResults([])
      return
    }
    const result = await searchUsers(query)
    if (result.success && result.data) {
      setTeam2SearchResults(result.data)
    }
  }

  const addRegisteredPlayerTeam1 = (searchUser: any) => {
    if (team1Players.find(p => p.userId === searchUser.id)) return
    setTeam1Players([
      ...team1Players,
      {
        id: Math.random().toString(),
        name: searchUser.name,
        isGuest: false,
        userId: searchUser.id,
        avatarIndex: 0,
        isCaptain: false,
      },
    ])
    setTeam1SearchQuery('')
    setTeam1SearchResults([])
  }

  const addGuestPlayerTeam1 = () => {
    if (!team1PlayerName.trim()) return
    setTeam1Players([
      ...team1Players,
      {
        id: Math.random().toString(),
        name: team1PlayerName,
        isGuest: true,
        avatarIndex: Math.floor(Math.random() * 16),
        isCaptain: false,
      },
    ])
    setTeam1PlayerName('')
  }

  const removePlayerTeam1 = (id: string) => {
    setTeam1Players(team1Players.filter((p) => p.id !== id))
  }

  const toggleCaptainTeam1 = (id: string) => {
    setTeam1Players(
      team1Players.map((p) =>
        p.id === id ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }
      )
    )
  }

  const addRegisteredPlayerTeam2 = (searchUser: any) => {
    if (team2Players.find(p => p.userId === searchUser.id)) return
    setTeam2Players([
      ...team2Players,
      {
        id: Math.random().toString(),
        name: searchUser.name,
        isGuest: false,
        userId: searchUser.id,
        avatarIndex: 0,
        isCaptain: false,
      },
    ])
    setTeam2SearchQuery('')
    setTeam2SearchResults([])
  }

  const addGuestPlayerTeam2 = () => {
    if (!team2PlayerName.trim()) return
    setTeam2Players([
      ...team2Players,
      {
        id: Math.random().toString(),
        name: team2PlayerName,
        isGuest: true,
        avatarIndex: Math.floor(Math.random() * 16),
        isCaptain: false,
      },
    ])
    setTeam2PlayerName('')
  }

  const removePlayerTeam2 = (id: string) => {
    setTeam2Players(team2Players.filter((p) => p.id !== id))
  }

  const toggleCaptainTeam2 = (id: string) => {
    setTeam2Players(
      team2Players.map((p) =>
        p.id === id ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }
      )
    )
  }

  const handleCreateMatch = async () => {
    if (!user?.id || !team1Name || !team2Name || team1Players.length === 0 || team2Players.length === 0) {
      alert('Please complete all teams')
      return
    }

    if (!battingFirst || !batsman1 || !batsman2 || !bowler) {
      alert('Please select which team bats first, opening batsmen and bowler')
      return
    }

    setIsLoading(true)

    try {
      // Create Team 1
      const team1Result = await createTeam({ name: team1Name, createdBy: user.id })
      if (!team1Result.success || !team1Result.data) {
        alert('Failed to create Team 1')
        setIsLoading(false)
        return
      }
      const team1Id = team1Result.data.id

      // Add Team 1 players
      const team1PlayerIds: Record<string, string> = {}
      for (const player of team1Players) {
        const result = await addPlayerToTeam({
          teamId: team1Id,
          userId: player.userId,
          playerName: player.name,
          isGuest: player.isGuest,
          isCaptain: player.isCaptain,
          avatarIndex: player.avatarIndex,
        })
        if (result.success && result.data) {
          team1PlayerIds[player.id] = result.data.id
        }
      }

      // Create Team 2
      const team2Result = await createTeam({ name: team2Name, createdBy: user.id })
      if (!team2Result.success || !team2Result.data) {
        alert('Failed to create Team 2')
        setIsLoading(false)
        return
      }
      const team2Id = team2Result.data.id

      // Add Team 2 players
      const team2PlayerIds: Record<string, string> = {}
      for (const player of team2Players) {
        const result = await addPlayerToTeam({
          teamId: team2Id,
          userId: player.userId,
          playerName: player.name,
          isGuest: player.isGuest,
          isCaptain: player.isCaptain,
          avatarIndex: player.avatarIndex,
        })
        if (result.success && result.data) {
          team2PlayerIds[player.id] = result.data.id
        }
      }

      // Create match
      const matchResult = await createMatch({
        team1Id,
        team2Id,
        totalOvers: parseInt(overs),
        venue,
        createdBy: user.id,
      })

      if (!matchResult.success || !matchResult.data) {
        alert('Failed to create match')
        setIsLoading(false)
        return
      }

      // Setup match - batsmen and bowler based on which team bats first
      const battingPlayerIds = battingFirst === 'team1' ? team1PlayerIds : team2PlayerIds
      const bowlingPlayerIds = battingFirst === 'team1' ? team2PlayerIds : team1PlayerIds

      const setupResult = await setupMatch(matchResult.data.id, {
        openingBatsmen: [battingPlayerIds[batsman1], battingPlayerIds[batsman2]],
        openingBowler: bowlingPlayerIds[bowler],
      })

      if (setupResult.success) {
        router.push(`/matches/${matchResult.data.id}`)
      } else {
        alert('Failed to setup match')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error creating match:', error)
      alert('Failed to create match')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Create New Match</h1>
        <p className="text-sm sm:text-base text-gray-600">Set up teams and start scoring</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 overflow-x-auto px-2">
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 1 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 1 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Match Details</span>
        </div>
        <div className="w-4 sm:w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Team 1</span>
        </div>
        <div className="w-4 sm:w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 3 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 3 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Team 2</span>
        </div>
        <div className="w-4 sm:w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 4 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 4 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            4
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Setup</span>
        </div>
      </div>

      {/* Step 1: Match Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Details</CardTitle>
            <CardDescription>Configure match settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overs">Number of Overs</Label>
              <Select value={overs} onValueChange={setOvers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30, 40, 50].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} overs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="venue">Venue (Optional)</Label>
              <Input
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Enter venue"
              />
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Next: Create Team 1
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Team 1 */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team 1 Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="team1Name">Team Name</Label>
                <Input
                  id="team1Name"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <Label>Search Registered Players</Label>
                <Input
                  value={team1SearchQuery}
                  onChange={(e) => handleSearchTeam1(e.target.value)}
                  placeholder="Search by name or email"
                />
                {team1SearchResults.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {team1SearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => addRegisteredPlayerTeam1(user)}
                      >
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Button type="button" size="sm">Add</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="team1PlayerName">Add Guest Player</Label>
                  <Input
                    id="team1PlayerName"
                    value={team1PlayerName}
                    onChange={(e) => setTeam1PlayerName(e.target.value)}
                    placeholder="Guest player name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addGuestPlayerTeam1()
                      }
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={addGuestPlayerTeam1}>
                    Add Guest
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {team1Players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team 1 Players ({team1Players.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team1Players.map((player) => (
                    <div
                      key={player.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold flex-shrink-0">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{player.name}</p>
                          <p className="text-xs text-gray-500">
                            {player.isGuest ? 'Guest' : 'Registered'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={player.isCaptain ? 'default' : 'outline'}
                          onClick={() => toggleCaptainTeam1(player.id)}
                          className="flex-1 sm:flex-none text-xs"
                        >
                          {player.isCaptain ? 'Captain' : 'Make Captain'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removePlayerTeam1(player.id)}
                          className="flex-1 sm:flex-none"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!team1Name || team1Players.length === 0}
              className="flex-1"
            >
              Next: Create Team 2
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Team 2 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team 2 Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="team2Name">Team Name</Label>
                <Input
                  id="team2Name"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <Label>Search Registered Players</Label>
                <Input
                  value={team2SearchQuery}
                  onChange={(e) => handleSearchTeam2(e.target.value)}
                  placeholder="Search by name or email"
                />
                {team2SearchResults.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                    {team2SearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                        onClick={() => addRegisteredPlayerTeam2(user)}
                      >
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Button type="button" size="sm">Add</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="team2PlayerName">Add Guest Player</Label>
                  <Input
                    id="team2PlayerName"
                    value={team2PlayerName}
                    onChange={(e) => setTeam2PlayerName(e.target.value)}
                    placeholder="Guest player name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addGuestPlayerTeam2()
                      }
                    }}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={addGuestPlayerTeam2}>
                    Add Guest
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {team2Players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team 2 Players ({team2Players.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team2Players.map((player) => (
                    <div
                      key={player.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold flex-shrink-0">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{player.name}</p>
                          <p className="text-xs text-gray-500">
                            {player.isGuest ? 'Guest' : 'Registered'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={player.isCaptain ? 'default' : 'outline'}
                          onClick={() => toggleCaptainTeam2(player.id)}
                          className="flex-1 sm:flex-none text-xs"
                        >
                          {player.isCaptain ? 'Captain' : 'Make Captain'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removePlayerTeam2(player.id)}
                          className="flex-1 sm:flex-none"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={!team2Name || team2Players.length === 0}
              className="flex-1"
            >
              Next: Match Setup
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Match Setup */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Setup</CardTitle>
              <CardDescription>Choose which team bats first and select opening players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="battingFirst">Which team will bat first?</Label>
                <Select value={battingFirst} onValueChange={(value: 'team1' | 'team2') => {
                  setBattingFirst(value)
                  setBatsman1('')
                  setBatsman2('')
                  setBowler('')
                }}>
                  <SelectTrigger id="battingFirst">
                    <SelectValue placeholder="Select batting team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team1">{team1Name}</SelectItem>
                    <SelectItem value="team2">{team2Name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {battingFirst && (
                <>
                  <div>
                    <Label htmlFor="batsman1">First Opening Batsman ({battingFirst === 'team1' ? team1Name : team2Name})</Label>
                    <Select value={batsman1} onValueChange={setBatsman1}>
                      <SelectTrigger id="batsman1">
                        <SelectValue placeholder="Select first batsman" />
                      </SelectTrigger>
                      <SelectContent>
                        {(battingFirst === 'team1' ? team1Players : team2Players).map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name} {player.isCaptain ? '⭐' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="batsman2">Second Opening Batsman ({battingFirst === 'team1' ? team1Name : team2Name})</Label>
                    <Select value={batsman2} onValueChange={setBatsman2}>
                      <SelectTrigger id="batsman2">
                        <SelectValue placeholder="Select second batsman" />
                      </SelectTrigger>
                      <SelectContent>
                        {(battingFirst === 'team1' ? team1Players : team2Players)
                          .filter((player) => player.id !== batsman1)
                          .map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name} {player.isCaptain ? '⭐' : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bowler">Opening Bowler ({battingFirst === 'team1' ? team2Name : team1Name})</Label>
                    <Select value={bowler} onValueChange={setBowler}>
                      <SelectTrigger id="bowler">
                        <SelectValue placeholder="Select opening bowler" />
                      </SelectTrigger>
                      <SelectContent>
                        {(battingFirst === 'team1' ? team2Players : team1Players).map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name} {player.isCaptain ? '⭐' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleCreateMatch}
              disabled={!battingFirst || !batsman1 || !batsman2 || !bowler || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Creating Match...' : 'Start Match'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
