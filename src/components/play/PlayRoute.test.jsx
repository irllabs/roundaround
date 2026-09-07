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
        loadUser: vi.fn().mockResolvedValue(me),
        createUserBus: vi.fn().mockResolvedValue(),
        saveUserPatterns: vi.fn().mockResolvedValue(),
        joinRound: vi.fn().mockResolvedValue()
    }
    return { firebase, unsubs, listeners }
}

function roundWithMembers(members) {
    return {
        id: 'r1', name: 'Jam', createdBy: 'owner', bpm: 120, swing: 0, currentUsers: members, layers: [],
        userBuses: Object.fromEntries(members.map(id => [id, { id, fx: [] }])),
        userPatterns: Object.fromEntries(members.map(id => [id, { id, patterns: [], sequence: [] }]))
    }
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
