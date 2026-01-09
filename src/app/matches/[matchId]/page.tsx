'use client'

import { use, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMatch } from '@/actions/matches'
import { recordRuns, recordWicket, recordWide, recordNoBall, undoLastBall } from '@/actions/scoring'
import { changeBowler, selectNewBatsman } from '@/actions/matches'
import { getMatchStats } from '@/actions/stats'
import { calculateStrikeRate } from '@/lib/cricket/stats-calculator'
import { formatOvers } from '@/lib/cricket/rules'
import { MatchScorecard } from '@/components/scorecard/MatchScorecard'
import {
  loadLocalMatchState,
  saveLocalMatchState,
  initializeLocalMatchState,
  hasLocalMatchState,
  clearLocalMatchState
} from '@/lib/cricket/local-scorer'
import { LocalMatchEngine } from '@/lib/cricket/local-match-engine'
import { completeMatch } from '@/actions/sync'
import { Undo } from 'lucide-react'
import { PlayerAdditionDialog } from '@/components/match/PlayerAdditionDialog'
import { getTeam } from '@/actions/teams'
import { Label } from '@/components/ui/label'

export default function MatchScoringPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const { data: session } = useSession()
  const [match, setMatch] = useState<any>(null)
  const [battingStats, setBattingStats] = useState<any[]>([])
  const [bowlingStats, setBowlingStats] = useState<any[]>([])
  const [balls, setBalls] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'scorecard' | 'live'>('scorecard')
  const [useLocalScoring, setUseLocalScoring] = useState(false)
  const [currentBatsmen, setCurrentBatsmen] = useState<any[]>([])
  const [currentBowler, setCurrentBowler] = useState<any>(null)
  const [showWicketDialog, setShowWicketDialog] = useState(false)
  const [showBowlerDialog, setShowBowlerDialog] = useState(false)
  const [showBatsmanDialog, setShowBatsmanDialog] = useState(false)
  const [showWideDialog, setShowWideDialog] = useState(false)
  const [showNoBallDialog, setShowNoBallDialog] = useState(false)
  const [showRetireHurtDialog, setShowRetireHurtDialog] = useState(false)
  const [wicketType, setWicketType] = useState('')
  const [newBowlerId, setNewBowlerId] = useState('')
  const [newBatsmanId, setNewBatsmanId] = useState('')
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

  // Player addition dialog state
  const [showPlayerAddition, setShowPlayerAddition] = useState(false)
  const [playerAdditionContext, setPlayerAdditionContext] = useState<{
    role: 'batsman' | 'bowler'
    teamId: string
    teamName: string
  } | null>(null)

  // Flag to handle over completion after batsman selection
  const [overCompletedDuringWicket, setOverCompletedDuringWicket] = useState(false)

  // Check if match is complete and auto-sync
  const checkAndCompleteMatch = async () => {
    console.log('=== checkAndCompleteMatch CALLED ===')

    // Check localStorage directly instead of relying on state variable
    const localState = loadLocalMatchState(matchId)
    if (!localState) {
      console.log('No local state found, skipping match completion check')
      return
    }

    const { match: localMatch } = localState
    const isFirstInnings = localMatch.current_innings === 1
    const currentOvers = isFirstInnings ? localMatch.team1_overs : localMatch.team2_overs
    const currentWickets = isFirstInnings ? localMatch.team1_wickets : localMatch.team2_wickets
    const currentScore = isFirstInnings ? localMatch.team1_score : localMatch.team2_score

    // Get the batting team's total players for all-out check
    const battingTeam = isFirstInnings ? localMatch.team1 : localMatch.team2
    const totalBattingPlayers = battingTeam?.team_players?.length || 0

    console.log('Match completion check:', {
      innings: localMatch.current_innings,
      isFirstInnings,
      currentOvers,
      totalOvers: localMatch.total_overs,
      currentWickets,
      totalBattingPlayers,
      currentScore,
      team1_score: localMatch.team1_score,
      team2_score: localMatch.team2_score
    })

    let isMatchComplete = false
    let resultText = ''

    // Check if innings complete (all overs bowled OR all batsmen out)
    if (currentOvers >= localMatch.total_overs || currentWickets >= totalBattingPlayers) {
      console.log('Innings complete detected!')
      if (localMatch.current_innings === 1) {
        console.log('First innings complete, transitioning to innings 2')
        // First innings complete, start second innings
        localMatch.current_innings = 2
        localMatch.target = (isFirstInnings ? localMatch.team1_score : localMatch.team2_score) + 1
        saveLocalMatchState(matchId, localState)

        // Reload data to trigger innings setup dialog
        await fetchMatchData(true)
        return
      } else {
        console.log('Second innings complete - MATCH OVER')
        // Second innings complete - match over
        isMatchComplete = true

        // Determine which team batted in which innings by checking batting stats
        const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)

        let team1BattedInnings1 = false
        if (innings1Batsmen.length > 0) {
          const innings1BatsmanId = innings1Batsmen[0].team_player_id
          team1BattedInnings1 = localMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
        }

        const team1Name = localMatch.team1?.name || 'Team 1'
        const team2Name = localMatch.team2?.name || 'Team 2'
        const team1Score = team1BattedInnings1 ? localMatch.team1_score : localMatch.team2_score
        const team2Score = team1BattedInnings1 ? localMatch.team2_score : localMatch.team1_score
        const team2Wickets = team1BattedInnings1 ? localMatch.team2_wickets : localMatch.team1_wickets
        const battingFirstTeam = team1BattedInnings1 ? team1Name : team2Name
        const battingSecondTeam = team1BattedInnings1 ? team2Name : team1Name

        // Get the total players of the team that batted second for wickets calculation
        const battingSecondTeamData = team1BattedInnings1 ? localMatch.team2 : localMatch.team1
        const totalBattingSecondPlayers = battingSecondTeamData?.team_players?.length || 0

        if (team2Score > team1Score) {
          const wicketsRemaining = totalBattingSecondPlayers - team2Wickets
          resultText = `${battingSecondTeam} won by ${wicketsRemaining} wickets`
        } else if (team1Score > team2Score) {
          resultText = `${battingFirstTeam} won by ${team1Score - team2Score} runs`
        } else {
          resultText = 'Match tied'
        }
      }
    }

    // Check if target chased in innings 2
    if (localMatch.current_innings === 2) {
      const innings1Score = isFirstInnings ? localMatch.team2_score : localMatch.team1_score

      if (currentScore > innings1Score) {
        isMatchComplete = true

        // Determine which team is batting in innings 2
        const innings2Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 2)
        let team2BattingInInnings2 = false
        if (innings2Batsmen.length > 0) {
          const innings2BatsmanId = innings2Batsmen[0].team_player_id
          team2BattingInInnings2 = localMatch.team2.team_players?.some((p: any) => p.id === innings2BatsmanId)
        }

        const chasingTeam = team2BattingInInnings2 ? localMatch.team2?.name : localMatch.team1?.name
        const chasingTeamData = team2BattingInInnings2 ? localMatch.team2 : localMatch.team1
        const totalChasingPlayers = chasingTeamData?.team_players?.length || 0
        const wicketsRemaining = totalChasingPlayers - currentWickets
        resultText = `${chasingTeam} won by ${wicketsRemaining} wickets`
      }
    }

    // Auto-sync if match complete
    if (isMatchComplete) {
      console.log('MATCH IS COMPLETE! Winner:', resultText)
      console.log('Calling completeMatch API...')

      const result = await completeMatch(
        matchId,
        {
          match: localState.match,
          battingStats: localState.battingStats,
          bowlingStats: localState.bowlingStats,
          balls: localState.balls
        },
        resultText
      )

      console.log('completeMatch result:', result)

      if (result.success) {
        console.log('Match completed successfully! Clearing localStorage and reloading...')
        clearLocalMatchState(matchId)
        setUseLocalScoring(false)
        alert('Match completed! ' + resultText)
        window.location.reload()
      } else {
        console.error('Failed to complete match:', result.error)
        alert('Error completing match: ' + (result.error || 'Unknown error'))
      }
    } else {
      console.log('Match NOT complete yet, isMatchComplete =', isMatchComplete)
    }
  }

  // Handle player added callback
  const handlePlayerAdded = async (playerId: string, playerName: string) => {
    console.log('Player added:', playerId, playerName)

    // Close addition dialog
    setShowPlayerAddition(false)

    // Update local state with new player
    const teamId = playerAdditionContext!.teamId
    await syncNewPlayerToLocalState(teamId, playerId)

    // Auto-select newly added player
    if (playerAdditionContext!.role === 'batsman') {
      setNewBatsmanId(playerId)
    } else {
      setNewBowlerId(playerId)
    }

    // Refresh available players
    await fetchMatchData()
  }

  // Sync new player to localStorage (if local scoring)
  const syncNewPlayerToLocalState = async (teamId: string, playerId: string) => {
    if (!useLocalScoring) return

    const localState = loadLocalMatchState(matchId)
    if (!localState) return

    // Fetch updated team data
    const teamResult = await getTeam(teamId)

    if (teamResult.success && teamResult.data) {
      const newPlayer = teamResult.data.players.find((p: any) => p.id === playerId)
      if (!newPlayer) return

      // Add to correct team in local state
      const team = localState.match.team1_id === teamId
        ? localState.match.team1
        : localState.match.team2

      if (!team.team_players.find((p: any) => p.id === playerId)) {
        team.team_players.push(newPlayer)
        saveLocalMatchState(matchId, localState)
      }
    }
  }

  // Ensure player exists before engine operation
  const ensurePlayerInLocalState = async (playerId: string, teamId: string) => {
    if (!useLocalScoring) return

    const localState = loadLocalMatchState(matchId)
    if (!localState) return

    const team = localState.match.team1_id === teamId
      ? localState.match.team1
      : localState.match.team2

    if (!team.team_players.find((p: any) => p.id === playerId)) {
      await syncNewPlayerToLocalState(teamId, playerId)
    }
  }

  const fetchMatchData = async (skipOverCheck = false) => {
    // Check if we're using local scoring
    const hasLocal = hasLocalMatchState(matchId)

    // If localStorage exists, prioritize it regardless of useLocalScoring state
    if (hasLocal) {
      // Enable local scoring mode
      if (!useLocalScoring) {
        setUseLocalScoring(true)
      }

      // Load from localStorage - instant, no database calls
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: matchData, battingStats: localBattingStats, bowlingStats: localBowlingStats, balls: localBalls } = localState

        // Check if innings changed
        if (previousInnings !== matchData.current_innings) {
          setPreviousInnings(matchData.current_innings)

          const batsmenInThisInnings = localBattingStats.filter((s: any) => s.innings_number === matchData.current_innings)
          if (batsmenInThisInnings.length === 0) {
            setShowInningsSetup(true)
          }
        }

        const isFirstInnings = matchData.current_innings === 1
        const currentBalls = isFirstInnings ? matchData.team1_balls : matchData.team2_balls

        if (!skipOverCheck) {
          if (previousBalls > 0 && currentBalls === 0) {
            setStrikerIndex(prev => prev === 0 ? 1 : 0)
            setShowBowlerDialog(true)
            // Clear manually selected bowler when over completes
            setManuallySelectedBowlerId(null)
          }
        }

        setPreviousBalls(currentBalls)
        // Attach balls to match object so commentary can display - CREATE NEW OBJECT for React to detect change
        setMatch({ ...matchData, balls: localBalls })
        setBattingStats(localBattingStats)
        setBowlingStats(localBowlingStats)

        if (matchData.team1 && matchData.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = localBattingStats.filter((s: any) => s.innings_number === matchData.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = matchData.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? matchData.team1 : matchData.team2
            bowlingTeam = isTeam1Batting ? matchData.team2 : matchData.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (matchData.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localBattingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = matchData.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? matchData.team2 : matchData.team1
                bowlingTeam = isTeam1BattedFirst ? matchData.team1 : matchData.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = matchData.team2
                bowlingTeam = matchData.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = matchData.team1
              bowlingTeam = matchData.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }

        setIsLoading(false)

        // Check if match/innings is complete on load
        console.log('Calling checkAndCompleteMatch from localStorage load path...')
        await checkAndCompleteMatch()

        return
      }
    }

    // Fetch from database (for non-creator viewers or initial load)
    const matchResult = await getMatch(matchId)
    const statsResult = await getMatchStats(matchId) as any

    if (matchResult.success && matchResult.data) {
      const matchData = matchResult.data

      // Check if innings changed
      if (previousInnings !== matchData.current_innings) {
        setPreviousInnings(matchData.current_innings)

        const batsmenInThisInnings = statsResult.success
          ? (statsResult.data.batting || []).filter((s: any) => s.innings_number === matchData.current_innings)
          : []

        if (batsmenInThisInnings.length === 0) {
          setShowInningsSetup(true)
        }
      }

      const isFirstInnings = matchData.current_innings === 1
      const currentBalls = isFirstInnings ? matchData.team1_balls : matchData.team2_balls

      if (!skipOverCheck) {
        if (previousBalls > 0 && currentBalls === 0) {
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          setShowBowlerDialog(true)
          // Clear manually selected bowler when over completes
          setManuallySelectedBowlerId(null)
        }
      }

      setPreviousBalls(currentBalls)
      setMatch(matchData)

      if (statsResult.success) {
        // Enrich batting stats with player data - ALWAYS ensure player object exists
        const enrichedBattingStats = (statsResult.data.batting || []).map((stat: any) => {
          if (!stat.player || !stat.player.player_name) {
            const isFirstInnings = stat.innings_number === 1
            const battingTeam = isFirstInnings ? matchData.team1 : matchData.team2
            const playerData = battingTeam.team_players?.find((p: any) => p.id === stat.team_player_id)
            return {
              ...stat,
              player: playerData ? { player_name: playerData.player_name } : stat.player
            }
          }
          return stat
        })

        // Enrich bowling stats with player data - ALWAYS ensure player object exists
        const enrichedBowlingStats = (statsResult.data.bowling || []).map((stat: any) => {
          if (!stat.player || !stat.player.player_name) {
            const isFirstInnings = stat.innings_number === 1
            const bowlingTeam = isFirstInnings ? matchData.team2 : matchData.team1
            const playerData = bowlingTeam.team_players?.find((p: any) => p.id === stat.team_player_id)
            return {
              ...stat,
              player: playerData ? { player_name: playerData.player_name } : stat.player
            }
          }
          return stat
        })

        // Set enriched stats in React state
        setBattingStats(enrichedBattingStats)
        setBowlingStats(enrichedBowlingStats)
        setBalls(statsResult.data.balls || [])

        // Determine and set available players for correct teams
        if (matchData.team1 && matchData.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = enrichedBattingStats.filter((s: any) => s.innings_number === matchData.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = matchData.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? matchData.team1 : matchData.team2
            bowlingTeam = isTeam1Batting ? matchData.team2 : matchData.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (matchData.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = enrichedBattingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = matchData.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? matchData.team2 : matchData.team1
                bowlingTeam = isTeam1BattedFirst ? matchData.team1 : matchData.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = matchData.team2
                bowlingTeam = matchData.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = matchData.team1
              bowlingTeam = matchData.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }

        // Initialize localStorage for creator on first load
        if (session?.user?.id === matchData.created_by && matchData.status === 'live') {
          const hasLocal = hasLocalMatchState(matchId)
          if (!hasLocal) {
            initializeLocalMatchState(
              matchId,
              matchData,
              enrichedBattingStats,
              enrichedBowlingStats,
              matchData.balls || []
            )
          }
          // Always enable local scoring for creator with live match
          setUseLocalScoring(true)

          // Check if match/innings is complete
          console.log('Calling checkAndCompleteMatch from database load path...')
          await checkAndCompleteMatch()
        }
      }
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchMatchData()

    // Only poll database if not using local scoring
    if (!useLocalScoring) {
      const interval = setInterval(fetchMatchData, 2000)
      return () => clearInterval(interval)
    }
  }, [matchId, useLocalScoring])

  useEffect(() => {
    if (battingStats && match) {
      const activeBatsmen = battingStats.filter(
        (s: any) => !s.is_out && s.innings_number === match.current_innings
      )

      // ALWAYS sort by team_player_id to maintain consistent order
      const sortedBatsmen = activeBatsmen.sort((a: any, b: any) => {
        return a.team_player_id.localeCompare(b.team_player_id)
      }).slice(0, 2)

      setCurrentBatsmen(sortedBatsmen)
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
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} balls={balls} />
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
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} balls={balls} />
      </div>
    )
  }

  // Only the creator can access live scoring controls
  if (match.status === 'live' && !isCreator) {
    return (
      <div className="min-h-screen bg-white px-4 py-6">
        <MatchScorecard match={match} battingStats={battingStats} bowlingStats={bowlingStats} balls={balls} />
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

    if (useLocalScoring) {
      // Use local engine for instant updates
      const engine = new LocalMatchEngine(matchId)
      engine.recordRuns(
        runs,
        striker.team_player_id,
        nonStriker?.team_player_id || striker.team_player_id,
        currentBowler.team_player_id
      )

      // Check if match complete and auto-sync FIRST
      await checkAndCompleteMatch()

      // INSTANT refresh from localStorage - no async, no await
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: newMatch, balls: localBalls } = localState

        // If innings changed (first innings completed), skip over check and just update state
        if (newMatch.current_innings !== match.current_innings) {
          setMatch({ ...newMatch, balls: localBalls })
          setBattingStats(localState.battingStats)
          setBowlingStats(localState.bowlingStats)
          return
        }

        const isFirstInnings = newMatch.current_innings === 1
        const currentBalls = isFirstInnings ? newMatch.team1_balls : newMatch.team2_balls
        const currentOvers = isFirstInnings ? newMatch.team1_overs : newMatch.team2_overs
        const currentWickets = isFirstInnings ? newMatch.team1_wickets : newMatch.team2_wickets

        // Get total players in batting team for all-out check
        const battingTeamForCheck = isFirstInnings ? newMatch.team1 : newMatch.team2
        const totalBattingPlayersForCheck = battingTeamForCheck?.team_players?.length || 0

        console.log('Over check - previousBalls:', previousBalls, 'currentBalls:', currentBalls)

        // Check if innings complete - if so, don't show bowler dialog
        const isInningsComplete = currentOvers >= newMatch.total_overs || currentWickets >= totalBattingPlayersForCheck

        // Check if over just completed (balls reset to 0) AND innings not complete
        if (previousBalls > 0 && currentBalls === 0 && !isInningsComplete) {
          console.log('OVER COMPLETED! Rotating strike and showing bowler dialog')
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          setShowBowlerDialog(true)
          // Clear manually selected bowler when over completes
          setManuallySelectedBowlerId(null)
        }

        setPreviousBalls(currentBalls)
        // Attach balls to match object so commentary displays live - CREATE NEW OBJECT for React to detect change
        const updatedMatch = { ...newMatch, balls: localBalls }
        setMatch(updatedMatch)
        setBattingStats(localState.battingStats)
        setBowlingStats(localState.bowlingStats)

        // Update available players for correct teams
        if (updatedMatch.team1 && updatedMatch.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = localState.battingStats.filter((s: any) => s.innings_number === updatedMatch.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = updatedMatch.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? updatedMatch.team1 : updatedMatch.team2
            bowlingTeam = isTeam1Batting ? updatedMatch.team2 : updatedMatch.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (updatedMatch.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = updatedMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? updatedMatch.team2 : updatedMatch.team1
                bowlingTeam = isTeam1BattedFirst ? updatedMatch.team1 : updatedMatch.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = updatedMatch.team2
                bowlingTeam = updatedMatch.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = updatedMatch.team1
              bowlingTeam = updatedMatch.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }
      }
    } else {
      await recordRuns({
        matchId,
        runs,
        batsmanId: striker.team_player_id,
        nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
        bowlerId: currentBowler.team_player_id,
      })
      await fetchMatchData(true)
    }

    // Rotate strike on odd runs (1, 3, 5) - only if there are 2 batsmen
    if (runs % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }
  }

  const handleWicket = async () => {
    if (!wicketType || currentBatsmen.length < 1 || !currentBowler) return

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    if (useLocalScoring) {
      const engine = new LocalMatchEngine(matchId)
      engine.recordWicket(
        striker.team_player_id,
        nonStriker?.team_player_id || striker.team_player_id,
        currentBowler.team_player_id,
        wicketType as any
      )

      // Check if match complete and auto-sync FIRST
      await checkAndCompleteMatch()

      // INSTANT refresh from localStorage
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: newMatch, balls: localBalls } = localState

        // If innings changed (first innings completed), skip over check and just update state
        if (newMatch.current_innings !== match.current_innings) {
          setMatch({ ...newMatch, balls: localBalls })
          setBattingStats(localState.battingStats)
          setBowlingStats(localState.bowlingStats)
          return
        }

        const isFirstInnings = newMatch.current_innings === 1
        const currentBalls = isFirstInnings ? newMatch.team1_balls : newMatch.team2_balls
        const currentOvers = isFirstInnings ? newMatch.team1_overs : newMatch.team2_overs
        const currentWickets = isFirstInnings ? newMatch.team1_wickets : newMatch.team2_wickets

        // Get total players in batting team for all-out check
        const battingTeamForWicketCheck = isFirstInnings ? newMatch.team1 : newMatch.team2
        const totalBattingPlayersForWicketCheck = battingTeamForWicketCheck?.team_players?.length || 0

        // Check if innings complete - if so, don't show bowler dialog
        const isInningsComplete = currentOvers >= newMatch.total_overs || currentWickets >= totalBattingPlayersForWicketCheck

        // Check if over just completed (balls reset to 0) AND innings not complete
        if (previousBalls > 0 && currentBalls === 0 && !isInningsComplete) {
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          // DON'T show bowler dialog immediately - set flag to show it after batsman is selected
          setOverCompletedDuringWicket(true)
          // Clear manually selected bowler when over completes
          setManuallySelectedBowlerId(null)
        } else {
          setOverCompletedDuringWicket(false)
        }

        setPreviousBalls(currentBalls)
        // Attach balls to match object so commentary displays live - CREATE NEW OBJECT for React to detect change
        const updatedMatch = { ...newMatch, balls: localBalls }
        setMatch(updatedMatch)
        setBattingStats(localState.battingStats)
        setBowlingStats(localState.bowlingStats)

        // Update available players for correct teams
        if (updatedMatch.team1 && updatedMatch.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = localState.battingStats.filter((s: any) => s.innings_number === updatedMatch.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = updatedMatch.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? updatedMatch.team1 : updatedMatch.team2
            bowlingTeam = isTeam1Batting ? updatedMatch.team2 : updatedMatch.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (updatedMatch.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = updatedMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? updatedMatch.team2 : updatedMatch.team1
                bowlingTeam = isTeam1BattedFirst ? updatedMatch.team1 : updatedMatch.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = updatedMatch.team2
                bowlingTeam = updatedMatch.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = updatedMatch.team1
              bowlingTeam = updatedMatch.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }
      }
    } else {
      await recordWicket({
        matchId,
        batsmanId: striker.team_player_id,
        nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
        bowlerId: currentBowler.team_player_id,
        wicketType: wicketType as any,
      })
      await fetchMatchData(true)
    }

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
  }

  const handleRetireHurt = async () => {
    if (currentBatsmen.length < 1 || !currentBowler) return

    const striker = currentBatsmen[strikerIndex] || currentBatsmen[0]
    const nonStriker = currentBatsmen.length > 1
      ? currentBatsmen[strikerIndex === 0 ? 1 : 0]
      : null

    if (useLocalScoring) {
      const engine = new LocalMatchEngine(matchId)
      // Use dedicated retireHurt method (doesn't count as wicket, no ball consumed)
      engine.retireHurt(striker.team_player_id)

      // Refresh from localStorage
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: newMatch, balls: localBalls } = localState

        // If innings changed (first innings completed), skip over check and just update state
        if (newMatch.current_innings !== match.current_innings) {
          setMatch({ ...newMatch, balls: localBalls })
          setBattingStats(localState.battingStats)
          setBowlingStats(localState.bowlingStats)
          return
        }

        const updatedMatch = { ...newMatch, balls: localBalls }
        setMatch(updatedMatch)
        setBattingStats(localState.battingStats)
        setBowlingStats(localState.bowlingStats)

        // Update available players for correct teams
        if (updatedMatch.team1 && updatedMatch.team2) {
          const currentInningsBatsmen = localState.battingStats.filter((s: any) => s.innings_number === updatedMatch.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = updatedMatch.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? updatedMatch.team1 : updatedMatch.team2
            bowlingTeam = isTeam1Batting ? updatedMatch.team2 : updatedMatch.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (updatedMatch.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = updatedMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? updatedMatch.team2 : updatedMatch.team1
                bowlingTeam = isTeam1BattedFirst ? updatedMatch.team1 : updatedMatch.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = updatedMatch.team2
                bowlingTeam = updatedMatch.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = updatedMatch.team1
              bowlingTeam = updatedMatch.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }
      }
    } else {
      // For database mode, still use recordWicket (no local engine available)
      await recordWicket({
        matchId,
        batsmanId: striker.team_player_id,
        nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
        bowlerId: currentBowler.team_player_id,
        wicketType: 'retired_hurt',
      })
      await fetchMatchData(true)
    }

    setShowRetireHurtDialog(false)

    // Always prompt for new batsman
    const totalPlayersInTeam = availableBatsmen.length
    const batsmenWhoHaveBatted = battingStats.filter(
      (stat: any) => stat.innings_number === match.current_innings
    ).length

    const retiredHurtPlayers = battingStats.filter(
      (stat: any) =>
        stat.innings_number === match.current_innings &&
        stat.dismissal_type === 'retired_hurt' &&
        stat.is_out
    ).length

    const availableBatsmenCount = totalPlayersInTeam - batsmenWhoHaveBatted + retiredHurtPlayers + 1

    if (availableBatsmenCount > 0) {
      setShowBatsmanDialog(true)
    }
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

    if (useLocalScoring) {
      const engine = new LocalMatchEngine(matchId)
      engine.recordWide(
        striker.team_player_id,
        nonStriker?.team_player_id || striker.team_player_id,
        currentBowler.team_player_id,
        additionalRuns
      )

      // INSTANT refresh from localStorage
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: newMatch, balls: localBalls } = localState
        const isFirstInnings = newMatch.current_innings === 1
        const currentBalls = isFirstInnings ? newMatch.team1_balls : newMatch.team2_balls

        // Check if over just completed (balls reset to 0)
        if (previousBalls > 0 && currentBalls === 0) {
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          setShowBowlerDialog(true)
          // Clear manually selected bowler when over completes
          setManuallySelectedBowlerId(null)
        }

        setPreviousBalls(currentBalls)
        // Attach balls to match object so commentary displays live - CREATE NEW OBJECT for React to detect change
        const updatedMatch = { ...newMatch, balls: localBalls }
        setMatch(updatedMatch)
        setBattingStats(localState.battingStats)
        setBowlingStats(localState.bowlingStats)

        // Update available players for correct teams
        if (updatedMatch.team1 && updatedMatch.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = localState.battingStats.filter((s: any) => s.innings_number === updatedMatch.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = updatedMatch.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? updatedMatch.team1 : updatedMatch.team2
            bowlingTeam = isTeam1Batting ? updatedMatch.team2 : updatedMatch.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (updatedMatch.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = updatedMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? updatedMatch.team2 : updatedMatch.team1
                bowlingTeam = isTeam1BattedFirst ? updatedMatch.team1 : updatedMatch.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = updatedMatch.team2
                bowlingTeam = updatedMatch.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = updatedMatch.team1
              bowlingTeam = updatedMatch.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }
      }
    } else {
      await recordWide({
        matchId,
        batsmanId: striker.team_player_id,
        nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
        bowlerId: currentBowler.team_player_id,
        additionalRuns,
      })
      await fetchMatchData(true)
    }

    // Rotate strike on odd additional runs (1, 3) - only if there are 2 batsmen
    if (additionalRuns % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }

    setShowWideDialog(false)
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

    if (useLocalScoring) {
      const engine = new LocalMatchEngine(matchId)
      engine.recordNoBall(
        striker.team_player_id,
        nonStriker?.team_player_id || striker.team_player_id,
        currentBowler.team_player_id,
        additionalRuns
      )

      // INSTANT refresh from localStorage
      const localState = loadLocalMatchState(matchId)
      if (localState) {
        const { match: newMatch, balls: localBalls } = localState
        const isFirstInnings = newMatch.current_innings === 1
        const currentBalls = isFirstInnings ? newMatch.team1_balls : newMatch.team2_balls

        // Check if over just completed (balls reset to 0)
        if (previousBalls > 0 && currentBalls === 0) {
          setStrikerIndex(prev => prev === 0 ? 1 : 0)
          setShowBowlerDialog(true)
          // Clear manually selected bowler when over completes
          setManuallySelectedBowlerId(null)
        }

        setPreviousBalls(currentBalls)
        // Attach balls to match object so commentary displays live - CREATE NEW OBJECT for React to detect change
        const updatedMatch = { ...newMatch, balls: localBalls }
        setMatch(updatedMatch)
        setBattingStats(localState.battingStats)
        setBowlingStats(localState.bowlingStats)

        // Update available players for correct teams
        if (updatedMatch.team1 && updatedMatch.team2) {
          // Determine batting team from actual batting stats
          const currentInningsBatsmen = localState.battingStats.filter((s: any) => s.innings_number === updatedMatch.current_innings && !s.is_out)
          let battingTeam, bowlingTeam

          if (currentInningsBatsmen.length > 0) {
            // Find which team the current batsmen belong to
            const batsmanTeamId = currentInningsBatsmen[0].team_player_id
            const isTeam1Batting = updatedMatch.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
            battingTeam = isTeam1Batting ? updatedMatch.team1 : updatedMatch.team2
            bowlingTeam = isTeam1Batting ? updatedMatch.team2 : updatedMatch.team1
          } else {
            // Fallback: determine from first innings batting stats
            if (updatedMatch.current_innings === 2) {
              // Second innings - find who batted in first innings and swap
              const innings1Batsmen = localState.battingStats.filter((s: any) => s.innings_number === 1)
              if (innings1Batsmen.length > 0) {
                const innings1BatsmanId = innings1Batsmen[0].team_player_id
                const isTeam1BattedFirst = updatedMatch.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
                // Swap teams for second innings
                battingTeam = isTeam1BattedFirst ? updatedMatch.team2 : updatedMatch.team1
                bowlingTeam = isTeam1BattedFirst ? updatedMatch.team1 : updatedMatch.team2
              } else {
                // No stats available, default to team2 bats second
                battingTeam = updatedMatch.team2
                bowlingTeam = updatedMatch.team1
              }
            } else {
              // First innings - default to team1
              battingTeam = updatedMatch.team1
              bowlingTeam = updatedMatch.team2
            }
          }

          setAvailableBatsmen(battingTeam.team_players || [])
          setAvailableBowlers(bowlingTeam.team_players || [])
        }
      }
    } else {
      await recordNoBall({
        matchId,
        batsmanId: striker.team_player_id,
        nonStrikerId: nonStriker?.team_player_id || striker.team_player_id,
        bowlerId: currentBowler.team_player_id,
        additionalRuns,
      })
      await fetchMatchData(true)
    }

    // Rotate strike on odd additional runs (1, 3) - only if there are 2 batsmen
    if (additionalRuns % 2 === 1 && currentBatsmen.length > 1) {
      setStrikerIndex(prev => prev === 0 ? 1 : 0)
    }

    setShowNoBallDialog(false)
  }

  const handleUndo = async () => {
    if (useLocalScoring) {
      const engine = new LocalMatchEngine(matchId)
      const result = engine.undoLastBall()
      if (result.success) {
        fetchMatchData(true)
      } else {
        alert(result.error || 'Failed to undo')
      }
    } else {
      const result = await undoLastBall(matchId)
      if (result.success) {
        await fetchMatchData(true)
      } else {
        alert(result.error || 'Failed to undo')
      }
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

  // Determine batting team from actual batting stats
  const currentInningsBatsmen = battingStats.filter((s: any) => s.innings_number === match.current_innings && !s.is_out)
  let battingTeam, bowlingTeam

  if (currentInningsBatsmen.length > 0) {
    // Find which team the current batsmen belong to
    const batsmanTeamId = currentInningsBatsmen[0].team_player_id
    const isTeam1Batting = match.team1.team_players?.some((p: any) => p.id === batsmanTeamId)
    battingTeam = isTeam1Batting ? match.team1 : match.team2
    bowlingTeam = isTeam1Batting ? match.team2 : match.team1
  } else {
    // Fallback: determine from first innings batting stats
    if (match.current_innings === 2) {
      // Second innings - find who batted in first innings and swap
      const innings1Batsmen = battingStats.filter((s: any) => s.innings_number === 1)
      if (innings1Batsmen.length > 0) {
        const innings1BatsmanId = innings1Batsmen[0].team_player_id
        const isTeam1BattedFirst = match.team1.team_players?.some((p: any) => p.id === innings1BatsmanId)
        // Swap teams for second innings
        battingTeam = isTeam1BattedFirst ? match.team2 : match.team1
        bowlingTeam = isTeam1BattedFirst ? match.team1 : match.team2
      } else {
        // No stats available, default to team2 bats second
        battingTeam = match.team2
        bowlingTeam = match.team1
      }
    } else {
      // First innings - default to team1
      battingTeam = match.team1
      bowlingTeam = match.team2
    }
  }

  // Calculate current run rate
  const totalBalls = currentOvers * 6 + currentBalls
  const currentRunRate = totalBalls > 0 ? ((currentScore / totalBalls) * 6).toFixed(2) : '0.00'

  // Get recent balls - we already have them in match.balls from state
  const allBalls = match.balls || []

  const recentBalls = allBalls
    .filter((b: any) => b.innings_number === match.current_innings)
    .sort((a: any, b: any) => {
      if (a.over_number !== b.over_number) return b.over_number - a.over_number
      if (a.ball_number !== b.ball_number) return b.ball_number - a.ball_number
      // For same ball number (no-ball/wide + legal ball), sort by creation time descending
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 12)

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

      {/* Commentary Feed */}
      {recentBalls.length > 0 && (
        <div className="px-4 py-4 border-t max-sm:px-2">
          <h3 className="text-base font-bold mb-3">Commentary</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentBalls.map((ball: any, idx: number) => {
              const overBall = `${ball.over_number}.${Number(ball.ball_number)+1}`

              return (
                <div key={idx} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-sm text-gray-700 min-w-[40px] mt-0.5">
                      {overBall}
                    </span>
                    <p className="text-sm text-gray-800 flex-1">
                      {ball.commentary}
                    </p>
                  </div>
                </div>
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
              <Undo className="h-4 w-4 mr-2" /> Undo Last Ball
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

          <div className="grid grid-cols-4 gap-1.5 mb-1.5">
            <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
              <Button
                variant="destructive"
                className="h-10 text-sm"
                onClick={() => setShowWicketDialog(true)}
              >
                Wicket
              </Button>
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

            <Button onClick={handleWideClick} variant="outline" className="h-10 text-sm">Wide</Button>
            <Button onClick={handleNoBallClick} variant="outline" className="h-10 text-sm">No Ball</Button>

            <Dialog open={showRetireHurtDialog} onOpenChange={setShowRetireHurtDialog}>
              <Button
                variant="outline"
                className="h-10 text-sm text-orange-600 border-orange-600 hover:bg-orange-50"
                onClick={() => setShowRetireHurtDialog(true)}
              >
                Retire Hurt
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Retire Hurt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    The current striker ({currentBatsmen[strikerIndex]?.player?.player_name || 'Batsman'}) will retire hurt. This does not count as a wicket. The batsman can return to bat later when another wicket falls.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleRetireHurt} className="flex-1" variant="destructive">
                      Confirm Retire Hurt
                    </Button>
                    <Button onClick={() => setShowRetireHurtDialog(false)} className="flex-1" variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            {availableBatsmen.length > 0 && (
              <>
                <div>
                  <Label>Select Existing Player</Label>
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
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Add New Player to Team</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const battingTeam = match?.team1_id === availableBatsmen[0]?.team_id ? match?.team1 : match?.team2
                  const battingTeamId = battingTeam?.id || match?.batting_team_id
                  const battingTeamName = battingTeam?.name || 'Batting Team'

                  setPlayerAdditionContext({
                    role: 'batsman',
                    teamId: battingTeamId,
                    teamName: battingTeamName
                  })
                  setShowPlayerAddition(true)
                }}
              >
                + Add New Batsman
              </Button>
            </div>

            <Button
              onClick={async () => {
                if (newBatsmanId) {
                  // Ensure player is in local state first
                  const battingTeamId = match?.batting_team_id
                  await ensurePlayerInLocalState(newBatsmanId, battingTeamId)

                  if (useLocalScoring) {
                    const engine = new LocalMatchEngine(matchId)
                    engine.addBatsman(newBatsmanId, match.current_innings)
                    fetchMatchData(true)
                  } else {
                    await selectNewBatsman(matchId, newBatsmanId, match.current_innings)
                    await fetchMatchData(true)
                  }

                  setShowBatsmanDialog(false)
                  setNewBatsmanId('')

                  // Check if over was completed during the wicket
                  if (overCompletedDuringWicket) {
                    // Show bowler dialog after a short delay
                    setTimeout(() => {
                      setShowBowlerDialog(true)
                      setOverCompletedDuringWicket(false)
                    }, 100)
                  } else {
                    setTimeout(() => {
                      setStrikerIndex(1)
                    }, 100)
                  }
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
            {availableBowlers.length > 0 && (
              <>
                <div>
                  <Label>Select Existing Bowler</Label>
                  <Select value={newBowlerId} onValueChange={setNewBowlerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bowler" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBowlers
                        .filter((player: any) => {
                          // Exclude current bowler (can't bowl consecutive overs)
                          if (currentBowler && currentBowler.team_player_id === player.id) {
                            return false
                          }
                          return true
                        })
                        .map((player: any) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.player_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Add New Bowler to Team</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const bowlingTeam = match?.team1_id !== match?.batting_team_id ? match?.team1 : match?.team2
                  const bowlingTeamId = bowlingTeam?.id
                  const bowlingTeamName = bowlingTeam?.name || 'Bowling Team'

                  setPlayerAdditionContext({
                    role: 'bowler',
                    teamId: bowlingTeamId,
                    teamName: bowlingTeamName
                  })
                  setShowPlayerAddition(true)
                }}
              >
                + Add New Bowler
              </Button>
            </div>

            <Button
              onClick={async () => {
                if (newBowlerId) {
                  // Ensure player is in local state first
                  const bowlingTeamId = match?.team1_id !== match?.batting_team_id ? match?.team1_id : match?.team2_id
                  await ensurePlayerInLocalState(newBowlerId, bowlingTeamId)

                  if (useLocalScoring) {
                    const engine = new LocalMatchEngine(matchId)
                    engine.addBowler(newBowlerId, match.current_innings)
                    fetchMatchData(true)
                  } else {
                    await changeBowler(matchId, newBowlerId, match.current_innings)
                    await fetchMatchData(true)
                  }

                  setManuallySelectedBowlerId(newBowlerId)
                  setShowBowlerDialog(false)
                  setNewBowlerId('')
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
              <Label>First Opening Batsman</Label>
              {availableBatsmen.length > 0 && (
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
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  const battingTeamId = match?.batting_team_id
                  const battingTeamName = match?.team1_id === battingTeamId ? match?.team1?.name : match?.team2?.name

                  setPlayerAdditionContext({
                    role: 'batsman',
                    teamId: battingTeamId,
                    teamName: battingTeamName || 'Batting Team'
                  })
                  setShowPlayerAddition(true)
                }}
              >
                + Add New Batsman
              </Button>
              {newInningsBatsman1 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {availableBatsmen.find((p: any) => p.id === newInningsBatsman1)?.player_name}
                </p>
              )}
            </div>

            <div>
              <Label>Second Opening Batsman</Label>
              {availableBatsmen.length > 0 && (
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
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  const battingTeamId = match?.batting_team_id
                  const battingTeamName = match?.team1_id === battingTeamId ? match?.team1?.name : match?.team2?.name

                  setPlayerAdditionContext({
                    role: 'batsman',
                    teamId: battingTeamId,
                    teamName: battingTeamName || 'Batting Team'
                  })
                  setShowPlayerAddition(true)
                }}
              >
                + Add New Batsman
              </Button>
              {newInningsBatsman2 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {availableBatsmen.find((p: any) => p.id === newInningsBatsman2)?.player_name}
                </p>
              )}
            </div>

            <div>
              <Label>Opening Bowler</Label>
              {availableBowlers.length > 0 && (
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
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  const bowlingTeamId = match?.team1_id !== match?.batting_team_id ? match?.team1_id : match?.team2_id
                  const bowlingTeamName = match?.team1_id === bowlingTeamId ? match?.team1?.name : match?.team2?.name

                  setPlayerAdditionContext({
                    role: 'bowler',
                    teamId: bowlingTeamId,
                    teamName: bowlingTeamName || 'Bowling Team'
                  })
                  setShowPlayerAddition(true)
                }}
              >
                + Add New Bowler
              </Button>
              {newInningsBowler && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {availableBowlers.find((p: any) => p.id === newInningsBowler)?.player_name}
                </p>
              )}
            </div>

            <Button
              onClick={async () => {
                if (newInningsBatsman1 && newInningsBatsman2 && newInningsBowler) {
                  // Ensure players are in local state first
                  const battingTeamId = match?.batting_team_id
                  const bowlingTeamId = match?.team1_id !== battingTeamId ? match?.team1_id : match?.team2_id

                  await ensurePlayerInLocalState(newInningsBatsman1, battingTeamId)
                  await ensurePlayerInLocalState(newInningsBatsman2, battingTeamId)
                  await ensurePlayerInLocalState(newInningsBowler, bowlingTeamId)

                  if (useLocalScoring) {
                    const engine = new LocalMatchEngine(matchId)
                    engine.addBatsman(newInningsBatsman1, match.current_innings)
                    engine.addBatsman(newInningsBatsman2, match.current_innings)
                    engine.addBowler(newInningsBowler, match.current_innings)
                    fetchMatchData(true)
                  } else {
                    await selectNewBatsman(matchId, newInningsBatsman1, match.current_innings)
                    await selectNewBatsman(matchId, newInningsBatsman2, match.current_innings)
                    await changeBowler(matchId, newInningsBowler, match.current_innings)
                    await fetchMatchData(true)
                  }

                  setManuallySelectedBowlerId(newInningsBowler)
                  setShowInningsSetup(false)
                  setNewInningsBatsman1('')
                  setNewInningsBatsman2('')
                  setNewInningsBowler('')
                  setStrikerIndex(0)
                }
              }}
              className="w-full"
              disabled={!newInningsBatsman1 || !newInningsBatsman2 || !newInningsBowler}
            >
              {(!newInningsBatsman1 || !newInningsBatsman2 || !newInningsBowler)
                ? 'Add all 3 players to start'
                : 'Start Innings'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Player Addition Dialog - Reusable for all player additions */}
      {playerAdditionContext && (
        <PlayerAdditionDialog
          open={showPlayerAddition}
          onOpenChange={setShowPlayerAddition}
          teamId={playerAdditionContext.teamId}
          teamName={playerAdditionContext.teamName}
          role={playerAdditionContext.role}
          onPlayerAdded={handlePlayerAdded}
          existingPlayerIds={
            playerAdditionContext.teamId === match?.team1_id
              ? (match?.team1?.team_players || []).map((p: any) => p.user_id).filter(Boolean)
              : (match?.team2?.team_players || []).map((p: any) => p.user_id).filter(Boolean)
          }
        />
      )}

    </div>
  )
}
