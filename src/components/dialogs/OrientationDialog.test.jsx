import { describe, it, expect } from 'vitest'
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrientationDialog from './OrientationDialog'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setIsShowingOrientationDialog } from '../../redux/actions'

function setup(isShowing) {
    const store = makeStore()
    if (isShowing) {
        store.dispatch(setIsShowingOrientationDialog(true))
    }
    return { store, ...renderWithProviders(<OrientationDialog />, { store }) }
}

describe('OrientationDialog', () => {
    // capture.py asserts `gone('#orientation-dialog-title')` on the phone shot, so the id on the
    // title is what tells the gate no orientation dialog is covering the round.
    it('shows the rotate message under the id the phone capture looks for', () => {
        setup(true)
        expect(screen.getByText('Please rotate your device to landscape mode')).toHaveAttribute('id', 'orientation-dialog-title')
        expect(screen.getByText(/The round needs the wider layout/)).toBeInTheDocument()
    })

    it('closes on Escape', async () => {
        const { store } = setup(true)
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(store.getState().display.isShowingOrientationDialog).toBe(false))
    })

    it('renders nothing while the flag is unset', () => {
        setup(false)
        expect(screen.queryByRole('dialog')).toBeNull()
        // eslint-disable-next-line testing-library/no-node-access
        expect(document.querySelector('#orientation-dialog-title')).toBeNull()
    })
})
