import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import PlayRoute from './PlayRoute'
import AudioEngine from '../../audio-engine/AudioEngine'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser } from '../../redux/actions'

vi.mock('../../audio-engine/AudioEngine', () => ({
    default: {
        init: vi.fn().mockResolvedValue(),
        load: vi.fn().mockResolvedValue(),
        stop: vi.fn(),
        startAudioContext: vi.fn(),
        setTempo: vi.fn(),
        setSwing: vi.fn(),
        addUser: vi.fn(),
        busesByUser: {}
    }
}))
vi.mock('../../audio-engine/Instruments', () => ({ default: { init: vi.fn() } }))
vi.mock('../../audio-engine/FX', () => ({ default: { init: vi.fn() } }))
vi.mock('../../audio-engine/CustomSamples', () => ({ default: { init: vi.fn() } }))
vi.mock('./PlayUI', () => ({ default: () => null }))
vi.mock('./EffectsSidebar', () => ({ default: () => null }))
vi.mock('./layer-settings/LayerSettings', () => ({ default: () => null }))
vi.mock('../dialogs/ShareDialog', () => ({ default: () => null }))
vi.mock('../dialogs/OrientationDialog', () => ({ default: () => null }))

const me = { id: 'me', displayName: 'Me', color: '#fff' }

/**
 * A stand-in for the Firebase wrapper. Every subscribe method hands back an unsubscribe and keeps
 * the delivered callback in `listeners`, so a test can push a snapshot through it.
 */
function makeFirebase({ round }) {
    const unsubs = { round: vi.fn(), layers: vi.fn(), userBuses: vi.fn(), userPatterns: vi.fn(), user: vi.fn() }
    const listeners = {}
    const subscribe = name => vi.fn((id, onNext) => {
        listeners[name] = onNext
        return unsubs[name]
    })
    const firebase = {
        subscribeToRound: subscribe('round'),
        subscribeToLayers: subscribe('layers'),
        subscribeToUserBuses: subscribe('userBuses'),
        subscribeToUserPatterns: subscribe('userPatterns'),
        subscribeToUser: subscribe('user'),
        getRound: typeof round === 'function' ? vi.fn(round) : vi.fn().mockResolvedValue(round),
        loadUser: vi.fn(async (id) => (id === me.id ? me : { id, displayName: id, color: '#0f0' })),
        createUserBus: vi.fn().mockResolvedValue(),
        saveUserPatterns: vi.fn().mockResolvedValue(),
        joinRound: vi.fn().mockResolvedValue(),
        leaveRound: vi.fn().mockResolvedValue(),
        backfillContributors: vi.fn().mockResolvedValue()
    }
    return { firebase, unsubs, listeners }
}

/**
 * A round with `members` in it now, and `contributors` who have been in it at some point. The two
 * lists are separate arrays, as they are in a document that comes back from Firestore.
 */
function roundWithMembers(members, contributors = [...members]) {
    return {
        id: 'r1', name: 'Jam', createdBy: 'owner', bpm: 120, swing: 0, currentUsers: members, contributors, layers: [],
        userBuses: Object.fromEntries(members.map(id => [id, { id, fx: [] }])),
        userPatterns: Object.fromEntries(members.map(id => [id, { id, patterns: [], sequence: [] }]))
    }
}

/** A `pageshow`, as the browser fires it after a load (persisted false) or a cache restore (true). */
function pageShow(persisted) {
    const event = new Event('pageshow')
    event.persisted = persisted
    return event
}

function renderRoute(firebase) {
    const store = makeStore()
    store.dispatch(setUser(me))
    return { store, ...renderWithProviders(<><Route path="/play" component={PlayRoute} /><LocationProbe /></>, { store, firebase, route: '/play/r1' }) }
}

