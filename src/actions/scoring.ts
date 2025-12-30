'use server'

import { MatchEngine } from '@/lib/cricket/match-engine'
import { WicketType } from '@/types/match'
import { revalidatePath } from 'next/cache'

/**
 * Record runs scored
 */
export async function recordRuns(data: {
  matchId: string
  runs: number
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordRuns(
    data.runs,
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a wide delivery
 */
export async function recordWide(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  additionalRuns?: number
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordWide(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.additionalRuns || 0
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a no ball
 */
export async function recordNoBall(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  additionalRuns?: number
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordNoBall(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.additionalRuns || 0
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a wicket
 */
export async function recordWicket(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  wicketType: WicketType
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordWicket(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.wicketType
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}
