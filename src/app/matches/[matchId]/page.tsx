'use client'

import { use, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMatch } from '@/actions/matches'
import { recordRuns, recordWicket, recordWide, recordNoBall } from '@/actions/scoring'
import { changeBowler, selectNewBatsman } from '@/actions/matches'
import { useRealtimeMatch, useRealtimeMatchStats } from '@/hooks/useRealtime'
import { calculateStrikeRate } from '@/lib/cricket/stats-calculator'
import { formatOvers } from '@/lib/cricket/rules'

export default function MatchScoringPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const { match, isLoading } = useRealtimeMatch(matchId)
  const { battingStats, bowlingStats } = useRealtimeMatchStats(matchId)
  const [currentBatsmen, setCurrentBatsmen] = useState<any[]>([])
  const [currentBowler, setCurrentBowler] = useState<any>(null)
  const [showWicketDialog, setShowWicketDialog] = useState(false)
  const [showBowlerDialog, setShowBowlerDialog] = useState(false)
  const [showBatsmanDialog, setShowBatsmanDialog] = useState(false)
  const [wicketType, setWicketType] = useState('')
  const [newBowlerId, setNewBowlerId] = useState('')
  const [newBatsmanId, setNewBatsmanId] = useState('')

  useEffect(() => {
    if (battingStats && match) {
      const activeBatsmen = battingStats.filter(
        (s: any) => !s.is_out && s.innings_number === match.current_innings
      )
      setCurrentBatsmen(activeBatsmen.slice(0, 2))
    }
  }, [battingStats, match])

  useEffect(() => {
    if (bowlingStats && match) {
      const activeBowler = bowlingStats.find(
        (s: any) => s.innings_number === match.current_innings
      )
      setCurrentBowler(activeBowler)
    }
  }, [bowlingStats, match])

  if (isLoading || !match) {
    return <div className="text-center py-12">Loading match...</div>
  }

  if (match.status === 'not_started') {
    return (
      <div className="text-center py-12">
        <p>Match has not started yet. Please complete match setup.</p>
      </div>
    )
  }

  if (match.status === 'completed') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Match Completed</h2>
        <p className="text-xl">{match.result_text}</p>
      </div>
    )
  }

  const handleRecordRuns = async (runs: number) => {
    if (currentBatsmen.length < 2 || !currentBowler) return

    const striker = currentBatsmen.find((b: any) => b.onStrike) || currentBatsmen[0]
    const matchId = (await params).matchId;

    await recordRuns({
      matchId,
      runs,
      batsmanId: striker.team_player_id,
      nonStrikerId: currentBatsmen.find((b: any) => b.team_player_id !== striker.team_player_id)?.team_player_id || '',
      bowlerId: currentBowler.team_player_id,
    })
  }

  const handleWicket = async () => {
    if (!wicketType || currentBatsmen.length < 2 || !currentBowler) return

    const striker = currentBatsmen.find((b: any) => b.onStrike) || currentBatsmen[0]
    const matchId = (await params).matchId;

    await recordWicket({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: currentBatsmen.find((b: any) => b.team_player_id !== striker.team_player_id)?.team_player_id || '',
      bowlerId: currentBowler.team_player_id,
      wicketType: wicketType as any,
    })

    setShowWicketDialog(false)
    setShowBatsmanDialog(true)
  }

  const handleWide = async () => {
    if (currentBatsmen.length < 2 || !currentBowler) return

    const striker = currentBatsmen.find((b: any) => b.onStrike) || currentBatsmen[0]
    const matchId = (await params).matchId;

    await recordWide({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: currentBatsmen.find((b: any) => b.team_player_id !== striker.team_player_id)?.team_player_id || '',
      bowlerId: currentBowler.team_player_id,
      additionalRuns: 0,
    })
  }

  const handleNoBall = async () => {
    if (currentBatsmen.length < 2 || !currentBowler) return

    const striker = currentBatsmen.find((b: any) => b.onStrike) || currentBatsmen[0]
    const matchId = (await params).matchId;

    await recordNoBall({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: currentBatsmen.find((b: any) => b.team_player_id !== striker.team_player_id)?.team_player_id || '',
      bowlerId: currentBowler.team_player_id,
      additionalRuns: 0,
    })
  }

  const isFirstInnings = match.current_innings === 1
  const currentScore = isFirstInnings ? match.team1_score : match.team2_score
  const currentWickets = isFirstInnings ? match.team1_wickets : match.team2_wickets
  const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs
  const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Score Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isFirstInnings ? 'First Innings' : 'Second Innings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-bold">
              {currentScore}/{currentWickets}
            </div>
            <div className="text-xl text-gray-600 mt-2">
              {formatOvers(currentOvers, currentBalls)} / {match.total_overs} overs
            </div>
            {match.target && (
              <div className="text-lg mt-2">
                Target: {match.target} | Need: {match.target - currentScore} runs
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Batsmen */}
      <Card>
        <CardHeader>
          <CardTitle>Batsmen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentBatsmen.map((batsman: any, index: number) => (
              <div key={batsman.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  {index === 0 && <span className="text-green-600">•</span>}
                  <span className="font-medium">{batsman.player?.player_name || 'Unknown'}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {batsman.runs}({batsman.balls_faced}) SR: {calculateStrikeRate(batsman.runs, batsman.balls_faced)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Bowler */}
      {currentBowler && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bowler</CardTitle>
            <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Change</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select New Bowler</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {/* Add bowler selection here */}
                  <p className="text-sm text-gray-500">Bowler selection dialog</p>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <span className="font-medium">{currentBowler.player?.player_name || 'Unknown'}</span>
              <div className="text-sm text-gray-600">
                {currentBowler.overs}.{currentBowler.balls_bowled % 6} overs |
                {currentBowler.wickets}/{currentBowler.runs_conceded}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <Button
                key={runs}
                onClick={() => handleRecordRuns(runs)}
                className="h-16 text-2xl font-bold"
                variant={runs === 4 || runs === 6 ? 'default' : 'outline'}
              >
                {runs}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="h-12">Wicket</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Wicket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={wicketType} onValueChange={setWicketType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dismissal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bowled">Bowled</SelectItem>
                      <SelectItem value="caught">Caught</SelectItem>
                      <SelectItem value="lbw">LBW</SelectItem>
                      <SelectItem value="run_out">Run Out</SelectItem>
                      <SelectItem value="stumped">Stumped</SelectItem>
                      <SelectItem value="hit_wicket">Hit Wicket</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleWicket} className="w-full" disabled={!wicketType}>
                    Confirm Wicket
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleWide} variant="outline" className="h-12">Wide</Button>
            <Button onClick={handleNoBall} variant="outline" className="h-12">No Ball</Button>
          </div>
        </CardContent>
      </Card>

      {/* New Batsman Dialog */}
      <Dialog open={showBatsmanDialog} onOpenChange={setShowBatsmanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select New Batsman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">New batsman selection</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
