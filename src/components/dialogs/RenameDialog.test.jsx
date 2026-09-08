import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { act, screen, waitFor } from '@testing-library/react'
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
        await userEvent.clear(input)
        await userEvent.type(input, 'Our jam{enter}')

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
        await userEvent.clear(input)
        await userEvent.type(input, 'New')
        await userEvent.click(screen.getByRole('button', { name: 'Rename' }))

        await waitFor(() => expect(firebase.updateRound).toHaveBeenCalledWith('mine', { name: 'New' }))
        expect(store.getState().rounds.map(r => r.name)).toEqual(['New', 'Other'])
    })

    it('keeps what is half typed when someone else renames the round underneath it', async () => {
        const { store } = setup({ round: null, rounds: [{ id: 'mine', name: 'Old' }], selectedRoundId: 'mine' })
        const input = screen.getByLabelText('Round name')
        await userEvent.clear(input)
        await userEvent.type(input, 'Mine')
        // a collaborator's rename arriving over the wire while this dialog is open
        act(() => { store.dispatch(setRounds([{ id: 'mine', name: 'Theirs' }])) })
        expect(input).toHaveValue('Mine')
    })

    it('re-seeds the box when the dialog is opened on a different round', async () => {
        const { store } = setup({ round: null, rounds: [{ id: 'mine', name: 'Old' }, { id: 'other', name: 'Other' }], selectedRoundId: 'mine' })
        expect(screen.getByLabelText('Round name')).toHaveValue('Old')
        act(() => {
            store.dispatch(setIsShowingRenameDialog(false))
            store.dispatch(setSelectedRoundId('other'))
            store.dispatch(setIsShowingRenameDialog(true))
        })
        expect(await screen.findByLabelText('Round name')).toHaveValue('Other')
    })

    it('ignores an empty name', async () => {
        const { firebase } = setup({ round: null, rounds: [{ id: 'mine', name: 'Old' }], selectedRoundId: 'mine' })
        await userEvent.clear(screen.getByLabelText('Round name'))
        await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
        expect(firebase.updateRound).not.toHaveBeenCalled()
    })
})
