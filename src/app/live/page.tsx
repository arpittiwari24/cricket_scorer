import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAllLiveMatches } from '@/actions/matches'
import { formatOvers } from '@/lib/cricket/rules'

export default async function LiveMatchesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const result = await getAllLiveMatches()
  const liveMatches = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Live Matches</h1>
        <p className="text-gray-600">Watch cricket matches in progress</p>
      </div>

      {liveMatches && liveMatches.length > 0 ? (
        <div className="space-y-4">
          {liveMatches.map((match: any) => (
            <Link key={match.id} href={`/matches/${match.id}`}>
              <Card className="hover:border-black transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {match.team1?.name} vs {match.team2?.name}
                    </CardTitle>
                    <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                      🔴 LIVE
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{match.team1?.name}</span>
                      <span className="font-mono">
                        {match.team1_score}/{match.team1_wickets} ({formatOvers(match.team1_overs, match.team1_balls)})
                      </span>
                    </div>
                    {match.current_innings > 1 && (
                      <div className="flex justify-between">
                        <span className="font-medium">{match.team2?.name}</span>
                        <span className="font-mono">
                          {match.team2_score}/{match.team2_wickets} ({formatOvers(match.team2_overs, match.team2_balls)})
                        </span>
                      </div>
                    )}
                    {match.target && (
                      <div className="text-sm text-gray-600 mt-2">
                        Target: {match.target} | Need: {match.target - match.team2_score} runs
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No live matches at the moment</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
