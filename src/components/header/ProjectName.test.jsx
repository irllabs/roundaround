import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectName from './ProjectName'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setUser, setRound, setRounds } from '../../redux/actions'

// Duplicating a round reaches the default round data, and that reaches Tone.js. No sound is made
// here, and loading Tone only buys a banner on stdout.
vi.mock('tone', () => ({}))

const me = { id: 'me', displayName: 'Ada Lovelace', color: '#f44336' }
const round = { id: 'r1', name: 'Jam', layers: [], contributors: ['me'] }

function renderProjectName() {
    const store = makeStore()
    store.dispatch(setUser(me))
    store.dispatch(setRound(round))
    store.dispatch(setRounds([round]))
    const firebase = { createRound: vi.fn().mockResolvedValue() }
    const view = renderWithProviders(
        <><ProjectName name={round.name} /><LocationProbe /></>,
        { store, firebase, route: '/play/r1' }
    )
    return { store, firebase, ...view }
}

/** Opens the menu the way a person does, and hands back the store. */
async function openMenu(user) {
    const view = renderProjectName()
    await user.click(screen.getByRole('button', { name: /Jam/ }))
    await screen.findByRole('menu')
    return view
}

describe('ProjectName', () => {
    it('selects the round it is about while its menu is open, and unselects it after', async () => {
        const user = userEvent.setup()
        const { store } = await openMenu(user)

        expect(store.getState().display.selectedRoundId).toBe('r1')
        expect(screen.getByRole('menu')).toHaveAttribute('id', 'project-name-menu')

        await user.keyboard('{Escape}')

        await waitFor(() => expect(store.getState().display.selectedRoundId).toBeNull())
    })

    it('opens the rename dialog', async () => {
        const user = userEvent.setup()
        const { store } = await openMenu(user)

        await user.click(screen.getByRole('menuitem', { name: 'Rename' }))

        expect(store.getState().display.isShowingRenameDialog).toBe(true)
        expect(store.getState().display.selectedRoundId).toBe('r1')
    })

    it('opens the delete dialog', async () => {
        const user = userEvent.setup()
        const { store } = await openMenu(user)

        await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

        expect(store.getState().display.isShowingDeleteRoundDialog).toBe(true)
        expect(store.getState().display.selectedRoundId).toBe('r1')
    })

    it('duplicates the round and opens the copy', async () => {
        const user = userEvent.setup()
        const { store, firebase } = await openMenu(user)

        await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

        await waitFor(() => expect(firebase.createRound).toHaveBeenCalled())
        const copy = firebase.createRound.mock.calls[0][0]
        expect(copy.id).not.toBe('r1')
        expect(store.getState().rounds.map(each => each.id)).toEqual([copy.id, 'r1'])
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/play/' + copy.id))
    })
})