describe('PlayRoute', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
    afterEach(() => console.error.mockRestore())

    it('subscribes to the round, its sub-collections and its users, and unsubscribes from all of them on unmount', async () => {
        const { firebase, unsubs } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store, unmount } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.subscribeToRound).toHaveBeenCalledTimes(1)
        expect(firebase.subscribeToLayers).toHaveBeenCalledTimes(1)
        expect(firebase.subscribeToUserBuses).toHaveBeenCalledTimes(1)
        expect(firebase.subscribeToUserPatterns).toHaveBeenCalledTimes(1)
        expect(firebase.subscribeToUser).toHaveBeenCalledWith('me', expect.any(Function), expect.any(Function))
        expect(firebase.joinRound).not.toHaveBeenCalled() // already a member

        unmount()
        for (const unsubscribe of Object.values(unsubs)) {
            expect(unsubscribe).toHaveBeenCalledTimes(1)
        }
        expect(store.getState().round).toBeNull()
    })

    it('applies a tempo change delivered by the round subscription', async () => {
        const { firebase, listeners } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => listeners.round({ exists: true, data: { ...roundWithMembers(['me']), bpm: 140 } }))

        expect(AudioEngine.setTempo).toHaveBeenCalledWith(140)
        expect(store.getState().round.bpm).toBe(140)
    })

    it('adds a user bus delivered by the sub-collection subscription', async () => {
        const { firebase, listeners } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => listeners.userBuses([{ type: 'added', id: 'them', data: { fx: [] } }]))

        expect(store.getState().round.userBuses.them).toMatchObject({ id: 'them' })
        expect(AudioEngine.addUser).toHaveBeenCalledWith('them', [])
    })

    it('puts an old round\'s effect order right before it reaches the store or the audio engine', async () => {
        const legacy = ['pingpong', 'lowpass', 'highpass', 'autowah', 'delay', 'distortion']
            .map((name, order) => ({ id: 'fx-' + name, name, order, isOn: true, isOverride: false }))
        const round = roundWithMembers(['me'])
        round.userBuses.me.fx = legacy
        const { firebase } = makeFirebase({ round })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        const inStore = store.getState().round.userBuses.me.fx.map(fx => fx.name)
        expect(inStore).toEqual(['pingpong', 'autowah', 'delay', 'lowpass', 'highpass', 'distortion'])
        // the sidebar reads the store and the chain reads what load() was given: they must agree
        expect(AudioEngine.load.mock.calls.at(-1)[0].userBuses.me.fx.map(fx => fx.name)).toEqual(inStore)
    })

    it('goes back to the rounds list when the round is deleted while playing', async () => {
        const { firebase, listeners } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => listeners.round({ exists: false, data: undefined }))

        expect(screen.getByTestId('location')).toHaveTextContent('/rounds')
    })

    it('joins a round atomically on the first visit and creates the user documents', async () => {
        const { firebase } = makeFirebase({ round: roundWithMembers(['owner']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.createUserBus).toHaveBeenCalledWith('r1', 'me', expect.objectContaining({ id: 'me' }))
        expect(firebase.saveUserPatterns).toHaveBeenCalledWith('r1', 'me', expect.objectContaining({ id: 'me' }))
        expect(firebase.joinRound).toHaveBeenCalledWith('r1', 'me')
        expect(store.getState().round.currentUsers).toEqual(['owner', 'me'])
        expect(store.getState().round.contributors).toEqual(['owner', 'me'])
        expect(firebase.backfillContributors).not.toHaveBeenCalled() // the round already has the field
    })

    it('takes the user out of the round when the play route goes away', async () => {
        const { firebase } = makeFirebase({ round: roundWithMembers(['owner', 'me']) })
        const { store, unmount } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.leaveRound).not.toHaveBeenCalled()

        unmount()
        expect(firebase.leaveRound).toHaveBeenCalledWith('r1', 'me')
    })

    it('leaves the round when the page goes away, and only once', async () => {
        const { firebase } = makeFirebase({ round: roundWithMembers(['owner', 'me']) })
        const { store, unmount } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => { window.dispatchEvent(new Event('pagehide')) })
        expect(firebase.leaveRound).toHaveBeenCalledWith('r1', 'me')

        unmount()
        expect(firebase.leaveRound).toHaveBeenCalledTimes(1)
    })

    it('puts a member who is missing from the stored contributors into it', async () => {
        // a round joined through a client that knew nothing about contributors, or a duplicate that
        // inherited the list from the round it was copied from
        const { firebase } = makeFirebase({ round: roundWithMembers(['owner', 'me'], ['owner']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.joinRound).toHaveBeenCalledWith('r1', 'me') // unions into both lists
        expect(firebase.createUserBus).not.toHaveBeenCalled() // already a member: nothing to set up
        expect(store.getState().round.contributors).toEqual(['owner', 'me'])
        expect(store.getState().users.map(user => user.id)).toEqual(['owner', 'me'])
    })

    it('puts the user back in the round when the page comes out of the back/forward cache', async () => {
        const { firebase } = makeFirebase({ round: roundWithMembers(['owner', 'me']) })
        const { store, unmount } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.joinRound).not.toHaveBeenCalled() // already a member

        await act(async () => { window.dispatchEvent(new Event('pagehide')) })
        expect(firebase.leaveRound).toHaveBeenCalledTimes(1)

        // a page that was only loaded, not restored, must not rejoin anybody
        await act(async () => { window.dispatchEvent(pageShow(false)) })
        expect(firebase.joinRound).not.toHaveBeenCalled()

        await act(async () => { window.dispatchEvent(pageShow(true)) })
        expect(firebase.joinRound).toHaveBeenCalledWith('r1', 'me')

        unmount()
        expect(firebase.leaveRound).toHaveBeenCalledTimes(2) // and leaves again on the way out
    })

    it('keeps a profile for every contributor, not only for the people in the round now', async () => {
        const { firebase } = makeFirebase({ round: roundWithMembers(['me'], ['owner', 'me', 'gone']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(store.getState().users.map(user => user.id)).toEqual(['owner', 'me', 'gone'])
        expect(firebase.loadUser).toHaveBeenCalledWith('gone')
        expect(firebase.subscribeToUser).toHaveBeenCalledWith('gone', expect.any(Function), expect.any(Function))
    })

    it('follows currentUsers when the round listener reports somebody leaving, and keeps their profile', async () => {
        const { firebase, listeners } = makeFirebase({ round: roundWithMembers(['owner', 'me']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => listeners.round({ exists: true, data: { ...roundWithMembers(['owner', 'me']), currentUsers: ['me'] } }))

        expect(store.getState().round.currentUsers).toEqual(['me'])
        expect(store.getState().round.contributors).toEqual(['owner', 'me'])
        expect(store.getState().users.map(user => user.id)).toEqual(['owner', 'me'])
    })

    it('loads a profile for a contributor the round listener has not seen before', async () => {
        const { firebase, listeners } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        await act(async () => listeners.round({
            exists: true,
            data: { ...roundWithMembers(['me']), currentUsers: ['me', 'them'], contributors: ['me', 'them'] }
        }))

        expect(store.getState().users.map(user => user.id)).toEqual(['me', 'them'])
        expect(store.getState().round.contributors).toEqual(['me', 'them'])
        expect(store.getState().round.currentUsers).toEqual(['me', 'them'])
    })

    it('gives a round saved without contributors the list it should have had', async () => {
        const round = roundWithMembers(['owner', 'me'])
        delete round.contributors
        round.layers = [{ id: 'l1', createdBy: 'gone', steps: [] }]
        const { firebase } = makeFirebase({ round })
        const { store } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(firebase.backfillContributors).toHaveBeenCalledWith('r1', ['owner', 'me', 'gone'])
        expect(store.getState().round.contributors).toEqual(['owner', 'me', 'gone'])
        expect(store.getState().users.map(user => user.id)).toEqual(['owner', 'me', 'gone'])
    })

    it('shows an error instead of spinning forever when loading fails', async () => {
        const { firebase } = makeFirebase({ round: () => Promise.reject(new Error('Missing or insufficient permissions')) })
        renderRoute(firebase)

        expect(await screen.findByRole('alert')).toHaveTextContent('Missing or insufficient permissions')
        expect(firebase.getRound).toHaveBeenCalledTimes(1) // no retry loop
    })

    it('goes back to the rounds list when the round does not exist', async () => {
        const { firebase } = makeFirebase({ round: null })
        renderRoute(firebase)
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/rounds'))
    })
})
