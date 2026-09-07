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
