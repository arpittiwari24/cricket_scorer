/**
 * Local storage-based scoring system for instant, lag-free match scoring
 * All scoring happens locally and syncs to database only when match completes
 */

export interface LocalMatchState {
  matchId: string
  match: any
  battingStats: any[]
  bowlingStats: any[]
  balls: any[]
  lastUpdated: number
}

const STORAGE_KEY_PREFIX = 'cricket_match_'
const HISTORY_KEY_PREFIX = 'cricket_match_history_'

/**
 * Save match state to localStorage
 */
export function saveLocalMatchState(matchId: string, state: Omit<LocalMatchState, 'matchId' | 'lastUpdated'>) {
  const localState: LocalMatchState = {
    matchId,
    ...state,
    lastUpdated: Date.now()
  }

  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + matchId, JSON.stringify(localState))
    return true
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    return false
  }
}

/**
 * Load match state from localStorage
 */
export function loadLocalMatchState(matchId: string): LocalMatchState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + matchId)
    if (!data) return null

    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Clear local match state (after successful sync to database)
 */
export function clearLocalMatchState(matchId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + matchId)
    clearStateHistory(matchId)
    return true
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
    return false
  }
}

/**
 * Initialize local match state from database data
 */
export function initializeLocalMatchState(matchId: string, match: any, battingStats: any[], bowlingStats: any[], balls: any[]) {
  return saveLocalMatchState(matchId, {
    match,
    battingStats,
    bowlingStats,
    balls
  })
}

/**
 * Check if local scoring is active for a match
 */
export function hasLocalMatchState(matchId: string): boolean {
  return localStorage.getItem(STORAGE_KEY_PREFIX + matchId) !== null
}

/**
 * Save a state snapshot to history for undo functionality
 */
export function saveStateSnapshot(matchId: string, state: Omit<LocalMatchState, 'matchId' | 'lastUpdated'>) {
  try {
    const historyKey = HISTORY_KEY_PREFIX + matchId
    const stateSnapshot = JSON.stringify(state)
    localStorage.setItem(historyKey, stateSnapshot)
    return true
  } catch (error) {
    console.error('Failed to save state snapshot:', error)
    return false
  }
}

/**
 * Load the previous state snapshot from history
 */
export function loadStateSnapshot(matchId: string): Omit<LocalMatchState, 'matchId' | 'lastUpdated'> | null {
  try {
    const historyKey = HISTORY_KEY_PREFIX + matchId
    const data = localStorage.getItem(historyKey)
    if (!data) return null

    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load state snapshot:', error)
    return null
  }
}

/**
 * Clear state history
 */
export function clearStateHistory(matchId: string) {
  try {
    const historyKey = HISTORY_KEY_PREFIX + matchId
    localStorage.removeItem(historyKey)
    return true
  } catch (error) {
    console.error('Failed to clear state history:', error)
    return false
  }
}

/**
 * Update match score locally
 */
export function updateLocalScore(
  matchId: string,
  runs: number,
  isWide: boolean = false,
  isNoBall: boolean = false,
  isWicket: boolean = false,
  wicketType?: string
) {
  const state = loadLocalMatchState(matchId)
  if (!state) return null

  const { match, battingStats, bowlingStats, balls } = state
  const isFirstInnings = match.current_innings === 1

  // Update match score
  const totalRuns = isWide || isNoBall ? runs + 1 : runs

  if (isFirstInnings) {
    match.team1_score += totalRuns
    if (!isWide && !isNoBall) {
      match.team1_balls++
      if (match.team1_balls >= 6) {
        match.team1_overs++
        match.team1_balls = 0
      }
    }
    if (isWicket && wicketType !== 'retired_hurt') {
      match.team1_wickets++
    }
  } else {
    match.team2_score += totalRuns
    if (!isWide && !isNoBall) {
      match.team2_balls++
      if (match.team2_balls >= 6) {
        match.team2_overs++
        match.team2_balls = 0
      }
    }
    if (isWicket && wicketType !== 'retired_hurt') {
      match.team2_wickets++
    }
  }

  saveLocalMatchState(matchId, { match, battingStats, bowlingStats, balls })
  return state
}
