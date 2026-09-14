/**
 * The Firebase wrapper, in memory, for the Playwright suite.
 *
 * This file is never part of a production bundle: vite.config.js aliases `./firebase/firebase`
 * to it only when the build runs with `--mode test`, so `vite build` (the mode the deploy uses)
 * neither imports nor parses it. Nothing here reaches the network.
 *
 * It implements the same contract as src/firebase/firebase.js -- the same method names, the same
 * arguments, the same shapes out -- because the app holds the wrapper in a React context and never
 * touches an SDK object itself. Where the real wrapper reads a Firestore document, this reads a
 * plain object; where it opens an onSnapshot, this keeps a listener in a Set and calls it when the
 * matching part of the store changes, first delivery included, the way Firestore does.
 *
 * The page's seed (`window.__ROUNDS_TEST_SEED__`, set by Playwright before any app code runs)
 * decides who is signed in and what rounds exist. Without one the store is empty and nobody is
 * signed in, which is what the landing page expects.
 */
import _ from 'lodash'

/** Every document is cloned on the way in and on the way out, so the app can never mutate the store. */
const copy = (value) => _.cloneDeep(value)

/** A round as it is stored: the document's own fields, with the sub-collections taken out. */
function splitRound (round) {
    const document = copy(round)
    delete document.layers
    delete document.userBuses
    delete document.userPatterns
    return {
        document,
        layers: _.keyBy(copy(round.layers || []), 'id'),
        userBuses: copy(round.userBuses || {}),
        userPatterns: copy(round.userPatterns || {})
    }
}

class FirebaseTestDouble {
    constructor () {
        const seed = (typeof window !== 'undefined' && window.__ROUNDS_TEST_SEED__) || {}
        this.store = {
            users: _.keyBy(copy(seed.users || []), 'id'),
            rounds: {},
            layers: {},
            userBuses: {},
            userPatterns: {},
            samples: _.keyBy(copy(seed.samples || []), 'id')
        }
        for (const round of seed.rounds || []) {
            const { document, layers, userBuses, userPatterns } = splitRound(round)
            this.store.rounds[round.id] = document
            this.store.layers[round.id] = layers
            this.store.userBuses[round.id] = userBuses
            this.store.userPatterns[round.id] = userPatterns
        }
        this.authUser = copy(seed.authUser) || null
        this.authListeners = new Set()
        // keyed by what they watch, so a write only wakes the listeners that care
        this.listeners = { user: new Map(), round: new Map(), sub: new Map() }
        // what the app asked this double to do, for tests that assert on the calls themselves
        this.calls = []
        // errors the app reported; a test can assert the run produced none
        this.reportedErrors = []
        // how far the fake server clock is from this page's clock, milliseconds
        this.serverOffsetMs = (typeof seed.serverOffsetMs === 'number') ? seed.serverOffsetMs : 0
        if (typeof window !== 'undefined') {
            // the same probe the real wrapper exposes, so a test can reach the store it is driving
            window.__roundaroundFirebase = this
        }
    }

    /** Records a call, so a test can assert what the UI asked Firebase to do, and in what order. */
    record (name, args) {
        this.calls.push({ name, args: copy(args) })
    }

    // *** Listeners ***

    /** Adds `fn` to the set at `key` in `map` and returns the unsubscribe, as onSnapshot does. */
    watch (map, key, fn) {
        if (!map.has(key)) {
            map.set(key, new Set())
        }
        map.get(key).add(fn)
        return () => {
            const set = map.get(key)
            if (set) {
                set.delete(fn)
            }
        }
    }

    notify (map, key, payload) {
        for (const fn of map.get(key) || []) {
            fn(copy(payload))
        }
    }

    /** Wakes the round document's watchers. */
    notifyRound (roundId) {
        const round = this.store.rounds[roundId]
        this.notify(this.listeners.round, roundId, { exists: !_.isNil(round), data: round })
    }

