import { getDefaultRoundData, getDefaultUserBus, getDefaultUserPatterns } from '../utils/defaultData'

export const USER_ID = 'user-1'
export const COLLABORATOR_ID = 'user-2'

/**
 * The round a new user gets from `defaultData`, with a collaborator already in it: three layers of
 * sixteen steps, a bus and a set of patterns per user. This is the shape the round reducer sees.
 */
export async function makeRound() {
    const round = await getDefaultRoundData(USER_ID)
    round.userBuses[COLLABORATOR_ID] = getDefaultUserBus(COLLABORATOR_ID)
    round.userPatterns[COLLABORATOR_ID] = getDefaultUserPatterns(COLLABORATOR_ID)
    round.currentUsers = [USER_ID, COLLABORATOR_ID]
    return round
}
