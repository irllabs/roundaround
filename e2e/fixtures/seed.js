/**
 * The seed the Playwright suite hands the page: who is signed in, and what rounds exist. The
 * in-memory Firebase double (src/firebase/testDouble.js) reads it off `window.__ROUNDS_TEST_SEED__`
 * before any app code runs, so every test starts from a round it named itself.
 *
 * Every id here is fixed rather than generated, so a test can address a step by its id and a
 * failure names the same thing twice running.
 */

export const USER_ID = 'test-user'
export const OTHER_USER_ID = 'other-user'
export const ROUND_ID = 'test-round'

/** The signed-in user's profile, as the app's users collection stores it. */
export const user = (overrides = {}) => ({
    id: USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    color: '#2196f3',
    ...overrides
})

/** A collaborator, for the rounds that need a second set of rings. */
export const otherUser = (overrides = {}) => ({
    id: OTHER_USER_ID,
    name: 'Other User',
    email: 'other@example.com',
    color: '#f44336',
    ...overrides
})

/** The auth user the double reports; `isAnonymous` is what the guest flow turns on. */
export const authUser = (overrides = {}) => ({
    uid: USER_ID,
    isAnonymous: false,
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: null,
    ...overrides
})

/**
 * One step. Ids are `<layerId>-s<index>`, so a spec can click `[data-step-hit="kicks-s0"]` without
 * reading anything back out of the page first.
 */
export const step = (layerId, index, isOn = false, overrides = {}) => ({
    id: `${layerId}-s${index}`,
    order: index,
    isOn,
    velocity: 1,
    probability: 1,
    note: 'C4',
    ...overrides
})

/**
 * A layer with `stepCount` steps, the ones at `on` switched on.
 * @param {object} o
 * @param {string} o.id the layer id, and the prefix of every step id in it
 * @param {string} [o.createdBy] whose ring it is
 * @param {number} [o.stepCount]
 * @param {number[]} [o.on] indexes of the steps that start on
 */
export const layer = ({ id, createdBy = USER_ID, stepCount = 16, on = [], sampler = 'Kicks', sample = 'growl', name = 'Layer', createdAt = 1000, ...overrides }) => ({
    id,
    createdBy,
    name,
    type: 'TRACK_TYPE_LAYER',
    timeOffset: 0,
    percentOffset: 0,
    isActive: true,
    isMuted: false,
    isPreviewed: false,
    gain: -6,
    instrument: { noteLength: '64n', instrument: 'Sampler', sampler, sample },
    steps: Array.from({ length: stepCount }, (unused, i) => step(id, i, on.includes(i))),
    createdAt,
    ...overrides
})

/** The six effects every user bus carries, all on, in the order the sidebar draws them. */
const userBusFx = (userId) => ['pingpong', 'autowah', 'delay', 'distortion', 'lowpass', 'highpass']
    .map((name, order) => ({ id: `${userId}-fx-${name}`, name, order, isOn: true, isOverride: false }))

export const userBus = (userId = USER_ID) => ({ id: userId, fx: userBusFx(userId) })

/** The eight pattern slots (A to H) and the eight sequence slots, all empty. */
export const userPatterns = (userId = USER_ID, overrides = {}) => ({
    id: userId,
    isQueuing: '',
    isPlayingSequence: false,
    sequence: Array(8).fill(false),
    patterns: Array.from({ length: 8 }, (unused, order) => ({ id: `${userId}-pattern-${order}`, order, state: {} })),
    ...overrides
})

/**
 * The round the suite plays: three of this user's rings, a kick on every beat, a snare on the
 * backbeat, and an empty hat ring to switch steps on in.
 */
export const round = ({ id = ROUND_ID, createdBy = USER_ID, members = [USER_ID], layers: roundLayers, ...overrides } = {}) => {
    const layersForRound = roundLayers || [
        layer({ id: 'kicks', name: 'Kicks', sampler: 'Kicks', sample: 'growl', stepCount: 16, on: [0, 4, 8, 12], createdAt: 1000 }),
        layer({ id: 'snares', name: 'Snares', sampler: 'Snares', sample: 'royale', stepCount: 8, on: [2, 6], createdAt: 1001 }),
        layer({ id: 'hats', name: 'HiHats', sampler: 'HiHats', sample: 'tight', stepCount: 16, on: [], createdAt: 1002 })
    ]
    const members_ = [...members]
    return {
        id,
        createdBy,
        dataVersion: 1.5,
        bpm: 120,
        swing: 0,
        name: 'Test Round',
        createdAt: 2000,
        currentUsers: members_,
        contributors: members_,
        layers: layersForRound,
        userBuses: Object.fromEntries(members_.map(memberId => [memberId, userBus(memberId)])),
        userPatterns: Object.fromEntries(members_.map(memberId => [memberId, userPatterns(memberId)])),
        ...overrides
    }
}

/**
 * The whole seed: a signed-in user with one round. Pass overrides to change any part of it.
 * @returns {{ authUser: object|null, users: object[], rounds: object[], samples: object[], serverOffsetMs: number }}
 */
export const seed = (overrides = {}) => ({
    authUser: authUser(),
    users: [user()],
    rounds: [round()],
    samples: [],
    serverOffsetMs: 0,
    ...overrides
})

/** A seed with nobody signed in: the landing page as a first-time visitor sees it. */
export const signedOutSeed = (overrides = {}) => seed({ authUser: null, users: [], rounds: [], ...overrides })
