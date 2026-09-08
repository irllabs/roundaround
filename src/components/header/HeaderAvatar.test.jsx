import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HeaderAvatar from './HeaderAvatar'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setUser, setUsers, setRound, setRounds } from '../../redux/actions'

const me = { id: 'me', displayName: 'Ada Lovelace', color: '#f44336' }

function renderAvatar({ shouldShowMenu = true, users = [me], route = '/play/r1' } = {}) {
    const store = makeStore()
    store.dispatch(setUser(me))
    store.dispatch(setUsers(users))
    store.dispatch(setRound({ id: 'r1', name: 'Jam', layers: [] }))
    store.dispatch(setRounds([{ id: 'r1', name: 'Jam' }]))
    const firebase = { signOut: vi.fn(), updateUser: vi.fn() }
    const view = renderWithProviders(
        <HeaderAvatar user={me} users={users} shouldShowMenu={shouldShowMenu} />,
        { store, firebase, route }
    )
    return { store, firebase, ...view }
}

describe('HeaderAvatar', () => {
    it('shows the initials of a user with no picture and marks the button signed in', () => {
        renderAvatar()

        expect(screen.getByText('AL')).toBeInTheDocument()
        // Cypress's `login` command waits on [data-test=button-sign-in-out].signed-in, so the
        // class and the hook have to stay on the same element.
        expect(screen.getByTestId('button-sign-in-out')).toHaveClass('signed-in')
    })

    it('opens its menu from a programmatic click, the way capture.py opens it', async () => {
        renderAvatar()

        await act(async () => { screen.getByTestId('button-sign-in-out').click() })

        expect(await screen.findByRole('menu')).toHaveAttribute('id', 'menu-list-grow')
        expect(screen.getByTestId('button-sign-out')).toBeInTheDocument()
    })

    it('recolours the user everywhere when a swatch is picked', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderAvatar()
        await user.click(screen.getByTestId('button-sign-in-out'))

        await user.click(await screen.findByTitle('#2196f3'))

        expect(firebase.updateUser).toHaveBeenCalledWith('me', { color: '#2196f3' })
        expect(store.getState().user.color).toBe('#2196f3')
        expect(store.getState().users[0].color).toBe('#2196f3')
    })

    it('saves the colour on /rounds, where nobody has joined a round and state.users is empty', async () => {
        const user = userEvent.setup()
        // React reports a throw inside an event handler as an uncaught error on window rather
        // than letting it out of the click, so the handler surviving has to be asserted directly.
        const thrown = []
        const onError = (event) => thrown.push(event.error || event.message)
        window.addEventListener('error', onError)
        const { store, firebase } = renderAvatar({ users: [], route: '/rounds' })
        await user.click(screen.getByTestId('button-sign-in-out'))

        await user.click(await screen.findByTitle('#2196f3'))
        window.removeEventListener('error', onError)

        // The write is the part that matters, and it used to throw on the line after it: the
        // round's own copy of this user is what state.users holds, and there is none here.
        expect(thrown).toEqual([])
        expect(firebase.updateUser).toHaveBeenCalledWith('me', { color: '#2196f3' })
        expect(store.getState().user.color).toBe('#2196f3')
        expect(store.getState().users).toEqual([])
    })

    it('signs out and empties everything the signed-in session held', async () => {
        const user = userEvent.setup()
        const { store, firebase } = renderAvatar()
        await user.click(screen.getByTestId('button-sign-in-out'))

        await user.click(await screen.findByTestId('button-sign-out'))

        expect(firebase.signOut).toHaveBeenCalled()
        expect(store.getState().user).toBeNull()
        expect(store.getState().round).toBeNull()
        expect(store.getState().rounds).toEqual([])
        expect(store.getState().users).toEqual([])
    })

    it('gives somebody else in the round an avatar with no menu behind it', () => {
        renderAvatar({ shouldShowMenu: false })

        expect(screen.getByText('AL')).toBeInTheDocument()
        expect(screen.queryByTestId('button-sign-in-out')).toBeNull()
        expect(screen.getByRole('button')).toBeDisabled()
    })
})