    /**
     * Wakes a sub-collection's watchers with one change, in the shape Firestore's docChanges gives:
     * `{ type, id, data }`.
     */
    notifySub (roundId, name, type, id, data) {
        this.notify(this.listeners.sub, `${roundId}/${name}`, [{ type, id, data }])
    }

    // *** Auth ***

    onAuthStateChanged = (cb) => {
        this.authListeners.add(cb)
        // Firebase delivers the current state on subscribe, asynchronously
        Promise.resolve().then(() => cb(copy(this.authUser)))
        return () => this.authListeners.delete(cb)
    }

    /** Signs `user` in (or out, with null) and tells everyone watching. */
    setAuthUser (user) {
        this.authUser = copy(user)
        for (const cb of this.authListeners) {
            cb(copy(this.authUser))
        }
        return this.authUser
    }

    signInWithGoogle = async () => {
        this.record('signInWithGoogle', {})
        return this.setAuthUser({ uid: 'google-user', isAnonymous: false, displayName: 'Google User', email: 'google@example.com', photoURL: null })
    }

    signInWithEmail = async (email) => {
        this.record('signInWithEmail', { email })
        const profile = _.find(this.store.users, { email })
        if (_.isNil(profile)) {
            const error = new Error('There is no user record corresponding to this identifier.')
            error.code = 'auth/user-not-found'
            throw error
        }
        return this.setAuthUser({ uid: profile.id, isAnonymous: false, displayName: profile.name || null, email, photoURL: profile.photoURL || null })
    }

    signUpWithEmail = async (email) => {
        this.record('signUpWithEmail', { email })
        return this.setAuthUser({ uid: `signed-up-${Object.keys(this.store.users).length + 1}`, isAnonymous: false, displayName: null, email, photoURL: null })
    }

    signInAnonymously = async () => {
        this.record('signInAnonymously', {})
        return this.setAuthUser({ uid: `guest-${Object.keys(this.store.users).length + 1}`, isAnonymous: true, displayName: null, email: null, photoURL: null })
    }

    signOut = async () => {
        this.record('signOut', {})
        this.setAuthUser(null)
    }

    // *** Users ***

    loadUser = async (id) => {
        const user = this.store.users[id]
        return _.isNil(user) ? null : copy(user)
    }

    createUser = async (userData) => {
        this.record('createUser', userData)
        const id = userData.id
        const user = copy(userData)
        delete user.id
        // merge, as the real wrapper's setDoc({ merge: true }) does
        this.store.users[id] = { ...(this.store.users[id] || {}), ...user, id }
        this.notify(this.listeners.user, id, { exists: true, data: this.store.users[id] })
    }

    updateUser = async (id, userData) => {
        this.record('updateUser', { id, userData })
        const user = copy(userData)
        delete user.id
        this.store.users[id] = { ...(this.store.users[id] || {}), ...user, id }
        this.notify(this.listeners.user, id, { exists: true, data: this.store.users[id] })
    }

    subscribeToUser = (userId, onNext) => {
        const user = this.store.users[userId]
        Promise.resolve().then(() => onNext({ exists: !_.isNil(user), data: copy(user) }))
        return this.watch(this.listeners.user, userId, onNext)
    }

    // *** Cloud Functions ***

    getJitsiToken = async (roundId) => {
        this.record('getJitsiToken', { roundId })
        // the video call is not exercised by these tests; the route treats a failure as "no call"
        throw new Error('Jitsi is not available in the test double')
    }

    createShortLink = async (roundId) => {
        this.record('createShortLink', { roundId })
        return `https://rounds.test/${roundId}`
    }

    // *** Rounds ***

    getRoundsList = async (userId, minimumVersion = 1) => {
        return _.chain(this.store.rounds)
            .filter(round => round.createdBy === userId && round.dataVersion >= minimumVersion)
            .orderBy(['createdAt'], ['desc'])
            .map(copy)
            .value()
    }

