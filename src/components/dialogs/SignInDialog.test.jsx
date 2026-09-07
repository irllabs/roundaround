import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignInDialog from './SignInDialog'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setIsShowingSignInDialog } from '../../redux/actions'

// The dialog reaches Tone.js through the default round data. Signing in has nothing to do with
// audio, and loading Tone here only buys a banner on stdout.
vi.mock('tone', () => ({}))

describe('SignInDialog guest flow', () => {
    async function setup() {
        const store = makeStore()
        store.dispatch(setIsShowingSignInDialog(true))
        const firebase = {
            signInAnonymously: vi.fn().mockResolvedValue({ uid: 'anon-1' }),
            createUser: vi.fn().mockResolvedValue()
        }
        const utils = renderWithProviders(<SignInDialog />, { store, firebase })
        await userEvent.click(screen.getByTestId('button-guest'))
        return { store, firebase, ...utils }
    }

    it('signs in as a guest when the name form is submitted with Enter', async () => {
        const { store, firebase } = await setup()
        const input = within(screen.getByTestId('input-name')).getByRole('textbox')
        // Enter in a single-field form is an implicit submission; the form's onSubmit must take it
        await userEvent.type(input, 'Ada{enter}')

        await waitFor(() => expect(firebase.signInAnonymously).toHaveBeenCalled())
        await waitFor(() => expect(store.getState().user).toMatchObject({ id: 'anon-1', displayName: 'Ada', isGuest: true }))
        expect(firebase.createUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'anon-1', displayName: 'Ada', isGuest: true }))
        expect(store.getState().display.isShowingSignInDialog).toBe(false)
    })

    it('asks for a name instead of signing in an anonymous user without one', async () => {
        const { firebase } = await setup()
        await userEvent.click(screen.getByTestId('button-name'))
        expect(await screen.findByText('Please enter a name')).toBeInTheDocument()
        expect(firebase.signInAnonymously).not.toHaveBeenCalled()
    })
})
