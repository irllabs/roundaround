// Vitest setup: jest-dom matchers and automatic DOM cleanup between tests.
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// The app marks elements for tests with data-test rather than data-testid.
configure({ testIdAttribute: 'data-test' })

// Material UI 4 reaches for findDOMNode, which React 18 still has but warns about under
// StrictMode. This is the one message the suite cannot help printing, and it goes away with
// Material UI itself in PR 3, so it is matched in full rather than by a fragment: any other
// wording, findDOMNode's or anyone else's, still reaches the real console.error.
const FIND_DOM_NODE_WARNING = 'Warning: findDOMNode is deprecated and will be removed in the next major release. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-find-node%s'
const consoleError = console.error
console.error = (...args) => {
    if (args[0] === FIND_DOM_NODE_WARNING) {
        return
    }
    consoleError(...args)
}

afterEach(() => {
    cleanup()
})