    getRound = async (roundId) => {
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            return null
        }
        const [layers, userBuses, userPatterns] = await Promise.all([
            this.getLayers(roundId),
            this.getUserBuses(roundId),
            this.getUserPatterns(roundId)
        ])
        return { ...copy(round), id: roundId, layers, userBuses, userPatterns }
    }

    getLayers = async (roundId) => _.values(copy(this.store.layers[roundId] || {}))

    getUserBuses = async (roundId) => copy(this.store.userBuses[roundId] || {})

    getUserPatterns = async (roundId) => copy(this.store.userPatterns[roundId] || {})

    subscribeToRound = (roundId, onNext) => {
        const round = this.store.rounds[roundId]
        Promise.resolve().then(() => onNext({ exists: !_.isNil(round), data: copy(round) }))
        return this.watch(this.listeners.round, roundId, onNext)
    }

    subscribeToRoundSubCollection = (roundId, name, onChanges) => {
        const documents = this.store[name][roundId] || {}
        // Firestore's first snapshot carries every existing document as an `added` change
        Promise.resolve().then(() => onChanges(_.map(copy(documents), (data, id) => ({ type: 'added', id, data }))))
        return this.watch(this.listeners.sub, `${roundId}/${name}`, onChanges)
    }

    subscribeToLayers = (roundId, onChanges) => this.subscribeToRoundSubCollection(roundId, 'layers', onChanges)

    subscribeToUserBuses = (roundId, onChanges) => this.subscribeToRoundSubCollection(roundId, 'userBuses', onChanges)

    subscribeToUserPatterns = (roundId, onChanges) => this.subscribeToRoundSubCollection(roundId, 'userPatterns', onChanges)

    createRound = async (data) => {
        this.record('createRound', { id: data.id })
        const { document, layers, userBuses, userPatterns } = splitRound(data)
        document.createdAt = Date.now()
        this.store.rounds[data.id] = document
        this.store.layers[data.id] = layers
        this.store.userBuses[data.id] = userBuses
        this.store.userPatterns[data.id] = userPatterns
        return copy(document)
    }

    updateRound = async (roundId, data) => {
        this.record('updateRound', { roundId, data })
        this.store.rounds[roundId] = { ...(this.store.rounds[roundId] || {}), ...copy(data) }
        this.notifyRound(roundId)
    }

    deleteRound = async (roundId) => {
        this.record('deleteRound', { roundId })
        delete this.store.rounds[roundId]
        delete this.store.layers[roundId]
        delete this.store.userBuses[roundId]
        delete this.store.userPatterns[roundId]
        this.notifyRound(roundId)
    }

    // *** Layers ***

    createLayer = async (roundId, layerData) => {
        this.record('createLayer', { roundId, layerId: layerData.id })
        this.store.layers[roundId] = this.store.layers[roundId] || {}
        this.store.layers[roundId][layerData.id] = copy(layerData)
        this.notifySub(roundId, 'layers', 'added', layerData.id, this.store.layers[roundId][layerData.id])
    }

    updateLayer = async (roundId, layerId, data) => {
        this.record('updateLayer', { roundId, layerId, data })
        const layers = this.store.layers[roundId] || {}
        layers[layerId] = { ...(layers[layerId] || {}), ...copy(data) }
        this.store.layers[roundId] = layers
        this.notifySub(roundId, 'layers', 'modified', layerId, layers[layerId])
    }

    deleteLayer = async (roundId, layerId) => {
        this.record('deleteLayer', { roundId, layerId })
        const layers = this.store.layers[roundId] || {}
        const removed = layers[layerId]
        delete layers[layerId]
        this.notifySub(roundId, 'layers', 'removed', layerId, removed)
    }

    // *** Busses and patterns ***

    createUserBus = async (roundId, id, userBus) => {
        this.record('createUserBus', { roundId, id })
        const bus = copy(userBus)
        delete bus.id
        this.store.userBuses[roundId] = this.store.userBuses[roundId] || {}
        this.store.userBuses[roundId][id] = bus
        this.notifySub(roundId, 'userBuses', 'added', id, bus)
    }

    updateUserBus = async (roundId, id, data) => {
        this.record('updateUserBus', { roundId, id, data })
        const buses = this.store.userBuses[roundId] || {}
        buses[id] = { ...(buses[id] || {}), ...copy(data) }
        this.store.userBuses[roundId] = buses
        this.notifySub(roundId, 'userBuses', 'modified', id, buses[id])
    }

    saveUserPatterns = async (roundId, userId, userPatterns) => {
        this.record('saveUserPatterns', { roundId, userId })
        const patterns = copy(userPatterns)
        delete patterns.id
        this.store.userPatterns[roundId] = this.store.userPatterns[roundId] || {}
        this.store.userPatterns[roundId][userId] = patterns
        this.notifySub(roundId, 'userPatterns', 'modified', userId, patterns)
    }

    // *** Membership ***

    /** Unions the user into `currentUsers` and `contributors`, as the real join does. */
    joinRound = async (roundId, userId) => {
        this.record('joinRound', { roundId, userId })
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            throw new Error(`No such round: ${roundId}`)
        }
        round.currentUsers = _.union(round.currentUsers || [], [userId])
        round.contributors = _.union(round.contributors || [], [userId])
        this.notifyRound(roundId)
    }

    /** The pre-contributors join: `currentUsers` only. */
    joinRoundLegacy = async (roundId, userId) => {
        this.record('joinRoundLegacy', { roundId, userId })
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            throw new Error(`No such round: ${roundId}`)
        }
        round.currentUsers = _.union(round.currentUsers || [], [userId])
        this.notifyRound(roundId)
    }

    leaveRound = async (roundId, userId) => {
        this.record('leaveRound', { roundId, userId })
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            return
        }
        round.currentUsers = _.without(round.currentUsers || [], userId)
        this.notifyRound(roundId)
    }

    backfillContributors = async (roundId, contributors) => {
        this.record('backfillContributors', { roundId, contributors })
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            return
        }
        round.contributors = _.union(round.contributors || [], contributors)
        this.notifyRound(roundId)
    }

    // *** Shared transport ***

    setRoundPlayback = async (roundId, { playing, by, bpm, startedAtMs }) => {
        this.record('setRoundPlayback', { roundId, playing, by, bpm, startedAtMs })
        const round = this.store.rounds[roundId]
        if (_.isNil(round)) {
            return
        }
        round.playback = {
            playing: playing === true,
            by: by || null,
            bpm: _.isNil(bpm) ? null : bpm,
            // the real wrapper writes a server timestamp; here the fake server clock stands in
            startedAt: playing ? (startedAtMs ?? (Date.now() + this.serverOffsetMs)) : null
        }
        this.notifyRound(roundId)
    }

    /** The clock estimate, without the round trips: the offset the seed asked for, straight away. */
    sampleServerClock = async () => {
        const t0 = Date.now()
        return { t0, t1: t0, serverMs: t0 + this.serverOffsetMs }
    }

    // *** Samples ***

    createSample = async (sample) => {
        this.record('createSample', { id: sample.id })
        this.store.samples[sample.id] = copy(sample)
    }

    getSample = async (id) => copy(this.store.samples[id]) || null

    updateSample = async (id, sample) => {
        this.record('updateSample', { id })
        this.store.samples[id] = { ...(this.store.samples[id] || {}), ...copy(sample) }
    }

    deleteSampleFile = async (id) => {
        this.record('deleteSampleFile', { id })
        delete this.store.samples[id]
    }

    getSamples = async (userId) => _.filter(copy(this.store.samples), { createdBy: userId })

    // *** Analytics and errors ***

    initAnalytics = () => {}

    reportError = (error, info = {}) => {
        this.reportedErrors.push({ message: error && error.message ? error.message : String(error), ...info })
    }
}

export default FirebaseTestDouble
