'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatOvers } from '@/lib/cricket/rules'
import { calculateStrikeRate } from '@/lib/cricket/stats-calculator'

interface ScorecardProps {
  match: any
  battingStats: any[]
  bowlingStats: any[]
  balls?: any[]
}

export function MatchScorecard({ match, battingStats, bowlingStats, balls = [] }: ScorecardProps) {
  const isFirstInnings = match.current_innings === 1
  const team1Stats = battingStats.filter((s: any) => s.innings_number === 1)
  const team2Stats = battingStats.filter((s: any) => s.innings_number === 2)
  const team1BowlingStats = bowlingStats.filter((s: any) => s.innings_number === 1)
  const team2BowlingStats = bowlingStats.filter((s: any) => s.innings_number === 2)

  const renderBattingTable = (stats: any[], teamName: string, innings: number) => {
    const sortedStats = stats.sort((a, b) => {
      // Sort by: not out first, then by batting order (id)
      if (a.is_out === b.is_out) return 0
      return a.is_out ? 1 : -1
    })

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">
            {teamName} Innings - {innings === 1 ? match.team1_score : match.team2_score}/{innings === 1 ? match.team1_wickets : match.team2_wickets}
            <span className="text-base font-normal text-gray-600 ml-2">
              ({formatOvers(innings === 1 ? match.team1_overs : match.team2_overs, innings === 1 ? match.team1_balls : match.team2_balls)} overs)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-3 px-3 font-semibold">Batter</th>
                  <th className="text-left py-3 px-3 font-semibold">Dismissal</th>
                  <th className="text-right py-3 px-2 font-semibold">R</th>
                  <th className="text-right py-3 px-2 font-semibold">B</th>
                  <th className="text-right py-3 px-2 font-semibold">4s</th>
                  <th className="text-right py-3 px-2 font-semibold">6s</th>
                  <th className="text-right py-3 px-2 font-semibold">SR</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((batsman: any) => {
                  const dismissalText = batsman.is_out
                    ? batsman.dismissal_type === 'bowled'
                      ? 'b'
                      : batsman.dismissal_type === 'caught'
                      ? 'c'
                      : batsman.dismissal_type === 'lbw'
                      ? 'lbw'
                      : batsman.dismissal_type === 'run_out'
                      ? 'run out'
                      : batsman.dismissal_type === 'stumped'
                      ? 'st'
                      : batsman.dismissal_type === 'hit_wicket'
                      ? 'hit wicket'
                      : batsman.dismissal_type === 'retired_hurt'
                      ? 'retired hurt'
                      : 'out'
                    : 'not out'

                  return (
                    <tr key={batsman.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">
                        {batsman.player?.player_name || 'Unknown'}
                        {!batsman.is_out && <span className="text-green-600 ml-1">*</span>}
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-xs">
                        {dismissalText}
                      </td>
                      <td className="text-right py-3 px-2 font-semibold">{batsman.runs}</td>
                      <td className="text-right py-3 px-2">{batsman.balls_faced}</td>
                      <td className="text-right py-3 px-2">{batsman.fours || 0}</td>
                      <td className="text-right py-3 px-2">{batsman.sixes || 0}</td>
                      <td className="text-right py-3 px-2">{calculateStrikeRate(batsman.runs, batsman.balls_faced)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {stats.length === 0 && (
            <p className="text-center text-gray-500 py-4">No batting data available</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderBowlingTable = (stats: any[], teamName: string, innings: number) => {
    const sortedStats = stats.sort((a, b) => b.wickets - a.wickets)

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{teamName} Bowling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-3 px-3 font-semibold">Bowler</th>
                  <th className="text-right py-3 px-2 font-semibold">O</th>
                  <th className="text-right py-3 px-2 font-semibold">M</th>
                  <th className="text-right py-3 px-2 font-semibold">R</th>
                  <th className="text-right py-3 px-2 font-semibold">W</th>
                  <th className="text-right py-3 px-2 font-semibold">Econ</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((bowler: any) => (
                  <tr key={bowler.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">
                      {bowler.player?.player_name || 'Unknown'}
                    </td>
                    <td className="text-right py-3 px-2">
                      {formatOvers(bowler.overs, bowler.balls_bowled % 6)}
                    </td>
                    <td className="text-right py-3 px-2">{bowler.maidens || 0}</td>
                    <td className="text-right py-3 px-2">{bowler.runs_conceded || 0}</td>
                    <td className="text-right py-3 px-2 font-semibold">{bowler.wickets || 0}</td>
                    <td className="text-right py-3 px-2">
                      {bowler.economy_rate?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {stats.length === 0 && (
            <p className="text-center text-gray-500 py-4">No bowling data available</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Match Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {match.team1?.name} vs {match.team2?.name}
          </CardTitle>
          <div className="text-sm text-gray-600 space-y-1">
            {match.venue && <p>Venue: {match.venue}</p>}
            <p>Format: {match.total_overs} overs per side</p>
            {match.status === 'live' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="font-semibold text-green-700 text-base">LIVE MATCH - Scorecard updates in real-time</span>
              </div>
            )}
            {match.status === 'completed' && match.result_text && (
              <p className="font-semibold text-green-700 text-base mt-2">{match.result_text}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* First Innings - Batting */}
      {team1Stats.length > 0 && renderBattingTable(team1Stats, match.team1?.name || 'Team 1', 1)}

      {/* First Innings - Bowling */}
      {team1BowlingStats.length > 0 && renderBowlingTable(team1BowlingStats, match.team2?.name || 'Team 2', 1)}

      {/* Second Innings - Batting */}
      {team2Stats.length > 0 && renderBattingTable(team2Stats, match.team2?.name || 'Team 2', 2)}

      {/* Second Innings - Bowling */}
      {team2BowlingStats.length > 0 && renderBowlingTable(team2BowlingStats, match.team1?.name || 'Team 1', 2)}

      {/* Ball-by-Ball Commentary */}
      {match.status === 'completed' && balls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Ball-by-Ball Commentary</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Innings 1 Commentary */}
            {balls.filter((b: any) => b.innings_number === 1).length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 text-gray-800">
                  First Innings
                </h3>
                <div className="space-y-3">
                  {balls
                    .filter((b: any) => b.innings_number === 1)
                    .sort((a: any, b: any) => {
                      if (a.over_number !== b.over_number) return b.over_number - a.over_number
                      if (a.ball_number !== b.ball_number) return b.ball_number - a.ball_number
                      // For same ball number (no-ball/wide + legal ball), sort by creation time descending
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .map((ball: any, idx: number) => {
                      const overBall = `${ball.over_number}.${Number(ball.ball_number) + 1}`
                      return (
                        <div key={idx} className="border-b pb-3 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-sm text-gray-700 min-w-[50px] mt-0.5">
                              {overBall}
                            </span>
                            <p className="text-sm text-gray-800 flex-1">
                              {ball.commentary || 'No commentary available'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Innings 2 Commentary */}
            {balls.filter((b: any) => b.innings_number === 2).length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-800">
                  Second Innings
                </h3>
                <div className="space-y-3">
                  {balls
                    .filter((b: any) => b.innings_number === 2)
                    .sort((a: any, b: any) => {
                      if (a.over_number !== b.over_number) return b.over_number - a.over_number
                      if (a.ball_number !== b.ball_number) return b.ball_number - a.ball_number
                      // For same ball number (no-ball/wide + legal ball), sort by creation time descending
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .map((ball: any, idx: number) => {
                      const overBall = `${ball.over_number}.${Number(ball.ball_number) + 1}`
                      return (
                        <div key={idx} className="border-b pb-3 last:border-b-0">
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-sm text-gray-700 min-w-[50px] mt-0.5">
                              {overBall}
                            </span>
                            <p className="text-sm text-gray-800 flex-1">
                              {ball.commentary || 'No commentary available'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
