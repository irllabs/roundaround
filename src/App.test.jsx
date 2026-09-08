import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import App from './App'
import { FirebaseContext } from './firebase'
import { makeStore } from './test/test-utils'
import { setUser, setIsShowingSignInDialog } from './redux/actions'

// The header reaches Tone.js through the tempo slider and the default round data. Nothing here
// makes a sound, and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))
vi.mock('./audio-engine/AudioEngine', () => ({ default: { setTempo: vi.fn() } }))
vi.mock('./audio-engine/Instruments', () => ({
    default: {
        classes: vi.fn().mockResolvedValue({ Kicks: { sampleKeys: ['a'] } }),
        getRandomArticulation: vi.fn().mockResolvedValue('a')
    }
}))
// This is about the shell, not the play route, and PlayUI pulls in svg.panzoom.js, which wants a
// global SVG that jsdom has not been given. Every Route App mounts is mounted either way.
vi.mock('./components/play/PlayRoute', () => ({ default: () => null }))

const me = { id: 'me', displayName: 'Ada Lovelace', color: '#f44336' }

/**
 * App mounts its own BrowserRouter, so the route is the address bar rather than a prop.
 */
function renderApp(path) {
    window.history.pushState({}, '', path)
    const store = makeStore()
    store.dispatch(setUser(me))
    // The header watches for a sign-in; this session is already signed in, so it never fires.
    const firebase = { onAuthStateChanged: vi.fn(() => vi.fn()) }
    render(
        <Provider store={store}>
            <FirebaseContext.Provider value={firebase}>
                <App />
            </FirebaseContext.Provider>
        </Provider>
    )
    return { store }
}

afterEach(() => {
    window.history.pushState({}, '', '/')
})

describe('App', () => {
    // RoundsListRoute used to render a SignInDialog of its own on top of this one, both bound to
    // the same flag, so /rounds put two Radix dialogs on the same focus trap. The route's copy is
    // gone; this is what says the remaining one is still reachable from /rounds, and that there
    // is exactly one of it.
    it('mounts exactly one sign-in dialog on /rounds', () => {
        const { store } = renderApp('/rounds')
        // Really on the rounds list, not in the ErrorBoundary's fallback.
        expect(screen.getByTestId('button-new-round')).toBeInTheDocument()

        act(() => { store.dispatch(setIsShowingSignInDialog(true)) })

        // queryAllBy, not getAllBy: two dialogs on one flag is the failure this guards against,
        // and two Radix dialogs fighting over the same trap render zero, not two.
        expect(screen.queryAllByRole('dialog')).toHaveLength(1)
        expect(screen.queryAllByTestId('button-guest')).toHaveLength(1)
    })
})
