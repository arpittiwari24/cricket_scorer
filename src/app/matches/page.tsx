import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMatches } from '@/actions/matches'

export default async function MatchesPage() {
  const result = await getMatches()
  const matches = result.success ? result.data : []

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Matches</h1>
          <p className="text-sm sm:text-base text-gray-600">Create and manage cricket matches</p>
        </div>
        <Link href="/matches/create" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Create Match</Button>
        </Link>
      </div>

      {matches && matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((match: any) => (
            <Link key={match.id} href={`/matches/${match.id}`}>
              <Card className="hover:border-black transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-lg sm:text-xl">
                      {match.team1?.name} vs {match.team2?.name}
                    </CardTitle>
                    <span
                      className={`text-xs sm:text-sm px-3 py-1 rounded-full flex-shrink-0 self-start sm:self-center ${
                        match.status === 'live'
                          ? 'bg-green-100 text-green-800'
                          : match.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {match.status === 'live' ? '🔴 LIVE' : match.status.toUpperCase()}
                    </span>
                  </div>
                  <CardDescription>
                    {match.venue} • {match.total_overs} overs
                  </CardDescription>
                </CardHeader>
                {match.status !== 'not_started' && (
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm">
                        {match.team1?.name}: {match.team1_score}/{match.team1_wickets}
                      </p>
                      {match.current_innings > 1 && (
                        <p className="text-sm">
                          {match.team2?.name}: {match.team2_score}/{match.team2_wickets}
                        </p>
                      )}
                      {match.result_text && (
                        <p className="text-sm font-medium mt-2">{match.result_text}</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No matches yet</p>
            <Link href="/matches/create">
              <Button>Create Your First Match</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
