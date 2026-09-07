import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@material-ui/core/styles'
import Header from './Header'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser, setUsers, setRound, setRedirectAfterSignIn } from '../../redux/actions'

// The header reaches Tone.js through the tempo slider and the default round data. Who is in a
// round has nothing to do with audio, and loading Tone here only buys a banner on stdout.
vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { setTempo: vi.fn() } }))
// A new round picks a random sampler and articulation; the samples themselves are beside the point.
vi.mock('../../audio-engine/Instruments', () => ({
    default: {
        classes: vi.fn().mockResolvedValue({ Kicks: { sampleKeys: ['a'] } }),
        getRandomArticulation: vi.fn().mockResolvedValue('a')
    }
}))

const me = { id: 'me', displayName: 'Ada Lovelace', color: '#f00' }
const here = { id: 'here', displayName: 'Grace Hopper', color: '#0f0' }
const gone = { id: 'gone', displayName: 'Alan Turing', color: '#00f' }

/** Every contributor has a profile in `users`; `currentUsers` says which of them are here now. */
function renderHeader(currentUsers) {
    const contributors = [me.id, here.id, gone.id]
    const store = makeStore()
    store.dispatch(setUser(me))
    store.dispatch(setUsers([me, here, gone]))
    store.dispatch(setRound({ id: 'r1', name: 'Jam', layers: [], currentUsers, contributors }))
    // The header watches for a sign-in; these tests are already signed in, so it never fires.
    const firebase = { onAuthStateChanged: vi.fn(() => vi.fn()) }
    // Voice chat styles itself from the theme, which the app provides around the whole tree.
    const ui = <ThemeProvider theme={createTheme({ palette: { type: 'dark' } })}><Header /></ThemeProvider>
    return { store, ...renderWithProviders(ui, { store, firebase, route: '/play/r1' }) }
}

describe('Header in a round', () => {
    it('gives an avatar to the people who are in the round now, not to everyone who has contributed', () => {
        renderHeader([me.id, here.id])

        expect(screen.getByText('AL')).toBeInTheDocument() // Ada Lovelace, that's me
        expect(screen.getByText('GH')).toBeInTheDocument() // Grace Hopper, here too
        expect(screen.queryByText('AT')).not.toBeInTheDocument() // Alan Turing has left
        expect(screen.getAllByTestId('header')).toHaveLength(2)
    })

    it('opens voice chat when somebody else is in the round now', () => {
        renderHeader([me.id, here.id])

        expect(screen.getByTestId('voice-chat')).toBeInTheDocument()
    })

    it('leaves voice chat alone when everybody else has left', () => {
        renderHeader([me.id])

        expect(screen.getAllByTestId('header')).toHaveLength(1)
        expect(screen.queryByTestId('voice-chat')).not.toBeInTheDocument()
    })
})

/** Signs somebody in through the callback the header hands to `onAuthStateChanged`. */
function renderSignedOutHeader(firebase) {
    const store = makeStore()
    store.dispatch(setRedirectAfterSignIn('/rounds'))
    const ui = (
        <ThemeProvider theme={createTheme({ palette: { type: 'dark' } })}>
            <Header />
            <LocationProbe />
        </ThemeProvider>
    )
    return { store, ...renderWithProviders(ui, { store, firebase, route: '/' }) }
}

describe('Header on sign-in', () => {
    it('gives a guest with no profile yet the round it just created for them', async () => {
        // A first "continue as guest": the header writes the profile itself, and the store's user
        // is still null. React 18 schedules the re-render `setUser` asks for rather than doing it
        // there and then, so reading the id back off props here would read null and throw.
        const authUser = { uid: 'guest-1', isAnonymous: true, displayName: 'Guest' }
        let onAuthStateChanged
        const firebase = {
            onAuthStateChanged: vi.fn(callback => { onAuthStateChanged = callback; return vi.fn() }),
            loadUser: vi.fn().mockResolvedValue(null),
            createUser: vi.fn().mockResolvedValue(),
            createRound: vi.fn().mockResolvedValue()
        }
        const { store } = renderSignedOutHeader(firebase)

        await act(async () => { await onAuthStateChanged(authUser) })

        expect(store.getState().user).toMatchObject({ id: 'guest-1', isGuest: true })
        expect(firebase.createRound).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'guest-1' }))
        const newRound = firebase.createRound.mock.calls[0][0]
        expect(store.getState().rounds.map(round => round.id)).toEqual([newRound.id])
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play/' + newRound.id))
        expect(store.getState().display.redirectAfterSignIn).toBeNull()
    })

    it('sends a signed-in user with a profile where they were headed', async () => {
        const authUser = { uid: 'me', isAnonymous: false, displayName: 'Ada Lovelace' }
        let onAuthStateChanged
        const firebase = {
            onAuthStateChanged: vi.fn(callback => { onAuthStateChanged = callback; return vi.fn() }),
            loadUser: vi.fn().mockResolvedValue(me),
            getRoundsList: vi.fn().mockResolvedValue([{ id: 'r1', name: 'Jam' }]),
            getSamples: vi.fn().mockResolvedValue([]),
            createRound: vi.fn().mockResolvedValue()
        }
        const { store } = renderSignedOutHeader(firebase)

        await act(async () => { await onAuthStateChanged(authUser) })

        expect(firebase.createRound).not.toHaveBeenCalled()
        expect(store.getState().rounds.map(round => round.id)).toEqual(['r1'])
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/rounds'))
    })
})
