import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCareerStats, getUserMatchHistory } from '@/actions/stats'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/nextauth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileHeader } from '@/components/profile/ProfileHeader'

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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-8 px-3 md:px-4 py-4 md:py-6">

        {/* Profile Header */}
        <ProfileHeader user={session.user} />

        {stats && (
          <>
            {/* Stats Cards with Modern Design */}
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              {/* Batting Stats Card */}
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-linear-to-br from-blue-50 to-cyan-50 border-b py-3 md:py-6">
                  <CardTitle className="text-lg md:text-2xl text-blue-900">Batting Stats</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-blue-700">Career batting performance</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6">
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-blue-600 font-medium mb-1">Matches</p>
                      <p className="text-xl md:text-3xl font-bold text-blue-900">{stats.total_matches}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-green-600 font-medium mb-1">Runs</p>
                      <p className="text-xl md:text-3xl font-bold text-green-900">{stats.total_runs}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-purple-600 font-medium mb-1">Average</p>
                      <p className="text-xl md:text-3xl font-bold text-purple-900">{stats.batting_average.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-orange-600 font-medium mb-1">Strike Rate</p>
                      <p className="text-xl md:text-3xl font-bold text-orange-900">{stats.batting_strike_rate.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-red-600 font-medium mb-1">Highest Score</p>
                      <p className="text-xl md:text-3xl font-bold text-red-900">{stats.highest_score}</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-indigo-600 font-medium mb-1">Fours</p>
                      <p className="text-xl md:text-3xl font-bold text-indigo-900">{stats.total_fours}</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-3 md:p-4 rounded-lg md:rounded-xl col-span-2">
                      <p className="text-xs md:text-sm text-pink-600 font-medium mb-1">Sixes</p>
                      <p className="text-xl md:text-3xl font-bold text-pink-900">{stats.total_sixes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bowling Stats Card */}
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 border-b py-3 md:py-6">
                  <CardTitle className="text-lg md:text-2xl text-amber-900">Bowling Stats</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-amber-700">Career bowling performance</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 md:pt-6">
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-red-600 font-medium mb-1">Wickets</p>
                      <p className="text-xl md:text-3xl font-bold text-red-900">{stats.total_wickets}</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-yellow-700 font-medium mb-1">Bowling Avg</p>
                      <p className="text-xl md:text-3xl font-bold text-yellow-900">{stats.bowling_average.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-green-600 font-medium mb-1">Economy</p>
                      <p className="text-xl md:text-3xl font-bold text-green-900">{stats.economy_rate.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 md:p-4 rounded-lg md:rounded-xl">
                      <p className="text-xs md:text-sm text-blue-600 font-medium mb-1">Best Figures</p>
                      <p className="text-lg md:text-2xl font-bold text-blue-900">{stats.best_bowling_figures || '-'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 md:p-4 rounded-lg md:rounded-xl col-span-2">
                      <p className="text-xs md:text-sm text-purple-600 font-medium mb-1">Maidens</p>
                      <p className="text-xl md:text-3xl font-bold text-purple-900">{stats.total_maidens}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Recent Matches */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-br from-slate-50 to-gray-50 border-b py-3 md:py-6">
            <CardTitle className="text-lg md:text-2xl text-slate-900">Recent Matches</CardTitle>
            <CardDescription className="text-xs md:text-sm text-slate-600">Your match history</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6">
            {matchHistory && matchHistory.length > 0 ? (
              <div className="space-y-2 md:space-y-3">
                {matchHistory.map((match: any) => (
                  <Link key={match.id} href={`/matches/${match.id}/scorecard`}>
                    <div className="p-3 md:p-5 border-2 border-slate-100 rounded-lg md:rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-0">
                        <div className="flex-1">
                          <p className="font-bold text-sm md:text-lg text-slate-900 mb-1">
                            {match.team1?.name} vs {match.team2?.name}
                          </p>
                          <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1">
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {match.venue}
                          </p>
                        </div>
                        <div className="md:text-right md:ml-4">
                          <div className="flex gap-1 md:gap-2 items-center md:justify-end mb-1">
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-100 text-blue-900 rounded-full text-xs md:text-sm font-bold">
                              {match.team1_score}/{match.team1_wickets}
                            </span>
                            <span className="text-slate-400 text-xs md:text-sm">vs</span>
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-green-100 text-green-900 rounded-full text-xs md:text-sm font-bold">
                              {match.team2_score}/{match.team2_wickets}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{match.result_text}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-base md:text-lg">No matches played yet</p>
                <p className="text-slate-400 text-xs md:text-sm mt-1">Start scoring to see your match history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
