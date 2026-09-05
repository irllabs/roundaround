import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import PlayRoute from './PlayRoute'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser } from '../../redux/actions'

jest.mock('../../audio-engine/AudioEngine', () => ({
    init: jest.fn().mockResolvedValue(),
    load: jest.fn().mockResolvedValue(),
    stop: jest.fn(),
    startAudioContext: jest.fn(),
    setTempo: jest.fn(),
    setSwing: jest.fn(),
    addUser: jest.fn(),
    busesByUser: {}
}))
jest.mock('../../audio-engine/Instruments', () => ({ init: jest.fn() }))
jest.mock('../../audio-engine/FX', () => ({ init: jest.fn() }))
jest.mock('../../audio-engine/CustomSamples', () => ({ init: jest.fn() }))
jest.mock('./PlayUI', () => () => null)
jest.mock('./EffectsSidebar', () => () => null)
jest.mock('./layer-settings/LayerSettings', () => () => null)
jest.mock('../dialogs/ShareDialog', () => () => null)
jest.mock('../dialogs/OrientationDialog', () => () => null)

const me = { id: 'me', displayName: 'Me', color: '#fff' }

function makeFirebase({ round }) {
    const unsubs = { round: jest.fn(), layers: jest.fn(), userBuses: jest.fn(), userPatterns: jest.fn(), user: jest.fn() }
    const subCollections = {
        layers: { onSnapshot: jest.fn(() => unsubs.layers) },
        userBuses: { onSnapshot: jest.fn(() => unsubs.userBuses) },
        userPatterns: { onSnapshot: jest.fn(() => unsubs.userPatterns) }
    }
    const roundDoc = { onSnapshot: jest.fn(() => unsubs.round), collection: jest.fn(name => subCollections[name]) }
    const userDoc = { onSnapshot: jest.fn(() => unsubs.user) }
    const db = { collection: jest.fn(name => ({ doc: jest.fn(() => (name === 'rounds' ? roundDoc : userDoc)) })) }
    const firebase = {
        db,
        getRound: typeof round === 'function' ? jest.fn(round) : jest.fn().mockResolvedValue(round),
        loadUser: jest.fn().mockResolvedValue(me),
        createUserBus: jest.fn().mockResolvedValue(),
        saveUserPatterns: jest.fn().mockResolvedValue(),
        joinRound: jest.fn().mockResolvedValue()
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
    beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))
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
