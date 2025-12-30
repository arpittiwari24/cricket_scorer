import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCareerStats, getUserMatchHistory } from '@/actions/stats'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const statsResult = await getCareerStats(session.user.id)
  const matchHistoryResult = await getUserMatchHistory(session.user.id, 10)

  const stats = statsResult.success ? statsResult.data : null
  const matchHistory = matchHistoryResult.success ? matchHistoryResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">{session.user.name}</h1>
        <p className="text-gray-600">Your cricket profile and stats</p>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Batting Stats</CardTitle>
                <CardDescription>Career batting performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Matches</span>
                  <span className="font-bold">{stats.total_matches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Runs</span>
                  <span className="font-bold">{stats.total_runs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average</span>
                  <span className="font-bold">{stats.batting_average.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strike Rate</span>
                  <span className="font-bold">{stats.batting_strike_rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Highest Score</span>
                  <span className="font-bold">{stats.highest_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Boundaries</span>
                  <span className="font-bold">{stats.total_fours}x4 {stats.total_sixes}x6</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bowling Stats</CardTitle>
                <CardDescription>Career bowling performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Wickets</span>
                  <span className="font-bold">{stats.total_wickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bowling Average</span>
                  <span className="font-bold">{stats.bowling_average.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Economy</span>
                  <span className="font-bold">{stats.economy_rate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Figures</span>
                  <span className="font-bold">{stats.best_bowling_figures || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maidens</span>
                  <span className="font-bold">{stats.total_maidens}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Matches</CardTitle>
          <CardDescription>Your match history</CardDescription>
        </CardHeader>
        <CardContent>
          {matchHistory && matchHistory.length > 0 ? (
            <div className="space-y-2">
              {matchHistory.map((match: any) => (
                <Link key={match.id} href={`/matches/${match.id}/scorecard`}>
                  <div className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {match.team1?.name} vs {match.team2?.name}
                        </p>
                        <p className="text-sm text-gray-500">{match.venue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {match.team1_score}/{match.team1_wickets} vs {match.team2_score}/{match.team2_wickets}
                        </p>
                        <p className="text-xs text-gray-500">{match.result_text}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No matches played yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
