import { vi, describe, it, expect, afterEach } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'
import { renderWithProviders } from './../test/test-utils'

function Boom() {
    throw new Error('the sequencer fell over')
}

describe('ErrorBoundary', () => {
    afterEach(() => vi.restoreAllMocks())

    it('shows the message and a way out instead of a blank page, and reports the error', () => {
        // React logs the caught error and its component stack, and componentDidCatch logs the
        // stack again; none of that is a failure and none of it belongs in the test output.
        // Scoped to this test on purpose: a stray console.error out of the healthy-tree case
        // below has to be able to reach the console.
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const firebase = { reportError: vi.fn() }
        renderWithProviders(<ErrorBoundary><Boom /></ErrorBoundary>, { firebase })

        expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
        expect(screen.getByText('the sequencer fell over')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Back to my rounds' })).toBeInTheDocument()
        expect(firebase.reportError).toHaveBeenCalledWith(expect.any(Error), { fatal: true, context: 'render' })
    })

    it('leaves a healthy tree alone', () => {
        renderWithProviders(<ErrorBoundary><p>the round</p></ErrorBoundary>, { firebase: { reportError: vi.fn() } })

        expect(screen.getByText('the round')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).toBeNull()
    })
})
