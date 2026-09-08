import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectName from './ProjectName'
import DeleteRoundDialog from '../dialogs/DeleteRoundDialog'
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

    // The menu item that opens Rename or Delete unmounts in the same commit the dialog opens in:
    // one click handler closes the popover and raises the dialog, and React commits both together.
    // AppDialog captured that item as the thing to give focus back to, found it detached at close
    // time and dropped the restore, so Escape landed focus on <body>. MUI put it on the round-name
    // button, and this is the path that proves we do too.
    //
    // Only the close-time restore is asserted. Where focus sits while the dialog is up is Radix's
    // FocusScope reacting to focusin, and jsdom's focusin semantics are not Chrome's; the served
    // build is checked for the open path by docs/ui-baseline/keyboard.py instead.
    it('gives focus back to the round-name button when a dialog opened from its menu closes', async () => {
        const user = userEvent.setup()
        const store = makeStore()
        store.dispatch(setUser(me))
        store.dispatch(setRound(round))
        store.dispatch(setRounds([round]))
        renderWithProviders(
            <><ProjectName name={round.name} /><DeleteRoundDialog /></>,
            { store, firebase: { deleteRound: vi.fn() }, route: '/play/r1' }
        )
        // taken before anything opens: Radix aria-hides the rest of the page while the dialog is up
        const trigger = screen.getByRole('button', { name: /Jam/ })

        await user.click(trigger)
        await screen.findByRole('menu')
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
        const dialog = await screen.findByRole('dialog')

        // Put focus back on the paper before closing, or this test passes whatever AppDialog does.
        // The popover's own FocusScope returns focus to the trigger from a setTimeout, so it fires
        // after the dialog has mounted and taken focus -- and in jsdom the dialog's FocusScope does
        // not pull it back, because jsdom's focusin does not behave as Chrome's does. So by the
        // time Escape is pressed the trigger is already focused and would still be focused if the
        // restore did nothing at all. Focusing the paper is the state Chrome is actually in.
        dialog.focus()

        await user.keyboard('{Escape}')
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(trigger).toHaveFocus()
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
