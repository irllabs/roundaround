import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareDialog from './ShareDialog'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setRound, setIsShowingShareDialog } from '../../redux/actions'

jest.mock('qrcode', () => ({ toCanvas: jest.fn((canvas, text, cb) => cb && cb(null)) }))

const fullUrl = window.location.origin + '/play/r1'

function openDialogWith(round) {
    const store = makeStore()
    store.dispatch(setRound(round))
    store.dispatch(setIsShowingShareDialog(true))
    return store
}

describe('ShareDialog', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })
    afterEach(() => {
        console.warn.mockRestore()
    })

    it('shows the full link at once and swaps in the short link when the backend returns one', async () => {
        const store = openDialogWith({ id: 'r1', name: 'Jam', layers: [], currentUsers: [] })
        const firebase = { createShortLink: jest.fn().mockResolvedValue({ link: 'https://bit.ly/abc' }) }
        renderWithProviders(<ShareDialog />, { store, firebase })

        expect(screen.getByLabelText('Link')).toHaveValue(fullUrl)
        await waitFor(() => expect(screen.getByLabelText('Link')).toHaveValue('https://bit.ly/abc'))
        expect(firebase.createShortLink).toHaveBeenCalledWith('r1')
        expect(store.getState().round.shortLink).toBe('https://bit.ly/abc')
    })

    it('keeps the full link when the shortener fails', async () => {
        const store = openDialogWith({ id: 'r1', name: 'Jam', layers: [], currentUsers: [] })
        const firebase = { createShortLink: jest.fn().mockRejectedValue(new Error('unavailable')) }
        renderWithProviders(<ShareDialog />, { store, firebase })

        await waitFor(() => expect(firebase.createShortLink).toHaveBeenCalled())
        expect(screen.getByLabelText('Link')).toHaveValue(fullUrl)
        expect(store.getState().round.shortLink).toBeUndefined()
    })

    it('uses a stored short link without asking the backend', () => {
        const store = openDialogWith({ id: 'r1', name: 'Jam', layers: [], currentUsers: [], shortLink: 'https://bit.ly/stored' })
        const firebase = { createShortLink: jest.fn() }
        renderWithProviders(<ShareDialog />, { store, firebase })

        expect(screen.getByLabelText('Link')).toHaveValue('https://bit.ly/stored')
        expect(firebase.createShortLink).not.toHaveBeenCalled()
    })

    it('renders without a round loaded', () => {
        const store = makeStore()
        store.dispatch(setIsShowingShareDialog(true))
        const firebase = { createShortLink: jest.fn() }
        renderWithProviders(<ShareDialog />, { store, firebase })

        expect(screen.getByText('Share project')).toBeInTheDocument()
        expect(firebase.createShortLink).not.toHaveBeenCalled()
    })

    it('copies the link with the clipboard API', async () => {
        const writeText = jest.fn().mockResolvedValue()
        Object.assign(navigator, { clipboard: { writeText } })
        const store = openDialogWith({ id: 'r1', name: 'Jam', layers: [], currentUsers: [], shortLink: 'https://bit.ly/stored' })
        renderWithProviders(<ShareDialog />, { store, firebase: { createShortLink: jest.fn() } })

        userEvent.click(screen.getByRole('button', { name: 'Copy' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument())
        expect(writeText).toHaveBeenCalledWith('https://bit.ly/stored')
    })
})
