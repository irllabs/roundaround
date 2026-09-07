import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import { createTheme, ThemeProvider } from '@material-ui/core/styles'
import Header from './Header'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setUser, setUsers, setRound } from '../../redux/actions'

// The header reaches Tone.js through the tempo slider and the default round data. Who is in a
// round has nothing to do with audio, and loading Tone here only buys a banner on stdout.
vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { setTempo: vi.fn() } }))

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
