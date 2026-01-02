import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBattingLeaderboard, getBowlingLeaderboard } from '@/actions/stats'
import Link from 'next/link'
import Image from 'next/image'

export default async function LeaderboardPage() {
  const battingResult = await getBattingLeaderboard(20)
  const bowlingResult = await getBowlingLeaderboard(20)

  const battingLeaderboard = battingResult.success ? battingResult.data : []
  const bowlingLeaderboard = bowlingResult.success ? bowlingResult.data : []

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 px-3 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Leaderboards
          </h1>
          <p className="text-slate-600 text-sm md:text-base">Top performers across all matches</p>
        </div>

        {/* Leaderboards Grid */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
          {/* Batting Leaderboard */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-cyan-50 border-b py-4 md:py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl text-blue-900">Batting Rankings</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-blue-700">Most runs scored</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6">
              {battingLeaderboard && battingLeaderboard.length > 0 ? (
                <div className="space-y-2">
                  {battingLeaderboard.map((player: any, index: number) => (
                    <div
                      key={player.user_id}
                      className={`p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-200 ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Rank */}
                        {index === 0 ? (
                          <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 relative">
                            <Image
                              src="/orange-cap.png"
                              alt="Orange Cap - Top Batsman"
                              width={100}
                              height={100}
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="shrink-0 size-6 rounded-full flex items-center justify-center font-bold text-sm md:text-lg bg-blue-500 text-white">
                            {index}
                          </div>
                        )}

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base text-slate-900 truncate">
                            {player.user?.name || 'Unknown Player'}
                          </p>
                          <div className="flex gap-3 md:gap-4 text-xs text-slate-600 mt-1">
                            <span>Avg: {player.batting_average.toFixed(2)}</span>
                            <span>SR: {player.batting_strike_rate.toFixed(2)}</span>
                            <span>HS: {player.highest_score}</span>
                          </div>
                        </div>

                        {/* Runs */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xl md:text-2xl font-bold text-blue-900">
                            {player.total_runs}
                          </p>
                          <p className="text-xs text-slate-500">runs</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-base md:text-lg">No data yet</p>
                  <p className="text-slate-400 text-xs md:text-sm mt-1">Play matches to appear on the leaderboard</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bowling Leaderboard */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 border-b py-4 md:py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl text-amber-900">Bowling Rankings</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-amber-700">Most wickets taken</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6">
              {bowlingLeaderboard && bowlingLeaderboard.length > 0 ? (
                <div className="space-y-2">
                  {bowlingLeaderboard.map((player: any, index: number) => (
                    <div
                      key={player.user_id}
                      className={`p-3 md:p-4 rounded-lg md:rounded-xl transition-all duration-200 ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* Rank */}
                        {index === 0 ? (
                          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 relative">
                            <Image
                              src="/purple-cap.png"
                              alt="Purple Cap - Top Bowler"
                              width={48}
                              height={48}
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-lg bg-red-500 text-white">
                            {index + 1}
                          </div>
                        )}

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base text-slate-900 truncate">
                            {player.user?.name || 'Unknown Player'}
                          </p>
                          <div className="flex gap-3 md:gap-4 text-xs text-slate-600 mt-1">
                            <span>Avg: {player.bowling_average.toFixed(2)}</span>
                            <span>Econ: {player.economy_rate.toFixed(2)}</span>
                            <span>Best: {player.best_bowling_figures || '-'}</span>
                          </div>
                        </div>

                        {/* Wickets */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xl md:text-2xl font-bold text-red-900">
                            {player.total_wickets}
                          </p>
                          <p className="text-xs text-slate-500">wickets</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-base md:text-lg">No data yet</p>
                  <p className="text-slate-400 text-xs md:text-sm mt-1">Play matches to appear on the leaderboard</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
