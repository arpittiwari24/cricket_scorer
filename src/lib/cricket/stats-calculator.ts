/**
 * Calculate batting strike rate
 */
export function calculateStrikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0
  return parseFloat(((runs / balls) * 100).toFixed(2))
}

/**
 * Calculate batting average
 */
export function calculateBattingAverage(runs: number, timesOut: number): number {
  if (timesOut === 0) return runs > 0 ? runs : 0
  return parseFloat((runs / timesOut).toFixed(2))
}

/**
 * Calculate bowling economy rate
 */
export function calculateEconomy(runs: number, overs: number, balls: number): number {
  const totalOvers = overs + balls / 6
  if (totalOvers === 0) return 0
  return parseFloat((runs / totalOvers).toFixed(2))
}

/**
 * Calculate bowling average
 */
export function calculateBowlingAverage(
  runsConceded: number,
  wickets: number
): number {
  if (wickets === 0) return 0
  return parseFloat((runsConceded / wickets).toFixed(2))
}

/**
 * Calculate bowling strike rate (balls per wicket)
 */
export function calculateBowlingStrikeRate(
  ballsBowled: number,
  wickets: number
): number {
  if (wickets === 0) return 0
  return parseFloat((ballsBowled / wickets).toFixed(2))
}

/**
 * Format bowling figures (e.g., "5/32" for 5 wickets, 32 runs)
 */
export function formatBowlingFigures(wickets: number, runs: number): string {
  return `${wickets}/${runs}`
}

/**
 * Compare bowling figures to determine better performance
 */
export function isBetterBowlingFigures(
  current: { wickets: number; runs: number },
  best: { wickets: number; runs: number }
): boolean {
  // More wickets is always better
  if (current.wickets > best.wickets) return true
  if (current.wickets < best.wickets) return false

  // Same wickets, fewer runs is better
  return current.runs < best.runs
}

/**
 * Aggregate batting stats from multiple matches
 */
export interface BattingStatsAggregate {
  totalRuns: number
  totalBalls: number
  totalFours: number
  totalSixes: number
  highestScore: number
  totalInnings: number
  timesOut: number
  average: number
  strikeRate: number
}

export function aggregateBattingStats(
  stats: Array<{
    runs: number
    balls_faced: number
    fours: number
    sixes: number
    is_out: boolean
  }>
): BattingStatsAggregate {
  const totalRuns = stats.reduce((sum, s) => sum + s.runs, 0)
  const totalBalls = stats.reduce((sum, s) => sum + s.balls_faced, 0)
  const totalFours = stats.reduce((sum, s) => sum + s.fours, 0)
  const totalSixes = stats.reduce((sum, s) => sum + s.sixes, 0)
  const highestScore = stats.reduce((max, s) => Math.max(max, s.runs), 0)
  const totalInnings = stats.length
  const timesOut = stats.filter((s) => s.is_out).length

  return {
    totalRuns,
    totalBalls,
    totalFours,
    totalSixes,
    highestScore,
    totalInnings,
    timesOut,
    average: calculateBattingAverage(totalRuns, timesOut),
    strikeRate: calculateStrikeRate(totalRuns, totalBalls),
  }
}

/**
 * Aggregate bowling stats from multiple matches
 */
export interface BowlingStatsAggregate {
  totalOvers: number
  totalBalls: number
  totalRuns: number
  totalWickets: number
  totalMaidens: number
  average: number
  economy: number
  strikeRate: number
  bestFigures: string
}

export function aggregateBowlingStats(
  stats: Array<{
    overs: number
    balls_bowled: number
    runs_conceded: number
    wickets: number
    maidens: number
  }>
): BowlingStatsAggregate {
  const totalOvers = stats.reduce((sum, s) => sum + s.overs, 0)
  const totalBalls = stats.reduce((sum, s) => sum + s.balls_bowled, 0)
  const totalRuns = stats.reduce((sum, s) => sum + s.runs_conceded, 0)
  const totalWickets = stats.reduce((sum, s) => sum + s.wickets, 0)
  const totalMaidens = stats.reduce((sum, s) => sum + s.maidens, 0)

  // Find best bowling figures
  let bestFigures = { wickets: 0, runs: 999 }
  stats.forEach((s) => {
    if (
      isBetterBowlingFigures(
        { wickets: s.wickets, runs: s.runs_conceded },
        bestFigures
      )
    ) {
      bestFigures = { wickets: s.wickets, runs: s.runs_conceded }
    }
  })

  return {
    totalOvers,
    totalBalls,
    totalRuns,
    totalWickets,
    totalMaidens,
    average: calculateBowlingAverage(totalRuns, totalWickets),
    economy: calculateEconomy(totalRuns, totalOvers, 0),
    strikeRate: calculateBowlingStrikeRate(totalBalls, totalWickets),
    bestFigures: formatBowlingFigures(bestFigures.wickets, bestFigures.runs),
  }
}

/**
 * Calculate partnership runs between two batsmen
 */
export function calculatePartnership(
  batsman1Runs: number,
  batsman2Runs: number
): number {
  return batsman1Runs + batsman2Runs
}

/**
 * Determine player of the match based on stats
 */
export function determinePlayerOfMatch(players: Array<{
  name: string
  runs: number
  balls: number
  wickets: number
  economy: number
}>): string | null {
  if (players.length === 0) return null

  // Simple algorithm: highest weighted score
  // Batting: 1 point per run, bonus for strike rate > 150
  // Bowling: 20 points per wicket, bonus for economy < 6
  const scores = players.map((p) => {
    let score = 0

    // Batting contribution
    score += p.runs
    if (p.balls > 0) {
      const sr = (p.runs / p.balls) * 100
      if (sr > 150) score += 20
    }

    // Bowling contribution
    score += p.wickets * 20
    if (p.wickets > 0 && p.economy < 6) score += 15

    return { name: p.name, score }
  })

  const winner = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  )

  return winner.name
}
