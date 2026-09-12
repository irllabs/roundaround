import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import LandingPageRoute from './LandingPageRoute'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser } from '../../redux/actions'

// A guest's "Get started" builds a round out of the default round data, and that reaches Tone.js.
// No sound is made here, and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))
// The new round picks a random sampler and articulation; the samples themselves are beside the point.
vi.mock('../../audio-engine/Instruments', () => ({
    default: {
        classes: vi.fn().mockResolvedValue({ Kicks: { sampleKeys: ['a'] } }),
        getRandomArticulation: vi.fn().mockResolvedValue('a')
    }
}))

/** Renders the route the way App.jsx does, so it is handed a `history` to push onto. */
function renderLandingPage(user) {
    const store = makeStore()
    if (user) {
        store.dispatch(setUser(user))
    }
    const firebase = { createRound: vi.fn().mockResolvedValue() }
    const view = renderWithProviders(
        <><Routes><Route path="*" element={<LandingPageRoute />} /></Routes><LocationProbe /></>,
        { store, firebase, route: '/' }
    )
    return { store, firebase, ...view }
}

describe('LandingPageRoute', () => {
    it('asks a visitor who is not signed in to sign in, and remembers where they were headed', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderLandingPage(null)

        await user.click(screen.getByTestId('button-get-started'))

        expect(store.getState().display.redirectAfterSignIn).toBe('/rounds')
        expect(store.getState().display.isShowingSignInDialog).toBe(true)
        expect(firebase.createRound).not.toHaveBeenCalled()
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    })

    it('sends a signed-in user to their rounds list', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderLandingPage({ id: 'me', displayName: 'Ada Lovelace', isGuest: false })

        await user.click(screen.getByTestId('button-get-started'))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/rounds'))
        expect(firebase.createRound).not.toHaveBeenCalled()
        expect(store.getState().display.isShowingSignInDialog).toBe(false)
    })

    it('gives a guest a round of their own instead of a rounds list', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderLandingPage({ id: 'guest-1', displayName: 'Guest', isGuest: true })

        await user.click(screen.getByTestId('button-get-started'))

        await waitFor(() => expect(firebase.createRound).toHaveBeenCalled())
        const newRound = firebase.createRound.mock.calls[0][0]
        expect(newRound.createdBy).toBe('guest-1')
        expect(store.getState().rounds.map(round => round.id)).toEqual([newRound.id])
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play/' + newRound.id))
    })
})
