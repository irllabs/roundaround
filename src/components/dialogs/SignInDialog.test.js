import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignInDialog from './SignInDialog'
import { renderWithProviders, makeStore } from '../../test/test-utils'
import { setIsShowingSignInDialog } from '../../redux/actions'

describe('SignInDialog guest flow', () => {
    function setup() {
        const store = makeStore()
        store.dispatch(setIsShowingSignInDialog(true))
        const firebase = {
            auth: { signInAnonymously: jest.fn().mockResolvedValue({ user: { uid: 'anon-1' } }) },
            createUser: jest.fn().mockResolvedValue()
        }
        const utils = renderWithProviders(<SignInDialog />, { store, firebase })
        // MUI dialogs render into a portal, so query the document rather than the container
        userEvent.click(document.querySelector('[data-test="button-guest"]'))
        return { store, firebase, ...utils }
    }

    it('signs in as a guest when the name form is submitted with Enter', async () => {
        const { store, firebase } = setup()
        const input = document.querySelector('[data-test="input-name"] input')
        userEvent.type(input, 'Ada')

        const form = document.querySelector('form')
        const notPrevented = fireEvent.submit(form)
        expect(notPrevented).toBe(false) // default (page navigation) was prevented

        await waitFor(() => expect(firebase.auth.signInAnonymously).toHaveBeenCalled())
        await waitFor(() => expect(store.getState().user).toMatchObject({ id: 'anon-1', displayName: 'Ada', isGuest: true }))
        expect(firebase.createUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'anon-1', displayName: 'Ada', isGuest: true }))
        expect(store.getState().display.isShowingSignInDialog).toBe(false)
    })

    it('asks for a name instead of signing in an anonymous user without one', async () => {
        const { firebase } = setup()
        userEvent.click(document.querySelector('[data-test="button-name"]'))
        expect(await screen.findByText('Please enter a name')).toBeInTheDocument()
        expect(firebase.auth.signInAnonymously).not.toHaveBeenCalled()
    })
})
