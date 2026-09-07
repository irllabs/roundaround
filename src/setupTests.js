// Vitest setup: jest-dom matchers and automatic DOM cleanup between tests.
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// The app marks elements for tests with data-test rather than data-testid.
configure({ testIdAttribute: 'data-test' })

// Material UI 4 reaches for findDOMNode, which React 18 still has but warns about under
// StrictMode. That one message is the only noise left in the suite, and it goes away with
// Material UI itself in PR 3. Everything else console.error says still gets through.
const consoleError = console.error
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) {
        return
    }
    consoleError(...args)
}

afterEach(() => {
    cleanup()
})
