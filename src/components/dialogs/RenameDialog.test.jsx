import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RenameDialog from './RenameDialog'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setRounds, setSelectedRoundId, setIsShowingRenameDialog } from '../../redux/actions'

function setup({ round, rounds, selectedRoundId }) {
    const store = makeStore()
    store.dispatch(setRounds(rounds))
    store.dispatch(setRound(round))
    store.dispatch(setSelectedRoundId(selectedRoundId))
    store.dispatch(setIsShowingRenameDialog(true))
    const firebase = { updateRound: vi.fn().mockResolvedValue() }
    return { store, firebase, ...renderWithProviders(<RenameDialog />, { store, firebase }) }
}

describe('RenameDialog', () => {
    it('renames a round that is open but was created by someone else', async () => {
        const { store, firebase } = setup({
            round: { id: 'shared', name: 'Their jam', createdBy: 'them', layers: [], currentUsers: [] },
            rounds: [], // only rounds created by this user are listed
            selectedRoundId: 'shared'
        })
        const input = screen.getByLabelText('Round name')
        expect(input).toHaveValue('Their jam')
        userEvent.clear(input)
        userEvent.type(input, 'Our jam{enter}')

        await waitFor(() => expect(firebase.updateRound).toHaveBeenCalledWith('shared', { name: 'Our jam' }))
        expect(store.getState().round.name).toBe('Our jam')
        expect(store.getState().display.isShowingRenameDialog).toBe(false)
    })

    it('renames a listed round from the rounds page', async () => {
        const { store, firebase } = setup({
            round: null,
            rounds: [{ id: 'mine', name: 'Old' }, { id: 'other', name: 'Other' }],
            selectedRoundId: 'mine'
        })
        const input = screen.getByLabelText('Round name')
        expect(input).toHaveValue('Old')
        userEvent.clear(input)
        userEvent.type(input, 'New')
        userEvent.click(screen.getByRole('button', { name: 'Rename' }))

        await waitFor(() => expect(firebase.updateRound).toHaveBeenCalledWith('mine', { name: 'New' }))
        expect(store.getState().rounds.map(r => r.name)).toEqual(['New', 'Other'])
    })

    it('ignores an empty name', () => {
        const { firebase } = setup({ round: null, rounds: [{ id: 'mine', name: 'Old' }], selectedRoundId: 'mine' })
        userEvent.clear(screen.getByLabelText('Round name'))
        userEvent.click(screen.getByRole('button', { name: 'Rename' }))
        expect(firebase.updateRound).not.toHaveBeenCalled()
    })
})
