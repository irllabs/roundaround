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

// Radix UI (behind the shadcn components) uses browser APIs jsdom lacks.
if (typeof window !== 'undefined') {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    }
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false
        Element.prototype.setPointerCapture = () => {}
        Element.prototype.releasePointerCapture = () => {}
    }
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => {}
    }
    if (!window.matchMedia) {
        window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
    }
    // Radix's Popper-based components (Popover, DropdownMenu, Tooltip) position themselves via
    // the floating-ui dom package, which checks whether ancestor elements sit in the browser's
    // "top layer" by calling element.matches(':popover-open') and element.matches(':modal') and
    // catching the exception real browsers throw for an unsupported selector. jsdom's selector
    // engine (nwsapi) does not throw for these very new pseudo-classes; instead it falls through
    // to an uncached, dynamically-compiled matcher on every single call, which measured at
    // 0.5-1s *per call* here and multiplies across every ancestor and every collision-detection
    // middleware (shift, flip, size) on every open. That turned a single Popover click into a
    // 6-8s hang and timed out Radix.PopoverContent's own test. Confirmed by isolating
    // floating-ui's computePosition() outside of React/Radix entirely (see task-3-report.md) and
    // profiling it with `node --prof`, which pointed straight at Element.matches -> nwsapi's
    // Resolver. Neither pseudo-class can ever legitimately match here (jsdom has no Popover API
    // and no native <dialog> modal state), so short-circuiting them to `false` is correct, not
    // just fast.
    if (!Element.prototype.__popoverOpenModalMatchShimmed) {
        const originalMatches = Element.prototype.matches
        Element.prototype.matches = function (selector) {
            if (selector === ':popover-open' || selector === ':modal') {
                return false
            }
            return originalMatches.call(this, selector)
        }
        Element.prototype.__popoverOpenModalMatchShimmed = true
    }
}
