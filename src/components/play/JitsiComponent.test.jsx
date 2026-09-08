import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JitsiComponent from './JitsiComponent'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setUser } from '../../redux/actions'

// Not `setup`: eslint-plugin-testing-library resolves the `setup` in `userEvent.setup()` to
// whatever `setup` this scope binds, and a local one that returns a render makes every
// `const user = userEvent.setup()` below read as an undestructured render result.
function mountJitsi(firebase = {}) {
    const store = makeStore()
    store.dispatch(setUser({ id: 'me', displayName: 'Me', color: '#f44336' }))
    store.dispatch(setRound({ id: 'r1', currentUsers: ['me'], layers: [] }))
    return renderWithProviders(<JitsiComponent />, { store, firebase })
}

describe('JitsiComponent', () => {
    it('offers to start a call, with the microphone control disabled until one is running', () => {
        mountJitsi()
        expect(screen.getByRole('button', { name: 'Start voice chat' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Unmute the microphone' })).toBeDisabled()
        expect(screen.getByTestId('voice-chat')).toBeInTheDocument()
    })

    it('comes back to the start button when the Jitsi API is not on the page', async () => {
        const user = userEvent.setup()
        mountJitsi({ getJitsiToken: vi.fn() })
        await user.click(screen.getByRole('button', { name: 'Start voice chat' }))
        expect(await screen.findByRole('button', { name: 'Start voice chat' })).toBeInTheDocument()
    })
})
