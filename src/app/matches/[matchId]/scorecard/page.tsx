'use client'

import { use, useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getMatch, getMatchStats } from '@/actions/stats'
import { toPng } from 'html-to-image'

export default function ScorecardPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params)
  const [match, setMatch] = useState<any>(null)
  const [battingStats, setBattingStats] = useState<any[]>([])
  const [bowlingStats, setBowlingStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const scorecardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMatchData()
  }, [])

  const loadMatchData = async () => {
    const matchResult = await getMatch(matchId) as any
    const statsResult = await getMatchStats(matchId) as any

    if (matchResult.success) {
      setMatch(matchResult.data)
    }

    if (statsResult.success) {
      setBattingStats(statsResult.data.batting || [])
      setBowlingStats(statsResult.data.bowling || [])
    }

    setIsLoading(false)
  }

  const handleExport = async () => {
    if (!scorecardRef.current) return

    try {
      const dataUrl = await toPng(scorecardRef.current, {
        backgroundColor: 'white',
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.download = `scorecard-${(await params).matchId}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to export scorecard:', error)
      alert('Failed to export scorecard')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading scorecard...</div>
  }

  if (!match) {
    return <div className="text-center py-12">Match not found</div>
  }

  const team1BattingStats = battingStats.filter((s: any) => s.innings_number === 1)
  const team2BattingStats = battingStats.filter((s: any) => s.innings_number === 2)
  const team1BowlingStats = bowlingStats.filter((s: any) => s.innings_number === 2)
  const team2BowlingStats = bowlingStats.filter((s: any) => s.innings_number === 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Match Scorecard</h1>
          <p className="text-gray-600">
            {match.team1?.name} vs {match.team2?.name}
          </p>
        </div>
        <Button onClick={handleExport}>Export as PNG</Button>
      </div>

      <div ref={scorecardRef} className="bg-white p-8 space-y-6">
        {/* Match Header */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold">
            {match.team1?.name} vs {match.team2?.name}
          </h2>
          <p className="text-gray-600 mt-1">{match.venue}</p>
          {match.result_text && (
            <p className="text-lg font-medium mt-2">{match.result_text}</p>
          )}
        </div>

        {/* Team 1 Innings */}
        <Card>
          <CardHeader>
            <CardTitle>
              {match.team1?.name} - {match.team1_score}/{match.team1_wickets} ({match.team1_overs}.{match.team1_balls} overs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batsman</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Balls</TableHead>
                  <TableHead className="text-right">4s</TableHead>
                  <TableHead className="text-right">6s</TableHead>
                  <TableHead className="text-right">SR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team1BattingStats.map((stat: any) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">
                      {stat.player?.player_name || 'Unknown'}
                      {stat.is_out && stat.dismissal_type && (
                        <span className="text-sm text-gray-500 ml-2">({stat.dismissal_type})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{stat.runs}</TableCell>
                    <TableCell className="text-right">{stat.balls_faced}</TableCell>
                    <TableCell className="text-right">{stat.fours}</TableCell>
                    <TableCell className="text-right">{stat.sixes}</TableCell>
                    <TableCell className="text-right">{stat.strike_rate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Bowling</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bowler</TableHead>
                    <TableHead className="text-right">Overs</TableHead>
                    <TableHead className="text-right">Maidens</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Wickets</TableHead>
                    <TableHead className="text-right">Economy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team2BowlingStats.map((stat: any) => (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">
                        {stat.player?.player_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">{stat.overs}.{stat.balls_bowled % 6}</TableCell>
                      <TableCell className="text-right">{stat.maidens}</TableCell>
                      <TableCell className="text-right">{stat.runs_conceded}</TableCell>
                      <TableCell className="text-right">{stat.wickets}</TableCell>
                      <TableCell className="text-right">{stat.economy_rate.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Team 2 Innings */}
        {match.current_innings > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {match.team2?.name} - {match.team2_score}/{match.team2_wickets} ({match.team2_overs}.{match.team2_balls} overs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batsman</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">Balls</TableHead>
                    <TableHead className="text-right">4s</TableHead>
                    <TableHead className="text-right">6s</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team2BattingStats.map((stat: any) => (
                    <TableRow key={stat.id}>
                      <TableCell className="font-medium">
                        {stat.player?.player_name || 'Unknown'}
                        {stat.is_out && stat.dismissal_type && (
                          <span className="text-sm text-gray-500 ml-2">({stat.dismissal_type})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{stat.runs}</TableCell>
                      <TableCell className="text-right">{stat.balls_faced}</TableCell>
                      <TableCell className="text-right">{stat.fours}</TableCell>
                      <TableCell className="text-right">{stat.sixes}</TableCell>
                      <TableCell className="text-right">{stat.strike_rate.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4">
                <h4 className="font-semibold mb-2">Bowling</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bowler</TableHead>
                      <TableHead className="text-right">Overs</TableHead>
                      <TableHead className="text-right">Maidens</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                      <TableHead className="text-right">Economy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team1BowlingStats.map((stat: any) => (
                      <TableRow key={stat.id}>
                        <TableCell className="font-medium">
                          {stat.player?.player_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">{stat.overs}.{stat.balls_bowled % 6}</TableCell>
                        <TableCell className="text-right">{stat.maidens}</TableCell>
                        <TableCell className="text-right">{stat.runs_conceded}</TableCell>
                        <TableCell className="text-right">{stat.wickets}</TableCell>
                        <TableCell className="text-right">{stat.economy_rate.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
