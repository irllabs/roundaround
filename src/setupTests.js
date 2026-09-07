// Vitest setup: jest-dom matchers and automatic DOM cleanup between tests.
import { expect, afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// The app marks elements for tests with data-test rather than data-testid.
configure({ testIdAttribute: 'data-test' })

afterEach(() => {
    cleanup()
})
