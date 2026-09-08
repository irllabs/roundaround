import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteRoundDialog from './DeleteRoundDialog'
import { renderWithProviders, makeStore, LocationProbe } from '../../test/test-utils'
import { setRound, setRounds, setSelectedRoundId, setIsShowingDeleteRoundDialog } from '../../redux/actions'

function setup({ round = null, deleteRound, route = '/rounds' }) {
    const store = makeStore()
    store.dispatch(setRounds([{ id: 'r1', name: 'One' }, { id: 'r2', name: 'Two' }]))
    store.dispatch(setRound(round))
    store.dispatch(setSelectedRoundId('r1'))
    store.dispatch(setIsShowingDeleteRoundDialog(true))
    const firebase = { deleteRound }
    const utils = renderWithProviders(<><DeleteRoundDialog /><LocationProbe /></>, { store, firebase, route })
    return { store, firebase, ...utils }
}

describe('DeleteRoundDialog', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => console.error.mockRestore())

    it('removes the round from the list and closes', async () => {
        const { store, firebase } = setup({ deleteRound: vi.fn().mockResolvedValue() })
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
        await waitFor(() => expect(store.getState().display.isShowingDeleteRoundDialog).toBe(false))
        expect(firebase.deleteRound).toHaveBeenCalledWith({ id: 'r1' })
        expect(store.getState().rounds.map(r => r.id)).toEqual(['r2'])
    })

    it('shows the error and stays open when deletion fails', async () => {
        const { store } = setup({ deleteRound: vi.fn().mockRejectedValue(new Error('permission denied')) })
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('permission denied')
        expect(store.getState().display.isShowingDeleteRoundDialog).toBe(true)
        expect(store.getState().rounds).toHaveLength(2)
    })

    // Radix owns the dismiss the MUI Dialog's onClose handler used to; the flag is what proves
    // it reached the store rather than only unmounting the paper.
    it('closes on Escape without deleting anything', async () => {
        const { store, firebase } = setup({ deleteRound: vi.fn().mockResolvedValue() })
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(store.getState().display.isShowingDeleteRoundDialog).toBe(false))
        expect(firebase.deleteRound).not.toHaveBeenCalled()
    })

    // Spinner ships role="status" aria-label="Loading", which would rename the button it replaces
    // the label of; the button has to stay findable as "Delete" throughout.
    it('keeps the Delete button named Delete while the round is being deleted', async () => {
        let finish
        const { store } = setup({ deleteRound: vi.fn(() => new Promise((resolve) => { finish = resolve })) })
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

        const deleting = screen.getByRole('button', { name: 'Delete' })
        expect(deleting).toBeDisabled()
        expect(deleting).toHaveAttribute('aria-busy', 'true')
        expect(screen.queryByRole('status')).toBeNull()

        // This is the app's only contained button that is ever disabled, so it is where MUI's
        // disabled Button is held: rgba(255,255,255,0.3) on rgba(255,255,255,0.12) and no opacity
        // change at all. The generated Button's `disabled:opacity-50` fades glyph and fill
        // together and has to be turned back off, not merely overpainted, so its absence is what
        // is asserted rather than only the presence of the three replacements.
        expect(deleting).toHaveClass('disabled:opacity-100', 'disabled:bg-white/12', 'disabled:text-white/30')
        expect(deleting).not.toHaveClass('disabled:opacity-50')

        finish()
        await waitFor(() => expect(store.getState().display.isShowingDeleteRoundDialog).toBe(false))
    })

    // Cancel carries autoFocus, so Radix's FocusScope never dispatches its mount event -- the
    // paper already holds the active element. AppDialog therefore cannot learn the opener from
    // that event, and this is the dialog that proves it learns it anyway.
    it('gives focus back to whatever opened it, though Cancel takes the autoFocus', async () => {
        const store = makeStore()
        store.dispatch(setRounds([{ id: 'r1', name: 'One' }]))
        store.dispatch(setSelectedRoundId('r1'))
        renderWithProviders(
            <>
                <button onClick={() => store.dispatch(setIsShowingDeleteRoundDialog(true))}>delete round</button>
                <DeleteRoundDialog />
            </>,
            { store, firebase: { deleteRound: vi.fn() } }
        )
        // taken before the dialog opens: Radix aria-hides everything outside it while it is up
        const trigger = screen.getByRole('button', { name: 'delete round' })
        await userEvent.click(trigger)
        expect(await screen.findByRole('button', { name: 'Cancel' })).toHaveFocus()

        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(store.getState().display.isShowingDeleteRoundDialog).toBe(false))
        expect(trigger).toHaveFocus()
    })

    it('leaves the round when the open round is deleted', async () => {
        setup({
            round: { id: 'r1', name: 'One', layers: [], currentUsers: [] },
            deleteRound: vi.fn().mockResolvedValue(),
            route: '/play/r1'
        })
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/rounds'))
    })
})
