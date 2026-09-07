import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import PlayRoute from './PlayRoute'
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

function makeFirebase({ round }) {
    const unsubs = { round: vi.fn(), layers: vi.fn(), userBuses: vi.fn(), userPatterns: vi.fn(), user: vi.fn() }
    const subCollections = {
        layers: { onSnapshot: vi.fn(() => unsubs.layers) },
        userBuses: { onSnapshot: vi.fn(() => unsubs.userBuses) },
        userPatterns: { onSnapshot: vi.fn(() => unsubs.userPatterns) }
    }
    const roundDoc = { onSnapshot: vi.fn(() => unsubs.round), collection: vi.fn(name => subCollections[name]) }
    const userDoc = { onSnapshot: vi.fn(() => unsubs.user) }
    const db = { collection: vi.fn(name => ({ doc: vi.fn(() => (name === 'rounds' ? roundDoc : userDoc)) })) }
    const firebase = {
        db,
        getRound: typeof round === 'function' ? vi.fn(round) : vi.fn().mockResolvedValue(round),
        loadUser: vi.fn().mockResolvedValue(me),
        createUserBus: vi.fn().mockResolvedValue(),
        saveUserPatterns: vi.fn().mockResolvedValue(),
        joinRound: vi.fn().mockResolvedValue()
    }
    return { firebase, unsubs, roundDoc, subCollections }
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
        const { firebase, unsubs, roundDoc, subCollections } = makeFirebase({ round: roundWithMembers(['me']) })
        const { store, unmount } = renderRoute(firebase)

        await waitFor(() => expect(store.getState().round).not.toBeNull())
        expect(roundDoc.onSnapshot).toHaveBeenCalledTimes(1)
        expect(subCollections.layers.onSnapshot).toHaveBeenCalledTimes(1)
        expect(subCollections.userBuses.onSnapshot).toHaveBeenCalledTimes(1)
        expect(subCollections.userPatterns.onSnapshot).toHaveBeenCalledTimes(1)
        expect(firebase.joinRound).not.toHaveBeenCalled() // already a member

        unmount()
        for (const unsubscribe of Object.values(unsubs)) {
            expect(unsubscribe).toHaveBeenCalledTimes(1)
        }
        expect(store.getState().round).toBeNull()
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
