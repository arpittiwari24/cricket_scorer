import { CurrentBatsman } from '@/types/match'

/**
 * Determines if batsmen should rotate strike after a ball
 */
export function shouldRotateStrike(runs: number): boolean {
  return runs % 2 === 1
}

/**
 * Rotates the strike between two batsmen
 */
export function rotateBatsmen(batsmen: CurrentBatsman[]): CurrentBatsman[] {
  return batsmen.map((b) => ({
    ...b,
    onStrike: !b.onStrike,
  }))
}

/**
 * Checks if an over is complete (6 legal balls bowled)
 */
export function isOverComplete(legalBallsInOver: number): boolean {
  return legalBallsInOver === 6
}

/**
 * Checks if innings should end
 */
export function shouldEndInnings(
  wickets: number,
  overs: number,
  balls: number,
  totalOvers: number,
  target?: number,
  currentScore?: number
): {
  shouldEnd: boolean
  reason?:
    | 'all_out'
    | 'overs_complete'
    | 'target_chased'
    | 'target_impossible'
} {
  // All out (10 wickets down)
  if (wickets >= 10) {
    return { shouldEnd: true, reason: 'all_out' }
  }

  // Overs complete
  if (overs >= totalOvers && balls === 0) {
    return { shouldEnd: true, reason: 'overs_complete' }
  }

  // Target chased (second innings)
  if (target && currentScore && currentScore >= target) {
    return { shouldEnd: true, reason: 'target_chased' }
  }

  // Target impossible to chase (second innings)
  if (target && currentScore !== undefined) {
    const ballsRemaining = totalOvers * 6 - (overs * 6 + balls)
    const runsNeeded = target - currentScore

    // Even if they hit 6 on every ball, they can't win
    if (runsNeeded > ballsRemaining * 6) {
      return { shouldEnd: true, reason: 'target_impossible' }
    }
  }

  return { shouldEnd: false }
}

/**
 * Checks if only valid runs can be scored with one batsman
 * (only even runs allowed when there's just one batsman)
 */
export function canScoreRuns(
  runs: number,
  activeBatsmenCount: number
): boolean {
  if (activeBatsmenCount === 1 && runs % 2 === 1) {
    return false
  }
  return true
}

/**
 * Converts balls to overs (e.g., 8 balls = 1.2 overs)
 */
export function ballsToOvers(totalBalls: number): { overs: number; balls: number } {
  const overs = Math.floor(totalBalls / 6)
  const balls = totalBalls % 6
  return { overs, balls }
}

/**
 * Formats overs for display (e.g., 1.2, 5.4)
 */
export function formatOvers(overs: number, balls: number): string {
  return `${overs}.${balls}`
}

/**
 * Calculates current run rate
 */
export function calculateCurrentRunRate(runs: number, totalBalls: number): number {
  if (totalBalls === 0) return 0
  const overs = totalBalls / 6
  return overs > 0 ? parseFloat((runs / overs).toFixed(2)) : 0
}

/**
 * Calculates required run rate
 */
export function calculateRequiredRunRate(
  runsNeeded: number,
  ballsRemaining: number
): number {
  if (ballsRemaining === 0) return 0
  const oversRemaining = ballsRemaining / 6
  return oversRemaining > 0
    ? parseFloat((runsNeeded / oversRemaining).toFixed(2))
    : 0
}

/**
 * Determines if an over was a maiden (no runs conceded)
 */
export function isMaidenOver(runsInOver: number, wicketsInOver: number): boolean {
  return runsInOver === 0 && wicketsInOver >= 0
}

/**
 * Validates bowler selection (cannot bowl consecutive overs)
 */
export function canBowlerBowlNextOver(
  bowlerId: string,
  previousOverBowlerId: string | null
): boolean {
  if (!previousOverBowlerId) return true
  return bowlerId !== previousOverBowlerId
}

/**
 * Calculates match result text
 */
export function calculateMatchResult(
  team1Name: string,
  team2Name: string,
  team1Score: number,
  team1Wickets: number,
  team2Score: number,
  team2Wickets: number,
  currentInnings: number
): {
  winnerTeam: 1 | 2 | null
  resultText: string
} {
  if (team1Score === team2Score) {
    return {
      winnerTeam: null,
      resultText: 'Match Tied',
    }
  }

  if (team1Score > team2Score) {
    const margin = team1Score - team2Score
    return {
      winnerTeam: 1,
      resultText: `${team1Name} won by ${margin} runs`,
    }
  } else {
    const wicketsRemaining = 10 - team2Wickets
    return {
      winnerTeam: 2,
      resultText: `${team2Name} won by ${wicketsRemaining} wickets`,
    }
  }
}

/**
 * Calculates target for second innings
 */
export function calculateTarget(firstInningsScore: number): number {
  return firstInningsScore + 1
}
