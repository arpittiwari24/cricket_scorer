'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createTeam, addPlayerToTeam, searchUsers } from '@/actions/teams'
import { createMatch, setupMatch } from '@/actions/matches'
import { useAuth } from '@/hooks/useAuth'

interface PlayerDraft {
  name: string
  userId?: string
  isGuest: boolean
  avatarIndex: number
}

export default function CreateMatchPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Step 1: Match details + Team names
  const [overs, setOvers] = useState('20')
  const [venue, setVenue] = useState('')
  const [team1Name, setTeam1Name] = useState('')
  const [team2Name, setTeam2Name] = useState('')

  // Step 2: Toss
  const [battingFirst, setBattingFirst] = useState<'team1' | 'team2' | ''>('')

  // Step 3: Opening players
  const [openingPlayers, setOpeningPlayers] = useState({
    batsman1: null as PlayerDraft | null,
    batsman2: null as PlayerDraft | null,
    bowler: null as PlayerDraft | null,
  })

  // Search state for each player position
  const [batsman1SearchQuery, setBatsman1SearchQuery] = useState('')
  const [batsman1SearchResults, setBatsman1SearchResults] = useState<any[]>([])
  const [batsman1GuestName, setBatsman1GuestName] = useState('')

  const [batsman2SearchQuery, setBatsman2SearchQuery] = useState('')
  const [batsman2SearchResults, setBatsman2SearchResults] = useState<any[]>([])
  const [batsman2GuestName, setBatsman2GuestName] = useState('')

  const [bowlerSearchQuery, setBowlerSearchQuery] = useState('')
  const [bowlerSearchResults, setBowlerSearchResults] = useState<any[]>([])
  const [bowlerGuestName, setBowlerGuestName] = useState('')

  // Search handlers
  const handleSearchBatsman1 = async (query: string) => {
    setBatsman1SearchQuery(query)
    if (query.length < 2) {
      setBatsman1SearchResults([])
      return
    }
    const result = await searchUsers(query)
    if (result.success && result.data) {
      setBatsman1SearchResults(result.data)
    }
  }

  const handleSearchBatsman2 = async (query: string) => {
    setBatsman2SearchQuery(query)
    if (query.length < 2) {
      setBatsman2SearchResults([])
      return
    }
    const result = await searchUsers(query)
    if (result.success && result.data) {
      setBatsman2SearchResults(result.data)
    }
  }

  const handleSearchBowler = async (query: string) => {
    setBowlerSearchQuery(query)
    if (query.length < 2) {
      setBowlerSearchResults([])
      return
    }
    const result = await searchUsers(query)
    if (result.success && result.data) {
      setBowlerSearchResults(result.data)
    }
  }

  // Add player handlers
  const addRegisteredBatsman1 = (user: any) => {
    setOpeningPlayers({
      ...openingPlayers,
      batsman1: {
        name: user.name,
        userId: user.id,
        isGuest: false,
        avatarIndex: 0,
      },
    })
    setBatsman1SearchQuery('')
    setBatsman1SearchResults([])
  }

  const addGuestBatsman1 = () => {
    if (!batsman1GuestName.trim()) return
    setOpeningPlayers({
      ...openingPlayers,
      batsman1: {
        name: batsman1GuestName,
        isGuest: true,
        avatarIndex: Math.floor(Math.random() * 16),
      },
    })
    setBatsman1GuestName('')
  }

  const addRegisteredBatsman2 = (user: any) => {
    setOpeningPlayers({
      ...openingPlayers,
      batsman2: {
        name: user.name,
        userId: user.id,
        isGuest: false,
        avatarIndex: 0,
      },
    })
    setBatsman2SearchQuery('')
    setBatsman2SearchResults([])
  }

  const addGuestBatsman2 = () => {
    if (!batsman2GuestName.trim()) return
    setOpeningPlayers({
      ...openingPlayers,
      batsman2: {
        name: batsman2GuestName,
        isGuest: true,
        avatarIndex: Math.floor(Math.random() * 16),
      },
    })
    setBatsman2GuestName('')
  }

  const addRegisteredBowler = (user: any) => {
    setOpeningPlayers({
      ...openingPlayers,
      bowler: {
        name: user.name,
        userId: user.id,
        isGuest: false,
        avatarIndex: 0,
      },
    })
    setBowlerSearchQuery('')
    setBowlerSearchResults([])
  }

  const addGuestBowler = () => {
    if (!bowlerGuestName.trim()) return
    setOpeningPlayers({
      ...openingPlayers,
      bowler: {
        name: bowlerGuestName,
        isGuest: true,
        avatarIndex: Math.floor(Math.random() * 16),
      },
    })
    setBowlerGuestName('')
  }

  const handleCreateMatch = async () => {
    if (!user?.id) {
      alert('You must be logged in to create a match')
      return
    }

    if (!team1Name || !team2Name) {
      alert('Please enter both team names')
      return
    }

    if (!openingPlayers.batsman1 || !openingPlayers.batsman2 || !openingPlayers.bowler) {
      alert('Please add all opening players')
      return
    }

    if (openingPlayers.batsman1.name === openingPlayers.batsman2.name) {
      alert('Opening batsmen must be different players')
      return
    }

    setIsLoading(true)

    try {
      // 1. Create both teams (names only)
      const team1Result = await createTeam({ name: team1Name, createdBy: user.id })
      if (!team1Result.success || !team1Result.data) {
        alert('Failed to create Team 1')
        setIsLoading(false)
        return
      }
      const team1Id = team1Result.data.id

      const team2Result = await createTeam({ name: team2Name, createdBy: user.id })
      if (!team2Result.success || !team2Result.data) {
        alert('Failed to create Team 2')
        setIsLoading(false)
        return
      }
      const team2Id = team2Result.data.id

      // 2. Create match
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
      const matchId = matchResult.data.id

      // 3. Determine batting/bowling teams
      const battingTeamId = battingFirst === 'team1' ? team1Id : team2Id
      const bowlingTeamId = battingFirst === 'team1' ? team2Id : team1Id

      // 4. Add opening players dynamically
      const batsman1Result = await addPlayerToTeam({
        teamId: battingTeamId,
        userId: openingPlayers.batsman1.userId,
        playerName: openingPlayers.batsman1.name,
        isGuest: openingPlayers.batsman1.isGuest,
        isCaptain: false,
        avatarIndex: openingPlayers.batsman1.avatarIndex,
      })
      if (!batsman1Result.success || !batsman1Result.data) {
        alert('Failed to add first batsman')
        setIsLoading(false)
        return
      }
      const batsman1Id = batsman1Result.data.id

      const batsman2Result = await addPlayerToTeam({
        teamId: battingTeamId,
        userId: openingPlayers.batsman2.userId,
        playerName: openingPlayers.batsman2.name,
        isGuest: openingPlayers.batsman2.isGuest,
        isCaptain: false,
        avatarIndex: openingPlayers.batsman2.avatarIndex,
      })
      if (!batsman2Result.success || !batsman2Result.data) {
        alert('Failed to add second batsman')
        setIsLoading(false)
        return
      }
      const batsman2Id = batsman2Result.data.id

      const bowlerResult = await addPlayerToTeam({
        teamId: bowlingTeamId,
        userId: openingPlayers.bowler.userId,
        playerName: openingPlayers.bowler.name,
        isGuest: openingPlayers.bowler.isGuest,
        isCaptain: false,
        avatarIndex: openingPlayers.bowler.avatarIndex,
      })
      if (!bowlerResult.success || !bowlerResult.data) {
        alert('Failed to add opening bowler')
        setIsLoading(false)
        return
      }
      const bowlerId = bowlerResult.data.id

      // 5. Setup match with opening players
      const setupResult = await setupMatch(matchId, {
        openingBatsmen: [batsman1Id, batsman2Id],
        openingBowler: bowlerId,
      })

      if (setupResult.success) {
        router.push(`/matches/${matchId}`)
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const battingTeamName = battingFirst === 'team1' ? team1Name : team2Name
  const bowlingTeamName = battingFirst === 'team1' ? team2Name : team1Name

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
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Match & Teams</span>
        </div>
        <div className="w-4 sm:w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Toss</span>
        </div>
        <div className="w-4 sm:w-12 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 3 ? 'text-black' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step >= 3 ? 'bg-black text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">Opening Players</span>
        </div>
      </div>

      {/* Step 1: Match Details + Team Names */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Match Details & Team Names</CardTitle>
            <CardDescription>Configure match settings and enter team names</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overs">Number of Overs</Label>
              <div className="flex gap-2">
                <Input
                  id="overs"
                  type="number"
                  min="1"
                  max="100"
                  value={overs}
                  onChange={(e) => setOvers(e.target.value)}
                  placeholder="Enter overs (e.g., 5, 10, 20)"
                  className="flex-1"
                />
                <Select value={overs} onValueChange={setOvers}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Quick" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30, 40, 50].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter any number of overs or use quick select</p>
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

            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4">Team Names</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="team1Name">Team 1 Name</Label>
                  <Input
                    id="team1Name"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    placeholder="Enter team 1 name"
                  />
                </div>

                <div>
                  <Label htmlFor="team2Name">Team 2 Name</Label>
                  <Input
                    id="team2Name"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    placeholder="Enter team 2 name"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!team1Name || !team2Name}
              className="w-full"
            >
              Next: Toss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Toss */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Toss</CardTitle>
            <CardDescription>Which team will bat first?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="battingFirst">Select Batting Team</Label>
              <Select value={battingFirst} onValueChange={(value: 'team1' | 'team2') => setBattingFirst(value)}>
                <SelectTrigger id="battingFirst">
                  <SelectValue placeholder="Select batting team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team1">{team1Name}</SelectItem>
                  <SelectItem value="team2">{team2Name}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!battingFirst}
                className="flex-1"
              >
                Next: Add Opening Players
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Opening Players */}
      {step === 3 && battingFirst && (
        <div className="space-y-4">
          {/* First Opening Batsman */}
          <Card>
            <CardHeader>
              <CardTitle>First Opening Batsman ({battingTeamName})</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Search User</TabsTrigger>
                  <TabsTrigger value="guest">Guest Player</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-3">
                  <div>
                    <Label>Search by name or email</Label>
                    <Input
                      value={batsman1SearchQuery}
                      onChange={(e) => handleSearchBatsman1(e.target.value)}
                      placeholder="Type to search..."
                    />
                  </div>
                  {batsman1SearchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {batsman1SearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => addRegisteredBatsman1(user)}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Button size="sm" type="button">Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="guest" className="space-y-3">
                  <div>
                    <Label htmlFor="batsman1Guest">Player Name</Label>
                    <Input
                      id="batsman1Guest"
                      value={batsman1GuestName}
                      onChange={(e) => setBatsman1GuestName(e.target.value)}
                      placeholder="Enter player name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addGuestBatsman1()
                        }
                      }}
                    />
                  </div>
                  <Button onClick={addGuestBatsman1} disabled={!batsman1GuestName.trim()} className="w-full">
                    Add Guest Player
                  </Button>
                </TabsContent>
              </Tabs>

              {openingPlayers.batsman1 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-800">
                    ✓ {openingPlayers.batsman1.name}
                    <span className="text-sm text-green-600 ml-2">
                      ({openingPlayers.batsman1.isGuest ? 'Guest' : 'Registered'})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Second Opening Batsman */}
          <Card>
            <CardHeader>
              <CardTitle>Second Opening Batsman ({battingTeamName})</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Search User</TabsTrigger>
                  <TabsTrigger value="guest">Guest Player</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-3">
                  <div>
                    <Label>Search by name or email</Label>
                    <Input
                      value={batsman2SearchQuery}
                      onChange={(e) => handleSearchBatsman2(e.target.value)}
                      placeholder="Type to search..."
                    />
                  </div>
                  {batsman2SearchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {batsman2SearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => addRegisteredBatsman2(user)}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Button size="sm" type="button">Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="guest" className="space-y-3">
                  <div>
                    <Label htmlFor="batsman2Guest">Player Name</Label>
                    <Input
                      id="batsman2Guest"
                      value={batsman2GuestName}
                      onChange={(e) => setBatsman2GuestName(e.target.value)}
                      placeholder="Enter player name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addGuestBatsman2()
                        }
                      }}
                    />
                  </div>
                  <Button onClick={addGuestBatsman2} disabled={!batsman2GuestName.trim()} className="w-full">
                    Add Guest Player
                  </Button>
                </TabsContent>
              </Tabs>

              {openingPlayers.batsman2 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-800">
                    ✓ {openingPlayers.batsman2.name}
                    <span className="text-sm text-green-600 ml-2">
                      ({openingPlayers.batsman2.isGuest ? 'Guest' : 'Registered'})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opening Bowler */}
          <Card>
            <CardHeader>
              <CardTitle>Opening Bowler ({bowlingTeamName})</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Search User</TabsTrigger>
                  <TabsTrigger value="guest">Guest Player</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-3">
                  <div>
                    <Label>Search by name or email</Label>
                    <Input
                      value={bowlerSearchQuery}
                      onChange={(e) => handleSearchBowler(e.target.value)}
                      placeholder="Type to search..."
                    />
                  </div>
                  {bowlerSearchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {bowlerSearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => addRegisteredBowler(user)}
                        >
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Button size="sm" type="button">Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="guest" className="space-y-3">
                  <div>
                    <Label htmlFor="bowlerGuest">Player Name</Label>
                    <Input
                      id="bowlerGuest"
                      value={bowlerGuestName}
                      onChange={(e) => setBowlerGuestName(e.target.value)}
                      placeholder="Enter player name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addGuestBowler()
                        }
                      }}
                    />
                  </div>
                  <Button onClick={addGuestBowler} disabled={!bowlerGuestName.trim()} className="w-full">
                    Add Guest Player
                  </Button>
                </TabsContent>
              </Tabs>

              {openingPlayers.bowler && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-800">
                    ✓ {openingPlayers.bowler.name}
                    <span className="text-sm text-green-600 ml-2">
                      ({openingPlayers.bowler.isGuest ? 'Guest' : 'Registered'})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleCreateMatch}
              disabled={!openingPlayers.batsman1 || !openingPlayers.batsman2 || !openingPlayers.bowler || isLoading}
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
