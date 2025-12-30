'use client'

import { use, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMatch } from '@/actions/matches'
import { recordRuns, recordWicket, recordWide, recordNoBall, undoLastBall } from '@/actions/scoring'
import { changeBowler, selectNewBatsman } from '@/actions/matches'
import { getMatchStats } from '@/actions/stats'
import { calculateStrikeRate } from '@/lib/cricket/stats-calculator'
import { formatOvers } from '@/lib/cricket/rules'
import { MatchScorecard } from '@/components/scorecard/MatchScorecard'

export default function MatchScoringPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const { data: session } = useSession()
  const [match, setMatch] = useState<any>(null)
  const [battingStats, setBattingStats] = useState<any[]>([])
  const [bowlingStats, setBowlingStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'scorecard' | 'live'>('scorecard')
  const [currentBatsmen, setCurrentBatsmen] = useState<any[]>([])
  const [currentBowler, setCurrentBowler] = useState<any>(null)
  const [showWicketDialog, setShowWicketDialog] = useState(false)
  const [showBowlerDialog, setShowBowlerDialog] = useState(false)
  const [showBatsmanDialog, setShowBatsmanDialog] = useState(false)
  const [showWideDialog, setShowWideDialog] = useState(false)
  const [showNoBallDialog, setShowNoBallDialog] = useState(false)
  const [wicketType, setWicketType] = useState('')
  const [newBowlerId, setNewBowlerId] = useState('')
  const [newBatsmanId, setNewBatsmanId] = useState('')
  const [wideRuns, setWideRuns] = useState(0)
  const [noBallRuns, setNoBallRuns] = useState(0)
  const [strikerIndex, setStrikerIndex] = useState(0)
  const [availableBatsmen, setAvailableBatsmen] = useState<any[]>([])
  const [availableBowlers, setAvailableBowlers] = useState<any[]>([])
  const [previousBalls, setPreviousBalls] = useState(0)
  const [manuallySelectedBowlerId, setManuallySelectedBowlerId] = useState<string | null>(null)
  const [previousInnings, setPreviousInnings] = useState(1)
  const [showInningsSetup, setShowInningsSetup] = useState(false)
  const [newInningsBatsman1, setNewInningsBatsman1] = useState('')
  const [newInningsBatsman2, setNewInningsBatsman2] = useState('')
  const [newInningsBowler, setNewInningsBowler] = useState('')

  const fetchMatchData = async (skipOverCheck = false) => {
    const matchResult = await getMatch(matchId)
    const statsResult = await getMatchStats(matchId) as any

    if (matchResult.success && matchResult.data) {
      const matchData = matchResult.data

      // Check if innings changed (new innings started)
      if (previousInnings !== matchData.current_innings) {
        setPreviousInnings(matchData.current_innings)

        // Check if there are any batsmen for this innings
        const batsmenInThisInnings = statsResult.success
          ? (statsResult.data.batting || []).filter((s: any) => s.innings_number === matchData.current_innings)
          : []

        // If no batsmen yet, show innings setup dialog
        if (batsmenInThisInnings.length === 0) {
          setShowInningsSetup(true)
        }
      }

      const isFirstInnings = matchData.current_innings === 1
      const currentBalls = isFirstInnings ? matchData.team1_balls : matchData.team2_balls

      // Check if over just completed - only during polling, not after user actions
      if (!skipOverCheck) {
        // If balls went from non-zero to 0, an over just completed
        if (previousBalls > 0 && currentBalls === 0) {
          // Rotate strike at end of over
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          // Auto-prompt for next bowler
          setShowBowlerDialog(true)
        }
      }

      // Always update previousBalls to keep state in sync
      setPreviousBalls(currentBalls)
      setMatch(matchData)

      // Get available players
      const battingTeamId = isFirstInnings ? matchData.team1_id : matchData.team2_id
      const bowlingTeamId = isFirstInnings ? matchData.team2_id : matchData.team1_id

      // Get batting team players who haven't batted yet or are not out
      if (matchData.team1 && matchData.team2) {
        const battingTeam = isFirstInnings ? matchData.team1 : matchData.team2
        const bowlingTeam = isFirstInnings ? matchData.team2 : matchData.team1

        setAvailableBatsmen(battingTeam.team_players || [])
        setAvailableBowlers(bowlingTeam.team_players || [])
      }
    }

    if (statsResult.success) {
      setBattingStats(statsResult.data.batting || [])
      setBowlingStats(statsResult.data.bowling || [])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchMatchData()
    // Auto-refresh every 500ms for more instant updates
    const interval = setInterval(fetchMatchData, 500)
    return () => clearInterval(interval)
  }, [matchId])

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
      // If a bowler was manually selected, use them
      if (manuallySelectedBowlerId) {
        const selectedBowler = bowlingStats.find(
          (s: any) =>
            s.team_player_id === manuallySelectedBowlerId &&
            s.innings_number === match.current_innings
        )
        if (selectedBowler) {
          setCurrentBowler(selectedBowler)
          return
        }
      }

      // Find the bowler who bowled the most recent ball in current innings
      const currentInningsBalls = match.balls?.filter(
        (b: any) => b.innings_number === match.current_innings
      ) || []

      if (currentInningsBalls.length > 0) {
        // Sort by over and ball number to get most recent
        const sortedBalls = currentInningsBalls.sort((a: any, b: any) => {
          if (a.over_number !== b.over_number) return b.over_number - a.over_number
          return b.ball_number - a.ball_number
        })

        const lastBall = sortedBalls[0]
        const activeBowler = bowlingStats.find(
          (s: any) =>
            s.team_player_id === lastBall.bowler_id &&
            s.innings_number === match.current_innings
        )
        setCurrentBowler(activeBowler)
      } else {
        // No balls yet, find any bowler with stats
        const activeBowler = bowlingStats.find(
          (s: any) => s.innings_number === match.current_innings
        )
        setCurrentBowler(activeBowler)
      }
    }
  }, [bowlingStats, match, manuallySelectedBowlerId])

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
      <div className="min-h-screen bg-white px-4 py-6">
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} />
      </div>
    )
  }

  // Check if current user is the match creator
  const isCreator = session?.user?.id === match.created_by

  // For live matches, show scorecard view by default, with option to score for creator
  if (match.status === 'live' && viewMode === 'scorecard') {
    // Auto-refresh scorecard for live matches - already handled by useEffect polling
    return (
      <div className="min-h-screen bg-white px-4 py-6">
        {isCreator && (
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setViewMode('live')} variant="default">
              Live Scoring Mode
            </Button>
          </div>
        )}
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} />
      </div>
    )
  }

  // Only the creator can access live scoring controls
  if (match.status === 'live' && !isCreator) {
    return (
      <div className="min-h-screen bg-white px-4 py-6">
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} />
      </div>
    )
  }

  const handleRecordRuns = async (runs: number) => {
    if (currentBatsmen.length < 1) {
      alert('Need at least 1 batsman to start scoring')
      return
    }
    if (!currentBowler) {
      alert('Need a bowler to start scoring')
      return
    }

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    await recordRuns({
      matchId,
      runs,
      batsmanId: striker.team_player_id,
      nonStrikerId: nonStriker?.team_player_id || striker.team_player_id, // Use same batsman if only 1
      bowlerId: currentBowler.team_player_id,
    })

    // Clear manually selected bowler since they've now bowled
    setManuallySelectedBowlerId(null)

    // Rotate strike on odd runs (1, 3, 5) - only if there are 2 batsmen
    if (runs % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }

    await fetchMatchData(true) // Skip over check to avoid race condition
  }

  const handleWicket = async () => {
    if (!wicketType || currentBatsmen.length < 1 || !currentBowler) return

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    await recordWicket({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
      bowlerId: currentBowler.team_player_id,
      wicketType: wicketType as any,
    })

    // Clear manually selected bowler since they've now bowled
    setManuallySelectedBowlerId(null)

    setShowWicketDialog(false)
    setWicketType('')

    // Check if there are more batsmen available
    const isRetiredHurt = wicketType === 'retired_hurt'
    const totalPlayersInTeam = availableBatsmen.length

    // Count how many batsmen have already batted (including the one just out)
    const batsmenWhoHaveBatted = battingStats.filter(
      (stat: any) => stat.innings_number === match.current_innings
    ).length

    // Count retired hurt players who can return
    const retiredHurtPlayers = battingStats.filter(
      (stat: any) =>
        stat.innings_number === match.current_innings &&
        stat.dismissal_type === 'retired_hurt' &&
        stat.is_out
    ).length

    // Available batsmen = total players - batsmen who batted + retired hurt (they can return)
    const availableBatsmenCount = totalPlayersInTeam - batsmenWhoHaveBatted + retiredHurtPlayers + (isRetiredHurt ? 1 : 0)

    // Only prompt for new batsman if there are batsmen available
    if (availableBatsmenCount > 0) {
      setShowBatsmanDialog(true)
    }

    await fetchMatchData(true) // Skip over check to avoid race condition
  }

  const handleWideClick = () => {
    setShowWideDialog(true)
  }

  const handleWide = async (additionalRuns: number) => {
    if (currentBatsmen.length < 1 || !currentBowler) return

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    await recordWide({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
      bowlerId: currentBowler.team_player_id,
      additionalRuns,
    })

    // Clear manually selected bowler since they've now bowled
    setManuallySelectedBowlerId(null)

    // Rotate strike on odd additional runs (1, 3) - only if there are 2 batsmen
    if (additionalRuns % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }

    setShowWideDialog(false)
    await fetchMatchData(true) // Skip over check to avoid race condition
  }

  const handleNoBallClick = () => {
    setShowNoBallDialog(true)
  }

  const handleNoBall = async (additionalRuns: number) => {
    if (currentBatsmen.length < 1 || !currentBowler) return

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    await recordNoBall({
      matchId,
      batsmanId: striker.team_player_id,
      nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
      bowlerId: currentBowler.team_player_id,
      additionalRuns,
    })

    // Clear manually selected bowler since they've now bowled
    setManuallySelectedBowlerId(null)

    // Rotate strike on odd additional runs (1, 3) - only if there are 2 batsmen
    if (additionalRuns % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }

    setShowNoBallDialog(false)
    await fetchMatchData(true) // Skip over check to avoid race condition
  }

  const handleUndo = async () => {
    const result = await undoLastBall(matchId)
    if (result.success) {
      await fetchMatchData(true) // Skip over check to avoid race condition
    } else {
      alert(result.error || 'Failed to undo')
    }
  }

  const handleSwapStrike = () => {
    if (currentBatsmen.length === 2) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }
  }

  const isFirstInnings = match.current_innings === 1
  const currentScore = isFirstInnings ? match.team1_score : match.team2_score
  const currentWickets = isFirstInnings ? match.team1_wickets : match.team2_wickets
  const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs
  const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls

  const battingTeam = isFirstInnings ? match.team1 : match.team2
  const bowlingTeam = isFirstInnings ? match.team2 : match.team1

  // Calculate current run rate
  const totalBalls = currentOvers * 6 + currentBalls
  const currentRunRate = totalBalls > 0 ? ((currentScore / totalBalls) * 6).toFixed(2) : '0.00'

  // Get recent balls
  const recentBalls = match.balls
    ?.filter((b: any) => b.innings_number === match.current_innings)
    ?.sort((a: any, b: any) => {
      if (a.over_number !== b.over_number) return b.over_number - a.over_number
      return b.ball_number - a.ball_number
    })
    ?.slice(0, 12)
    ?.reverse() || []

  return (
    <div className="min-h-screen bg-white">
      {/* View Mode Toggle */}
      <div className="bg-white border-b px-4 py-2 flex justify-end">
        <Button onClick={() => setViewMode('scorecard')} variant="outline" size="sm">
          View Scorecard
        </Button>
      </div>

      {/* Score Header */}
      <div className="bg-white border-b px-4 max-sm:px-2 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl font-bold max-sm:text-2xl">
            {battingTeam?.name?.substring(0, 3).toUpperCase() || 'TM'} {currentScore}-{currentWickets}
          </h1>
          <span className="text-2xl text-gray-600 max-sm:text-lg">({formatOvers(currentOvers, currentBalls)})</span>
          <span className="ml-auto text-lg text-gray-600 max-sm:text-base">CRR: {currentRunRate}</span>
        </div>
        <p className="text-red-600 mt-2 text-sm font-medium max-sm:text-xs">
          {bowlingTeam?.name || 'Opponent'} opt to bowl
        </p>
        {match.target && (
          <p className="text-sm text-gray-600 mt-1 max-sm:text-xs">
            Target: {match.target} | Need {match.target - currentScore} runs from {match.total_overs * 6 - totalBalls} balls
          </p>
        )}
      </div>

      {/* Batsmen Table */}
      <div className="px-4 py-4 max-sm:px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="text-left py-2 px-2 font-medium">Batter</th>
              <th className="text-right py-2 px-2 font-medium">R</th>
              <th className="text-right py-2 px-2 font-medium">B</th>
              <th className="text-right py-2 px-2 font-medium">4s</th>
              <th className="text-right py-2 px-2 font-medium">6s</th>
              <th className="text-right py-2 px-2 font-medium">SR</th>
            </tr>
          </thead>
          <tbody>
            {currentBatsmen.map((batsman: any, index: number) => (
              <tr key={batsman.id} className="border-b">
                <td className="py-3 px-2">
                  <span className="text-blue-600 font-medium">
                    {batsman.player?.player_name?.substring(0, 8) || 'Unknown'}
                    {index === strikerIndex && ' *'}
                  </span>
                </td>
                <td className="text-right py-3 px-2 font-semibold">{batsman.runs}</td>
                <td className="text-right py-3 px-2">{batsman.balls_faced}</td>
                <td className="text-right py-3 px-2">{batsman.fours || 0}</td>
                <td className="text-right py-3 px-2">{batsman.sixes || 0}</td>
                <td className="text-right py-3 px-2">{calculateStrikeRate(batsman.runs, batsman.balls_faced)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentBatsmen.length === 2 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleSwapStrike}
          >
            ⇄ Swap Strike
          </Button>
        )}
      </div>

      {/* Bowlers Table */}
      <div className="px-4 py-4 max-sm:px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="text-left py-2 px-2 font-medium">Bowler</th>
              <th className="text-right py-2 px-2 font-medium">O</th>
              <th className="text-right py-2 px-2 font-medium">M</th>
              <th className="text-right py-2 px-2 font-medium">R</th>
              <th className="text-right py-2 px-2 font-medium">W</th>
              <th className="text-right py-2 px-2 font-medium">ECO</th>
            </tr>
          </thead>
          <tbody>
            {bowlingStats
              .filter((b: any) => b.innings_number === match.current_innings)
              .map((bowler: any) => {
                const isCurrentBowler = currentBowler?.team_player_id === bowler.team_player_id
                return (
                  <tr key={bowler.id} className="border-b">
                    <td className="py-3 px-2">
                      <span className="text-blue-600 font-medium">
                        {bowler.player?.player_name || 'Unknown'}
                        {isCurrentBowler && ' *'}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">{formatOvers(bowler.overs, bowler.balls_bowled % 6)}</td>
                    <td className="text-right py-3 px-2">0</td>
                    <td className="text-right py-3 px-2 font-semibold">{bowler.runs_conceded}</td>
                    <td className="text-right py-3 px-2 font-semibold">{bowler.wickets}</td>
                    <td className="text-right py-3 px-2">{bowler.economy_rate?.toFixed(2) || '0.00'}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
        {currentBowler && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setShowBowlerDialog(true)}
          >
            Change Bowler
          </Button>
        )}
      </div>

      {/* Recent Balls */}
      {recentBalls.length > 0 && (
        <div className="px-4 py-4 border-t max-sm:px-0">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Recent:</span>
          </p>
          <div className="flex gap-2 flex-wrap text-sm">
            {recentBalls.map((ball: any, idx: number) => {
              let display = ''
              if (ball.ball_type === 'wide') display = 'Wd'
              else if (ball.ball_type === 'noball') display = 'Nb'
              else if (ball.ball_type === 'wicket') display = 'W'
              else display = ball.runs_scored.toString()

              if (ball.extras && ball.runs_scored > 0) {
                display += `+${ball.runs_scored}`
              }

              return (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded ${
                    ball.ball_type === 'wicket'
                      ? 'bg-red-100 text-red-700'
                      : ball.runs_scored === 4 || ball.runs_scored === 6
                      ? 'bg-green-100 text-green-700'
                      : ball.ball_type === 'wide' || ball.ball_type === 'noball'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {display}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Scoring Buttons - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="px-3 py-2">
          {/* Undo button */}
          <div className="mb-2">
            <Button
              onClick={handleUndo}
              variant="outline"
              className="w-full h-9 text-sm"
              disabled={!match.balls || match.balls.filter((b: any) => b.innings_number === match.current_innings).length === 0}
            >
              ↶ Undo Last Ball
            </Button>
          </div>

          <div className="grid grid-cols-6 gap-1.5 mb-1.5">
            {[0, 1, 2, 3, 4, 6].map((runs) => (
              <Button
                key={runs}
                onClick={() => handleRecordRuns(runs)}
                className="h-11 text-lg font-bold"
                variant={runs === 4 || runs === 6 ? 'default' : 'outline'}
              >
                {runs}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="h-10 text-sm">Wicket</Button>
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
                      <SelectItem value="retired_hurt">Retired Hurt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleWicket} className="w-full" disabled={!wicketType}>
                    Confirm Wicket
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleWideClick} variant="outline" className="h-10 text-sm">Wide</Button>
            <Button onClick={handleNoBallClick} variant="outline" className="h-10 text-sm">No Ball</Button>
          </div>
        </div>
      </div>

      {/* Add padding at bottom to prevent content being hidden by fixed buttons */}
      <div className="h-32"></div>

      {/* Wide Dialog */}
      <Dialog open={showWideDialog} onOpenChange={setShowWideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Wide + Additional Runs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">Select additional runs scored on this wide delivery:</p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((runs) => (
                <Button
                  key={runs}
                  onClick={() => handleWide(runs)}
                  className="h-12 sm:h-14 text-base sm:text-xl font-bold"
                  variant="outline"
                >
                  {runs === 0 ? 'Wd' : `Wd+${runs}`}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500">Wide = 1 run penalty + additional runs<br/>No runs to batsman</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* No Ball Dialog */}
      <Dialog open={showNoBallDialog} onOpenChange={setShowNoBallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">No Ball + Runs Off Bat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">Select runs scored off the bat on this no ball:</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((runs) => (
                <Button
                  key={runs}
                  onClick={() => handleNoBall(runs)}
                  className="h-12 sm:h-14 text-base sm:text-xl font-bold"
                  variant="outline"
                >
                  {runs === 0 ? 'Nb' : `Nb+${runs}`}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleNoBall(4)}
                className="h-12 sm:h-14 text-base sm:text-xl font-bold"
                variant="default"
              >
                Nb+4
              </Button>
              <Button
                onClick={() => handleNoBall(6)}
                className="h-12 sm:h-14 text-base sm:text-xl font-bold"
                variant="default"
              >
                Nb+6
              </Button>
            </div>
            <p className="text-xs text-gray-500">No Ball = 1 run penalty + runs off bat<br/>Batsman gets runs off bat only</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Batsman Dialog */}
      <Dialog open={showBatsmanDialog} onOpenChange={setShowBatsmanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select New Batsman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newBatsmanId} onValueChange={setNewBatsmanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select batsman" />
              </SelectTrigger>
              <SelectContent>
                {/* Retired hurt players first */}
                {battingStats
                  .filter(
                    (stat: any) =>
                      stat.innings_number === match.current_innings &&
                      stat.dismissal_type === 'retired_hurt' &&
                      stat.is_out
                  )
                  .map((stat: any) => (
                    <SelectItem key={stat.team_player_id} value={stat.team_player_id}>
                      {stat.player?.player_name || 'Unknown'} (Retired Hurt - Can Return)
                    </SelectItem>
                  ))}
                {/* Fresh batsmen */}
                {availableBatsmen
                  .filter((player: any) => {
                    // Exclude batsmen who are already batting or out (except retired hurt)
                    const existingStat = battingStats.find(
                      (stat: any) =>
                        stat.team_player_id === player.id &&
                        stat.innings_number === match.current_innings
                    )
                    if (!existingStat) return true // Fresh player
                    // Allow if retired hurt
                    return existingStat.dismissal_type === 'retired_hurt' && existingStat.is_out
                  })
                  .map((player: any) => {
                    const isRetiredHurt = battingStats.some(
                      (stat: any) =>
                        stat.team_player_id === player.id &&
                        stat.innings_number === match.current_innings &&
                        stat.dismissal_type === 'retired_hurt'
                    )
                    if (isRetiredHurt) return null // Already shown above
                    return (
                      <SelectItem key={player.id} value={player.id}>
                        {player.player_name}
                      </SelectItem>
                    )
                  })
                  .filter(Boolean)}
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                if (newBatsmanId) {
                  // Check if this is a retired hurt player returning
                  const retiredHurtStat = battingStats.find(
                    (stat: any) =>
                      stat.team_player_id === newBatsmanId &&
                      stat.innings_number === match.current_innings &&
                      stat.dismissal_type === 'retired_hurt'
                  )

                  if (retiredHurtStat) {
                    // Mark them as not out anymore (they're back)
                    await selectNewBatsman(matchId, newBatsmanId, match.current_innings)
                  } else {
                    // Fresh batsman
                    await selectNewBatsman(matchId, newBatsmanId, match.current_innings)
                  }

                  setShowBatsmanDialog(false)
                  setNewBatsmanId('')
                  await fetchMatchData(true) // Skip over check to avoid race condition

                  // New batsman takes strike - set striker to the new batsman's position
                  // The new batsman will be at index 1 (since striker who got out was at strikerIndex)
                  // Wait a bit for the data to refresh, then swap strike to new batsman
                  setTimeout(() => {
                    setStrikerIndex(1)
                  }, 100)
                }
              }}
              className="w-full"
              disabled={!newBatsmanId}
            >
              Confirm Batsman
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bowler Change Dialog */}
      <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select New Bowler</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newBowlerId} onValueChange={setNewBowlerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bowler" />
              </SelectTrigger>
              <SelectContent>
                {availableBowlers.map((player: any) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.player_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                if (newBowlerId) {
                  await changeBowler(matchId, newBowlerId, match.current_innings)
                  setManuallySelectedBowlerId(newBowlerId)
                  setShowBowlerDialog(false)
                  setNewBowlerId('')
                  await fetchMatchData(true) // Skip over check to avoid race condition
                }
              }}
              className="w-full"
              disabled={!newBowlerId}
            >
              Confirm Bowler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Innings Setup Dialog */}
      <Dialog open={showInningsSetup} onOpenChange={setShowInningsSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Innings {match?.current_innings}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">First Opening Batsman</label>
              <Select value={newInningsBatsman1} onValueChange={setNewInningsBatsman1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first batsman" />
                </SelectTrigger>
                <SelectContent>
                  {availableBatsmen.map((player: any) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Second Opening Batsman</label>
              <Select value={newInningsBatsman2} onValueChange={setNewInningsBatsman2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second batsman" />
                </SelectTrigger>
                <SelectContent>
                  {availableBatsmen
                    .filter((player: any) => player.id !== newInningsBatsman1)
                    .map((player: any) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.player_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Opening Bowler</label>
              <Select value={newInningsBowler} onValueChange={setNewInningsBowler}>
                <SelectTrigger>
                  <SelectValue placeholder="Select opening bowler" />
                </SelectTrigger>
                <SelectContent>
                  {availableBowlers.map((player: any) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={async () => {
                if (newInningsBatsman1 && newInningsBatsman2 && newInningsBowler) {
                  // Add opening batsmen
                  await selectNewBatsman(matchId, newInningsBatsman1, match.current_innings)
                  await selectNewBatsman(matchId, newInningsBatsman2, match.current_innings)

                  // Add opening bowler
                  await changeBowler(matchId, newInningsBowler, match.current_innings)
                  setManuallySelectedBowlerId(newInningsBowler)

                  // Reset and close
                  setShowInningsSetup(false)
                  setNewInningsBatsman1('')
                  setNewInningsBatsman2('')
                  setNewInningsBowler('')
                  setStrikerIndex(0)

                  await fetchMatchData(true) // Skip over check to avoid race condition
                }
              }}
              className="w-full"
              disabled={!newInningsBatsman1 || !newInningsBatsman2 || !newInningsBowler}
            >
              Start Innings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
