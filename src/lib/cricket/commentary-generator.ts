/**
 * Auto-generated cricket commentary
 * Randomly picks commentary lines based on delivery type
 */

const DOT_BALL_COMMENTARY = [
  "bowling ki dhar bastman pareshan",
]

const SINGLE_COMMENTARY = [
  "nudges it to mid-wicket for a single",
  "works it away for one",
  "pushes it into the gap, quick single",
  "taps and runs, good running between the wickets",
  "turned away to square leg for one",
  "glanced down to fine leg",
  "pushed to cover, easy single",
  "clips it off the pads for a single",
  "drives to mid-off, takes the single",
  "defended towards point, quick single taken",
  "good running, stolen single",
  "worked away on the leg side for one"
]

const TWO_RUNS_COMMENTARY = [
  "beautifully timed, they come back for two",
  "placed in the gap, good running between the wickets",
  "pushed through covers, comes back for the second",
  "excellent running, two runs added",
  "well placed, comfortably back for two",
  "nice shot, couple of runs",
  "driven through mid-wicket, they scamper back for two",
  "timed well but not perfectly, two runs"
]

const THREE_RUNS_COMMENTARY = [
  "great placement, three runs to the total",
  "running between the wickets is brilliant, three taken",
  "superb running, they complete three",
  "excellent shot placement, three runs",
  "well timed, picks up three runs",
  "placed perfectly in the gap, three runs added"
]

const FOUR_COMMENTARY = [
  "FOUR! Cracking shot!",
  "FOUR! Absolutely smashed!",
  "FOUR! What a shot, right out of the middle!",
  "FOUR! Glorious cover drive!",
  "FOUR! Timed to perfection!",
  "FOUR! Races away to the boundary!",
  "FOUR! Beautiful stroke!",
  "FOUR! No chance for the fielder!",
  "FOUR! Shot of the day!",
  "FOUR! Finds the gap perfectly!",
  "FOUR! Punched through covers!",
  "FOUR! Classy shot!",
  "FOUR! Drilled through mid-off!",
  "FOUR! Flicked away beautifully!",
  "FOUR! Cut away nicely!"
]

const SIX_COMMENTARY = [
  "SIX! HUGE! Out of the ground!",
  "SIX! What a monster hit!",
  "SIX! Into the stands!",
  "SIX! Absolutely massive!",
  "SIX! Clean as a whistle!",
  "SIX! That's gone the distance!",
  "SIX! Boom! Maximum!",
  "SIX! Murdered it!",
  "SIX! That's outta here!",
  "SIX! Sweet connection!",
  "SIX! Deposited into the crowd!",
  "SIX! What power!",
  "SIX! Sails over the rope!",
  "SIX! Bang! That's huge!"
]

const WICKET_COMMENTARY = [
  "WICKET! That's out! Big breakthrough!",
  "WICKET! Got him! The bowler is delighted!",
  "WICKET! What a delivery! Absolutely unplayable!",
  "WICKET! The batsman has to go!",
  "WICKET! Bowler strikes! Game changing moment!",
  "WICKET! That's the breakthrough they needed!",
  "WICKET! Gone! What a ball!",
  "WICKET! Cleaned him up!",
  "WICKET! Perfect delivery!",
  "WICKET! The crowd goes wild!",
  "WICKET! Bowler pumped up!",
  "WICKET! That's a beauty!",
  "WICKET! No answer to that one!"
]

const WIDE_COMMENTARY = [
  "wide down the leg side",
  "wide outside off, wayward delivery",
  "that's a wide, poor line",
  "wide called, pressure showing",
  "loses his line, wide ball",
  "sprayed down the leg side, wide",
  "too wide, extras added",
  "wide delivery, not even close to the stumps"
]

const NO_BALL_COMMENTARY = [
  "No Ball! Oversteps the crease",
  "No Ball! Front foot problem",
  "No Ball! That's overstepping",
  "No Ball! Bowler under pressure",
  "No Ball! Needs to watch that front foot",
  "No Ball! Free hit coming up!",
  "No Ball! Extra delivery"
]

/**
 * Generate commentary for a delivery
 */
export function generateCommentary(
  bowlerName: string,
  batsmanName: string,
  runs: number,
  ballType: 'legal' | 'wide' | 'noball' | 'wicket',
  _overNumber?: number,
  _ballNumber?: number,
  wicketType?: string
): string {
  let commentary = ""

  // Pick random commentary based on delivery type
  if (ballType === 'wicket') {
    // Add wicket type to commentary for more detail
    const baseCommentary = WICKET_COMMENTARY[Math.floor(Math.random() * WICKET_COMMENTARY.length)]
    commentary = wicketType ? `${baseCommentary} (${wicketType.replace('_', ' ')})` : baseCommentary
  } else if (ballType === 'wide') {
    commentary = WIDE_COMMENTARY[Math.floor(Math.random() * WIDE_COMMENTARY.length)]
  } else if (ballType === 'noball') {
    commentary = NO_BALL_COMMENTARY[Math.floor(Math.random() * NO_BALL_COMMENTARY.length)]
  } else {
    // Regular delivery - pick based on runs
    switch (runs) {
      case 0:
        commentary = DOT_BALL_COMMENTARY[Math.floor(Math.random() * DOT_BALL_COMMENTARY.length)]
        break
      case 1:
        commentary = SINGLE_COMMENTARY[Math.floor(Math.random() * SINGLE_COMMENTARY.length)]
        break
      case 2:
        commentary = TWO_RUNS_COMMENTARY[Math.floor(Math.random() * TWO_RUNS_COMMENTARY.length)]
        break
      case 3:
        commentary = THREE_RUNS_COMMENTARY[Math.floor(Math.random() * THREE_RUNS_COMMENTARY.length)]
        break
      case 4:
        commentary = FOUR_COMMENTARY[Math.floor(Math.random() * FOUR_COMMENTARY.length)]
        break
      case 6:
        commentary = SIX_COMMENTARY[Math.floor(Math.random() * SIX_COMMENTARY.length)]
        break
      default:
        commentary = `${runs} runs scored`
    }
  }

  // Format: "Bowler to Batsman, X runs, commentary" (ball number shown separately in UI)
  const runsText = ballType === 'wicket' ? 'OUT' :
                   ballType === 'wide' ? `${runs + 1} wides` :
                   ballType === 'noball' ? `${runs + 1} (nb)` :
                   runs === 0 ? 'dot ball' :
                   runs === 4 ? 'FOUR' :
                   runs === 6 ? 'SIX' :
                   `${runs} run${runs > 1 ? 's' : ''}`

  return `${bowlerName} to ${batsmanName}, ${runsText}, ${commentary}`
}

/**
 * Get player display name (shortened for commentary)
 */
export function getPlayerShortName(fullName: string): string {
  const parts = fullName.substring(0,8)
  if (parts.length === 1) return fullName

  // Return first initial + last name (e.g., "John Smith" -> "J Smith")
  return `${parts}`
}
