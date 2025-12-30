'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { setupMatch, getMatch } from '@/actions/matches'
import { getTeam } from '@/actions/teams'

export default function MatchSetupPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [battingTeamPlayers, setBattingTeamPlayers] = useState<any[]>([])
  const [bowlingTeamPlayers, setBowlingTeamPlayers] = useState<any[]>([])
  const [batsman1, setBatsman1] = useState('')
  const [batsman2, setBatsman2] = useState('')
  const [bowler, setBowler] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadMatchData()
  }, [])

  const loadMatchData = async () => {
    const matchResult = await getMatch(matchId)
    if (!matchResult.success || !matchResult.data) {
      router.push('/matches')
      return
    }

    const matchData = matchResult.data
    setMatch(matchData)

    // Load batting team players (Team 1 bats first)
    const battingResult = await getTeam(matchData.team1_id)
    if (battingResult.success && battingResult.data) {
      setBattingTeamPlayers(battingResult.data.players || [])
    }

    // Load bowling team players (Team 2 bowls first)
    const bowlingResult = await getTeam(matchData.team2_id)
    if (bowlingResult.success && bowlingResult.data) {
      setBowlingTeamPlayers(bowlingResult.data.players || [])
    }

    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batsman1 || !batsman2 || !bowler) {
      alert('Please select both opening batsmen and opening bowler')
      return
    }

    if (batsman1 === batsman2) {
      alert('Please select different batsmen')
      return
    }

    setIsSubmitting(true)

    const result = await setupMatch(matchId, {
      openingBatsmen: [batsman1, batsman2],
      openingBowler: bowler,
    })

    if (result.success) {
      router.push(`/matches/${matchId}`)
    } else {
      alert('Failed to setup match')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!match) {
    return <div className="text-center py-12">Match not found</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Match Setup</h1>
        <p className="text-gray-600">
          {match.team1?.name} vs {match.team2?.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Opening Batsmen ({match.team1?.name})</CardTitle>
            <CardDescription>Select two batsmen to open the innings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Batsman</label>
              <div className="space-y-2">
                {battingTeamPlayers.map((player) => (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                      batsman1 === player.id ? 'border-black bg-gray-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="batsman1"
                      value={player.id}
                      checked={batsman1 === player.id}
                      onChange={(e) => setBatsman1(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>{player.player_name}</span>
                    {player.is_captain && <span className="text-xs">⭐ Captain</span>}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Second Batsman</label>
              <div className="space-y-2">
                {battingTeamPlayers.map((player) => (
                  <label
                    key={player.id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                      batsman2 === player.id ? 'border-black bg-gray-50' : ''
                    } ${batsman1 === player.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="batsman2"
                      value={player.id}
                      checked={batsman2 === player.id}
                      onChange={(e) => setBatsman2(e.target.value)}
                      disabled={batsman1 === player.id}
                      className="w-4 h-4"
                    />
                    <span>{player.player_name}</span>
                    {player.is_captain && <span className="text-xs">⭐ Captain</span>}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opening Bowler ({match.team2?.name})</CardTitle>
            <CardDescription>Select the bowler for the first over</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bowlingTeamPlayers.map((player) => (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                    bowler === player.id ? 'border-black bg-gray-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="bowler"
                    value={player.id}
                    checked={bowler === player.id}
                    onChange={(e) => setBowler(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{player.player_name}</span>
                  {player.is_captain && <span className="text-xs">⭐ Captain</span>}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!batsman1 || !batsman2 || !bowler || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Starting...' : 'Start Match'}
          </Button>
        </div>
      </form>
    </div>
  )
}
