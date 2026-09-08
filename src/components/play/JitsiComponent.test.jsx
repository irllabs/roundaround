import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { act, screen, waitFor } from '@testing-library/react'
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

// The Jitsi API the component builds a call on, stubbed down to the four members `join` uses.
// `videoConferenceJoined` is not fired for us -- the test fires it, because that handler is what
// takes the call out of its connecting state and into the one with a Leave button.
class FakeJitsiApi {
    constructor(domain, options) {
        FakeJitsiApi.last = this
        this.domain = domain
        this.options = options
        this.handlers = {}
        this.commands = []
    }
    on(event, handler) { this.handlers[event] = handler }
    isVideoMuted() { return Promise.resolve(false) }
    executeCommand(command) { this.commands.push(command) }
    dispose() {}
}

afterEach(() => {
    delete window.JitsiMeetExternalAPI
    FakeJitsiApi.last = undefined
})

describe('JitsiComponent', () => {
    it('offers to start a call, with the microphone control disabled until one is running', () => {
        mountJitsi()
        expect(screen.getByRole('button', { name: 'Start voice chat' })).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Unmute the microphone' })).toBeDisabled()
        expect(screen.getByTestId('voice-chat')).toBeInTheDocument()
    })

    it('comes back to the start button when the Jitsi API is not on the page', async () => {
        const user = userEvent.setup()
        const getJitsiToken = vi.fn()
        mountJitsi({ getJitsiToken })
        await user.click(screen.getByRole('button', { name: 'Start voice chat' }))

        expect(await screen.findByRole('button', { name: 'Start voice chat' })).toBeInTheDocument()
        // The join has to have got as far as the JitsiMeetExternalAPI check and turned back
        // there: a `join` that did nothing at all would pass the assertion above too.
        expect(getJitsiToken).not.toHaveBeenCalled()
    })

    it('joins the round\'s own room and offers to leave it', async () => {
        const user = userEvent.setup()
        const getJitsiToken = vi.fn().mockResolvedValue({ token: 'jwt', appId: 'app', room: 'room' })
        window.JitsiMeetExternalAPI = FakeJitsiApi
        mountJitsi({ getJitsiToken })

        await user.click(screen.getByRole('button', { name: 'Start voice chat' }))
        // Waited for, not asserted straight away: the connecting state is the first setState of
        // `join` and is on screen before the token is asked for, so it proves nothing about the
        // call being built. The constructed API is what does.
        await waitFor(() => expect(FakeJitsiApi.last).toBeDefined())
        // The client says which round it is in and nothing else; the backend picks the tenant
        // and the room off that id.
        expect(getJitsiToken).toHaveBeenCalledWith('r1')
        expect(FakeJitsiApi.last.domain).toBe('8x8.vc')
        expect(FakeJitsiApi.last.options.roomName).toBe('app/room')
        expect(FakeJitsiApi.last.options.jwt).toBe('jwt')

        // Jitsi says the call is up; the component turns the camera off and stops connecting.
        await act(async () => { await FakeJitsiApi.last.handlers.videoConferenceJoined() })
        expect(await screen.findByRole('button', { name: 'Leave voice chat' })).toBeInTheDocument()
        expect(FakeJitsiApi.last.commands).toContain('toggleVideo')
    })
})
