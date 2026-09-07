import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initializeAnalytics, isSupported, logEvent } from 'firebase/analytics'
import Firebase from './firebase'

// The only part of the SDK this suite stands in for: everything else (app, auth, firestore,
// storage) is constructed for real, which is what proves the wrapper builds without a network.
vi.mock('firebase/analytics', () => ({
    initializeAnalytics: vi.fn(() => ({ name: 'analytics' })),
    isSupported: vi.fn().mockResolvedValue(true),
    logEvent: vi.fn()
}))

/** A production build of the app, running on `hostname`. */
function servedFrom(hostname) {
    vi.stubEnv('MODE', 'production')
    vi.stubGlobal('location', { ...window.location, hostname })
}

describe('Firebase analytics', () => {
    let firebase

    beforeEach(() => {
        // built while the environment is still the test one, so the constructor's own
        // initAnalytics() stops at the first check and each test's call is the only one
        firebase = new Firebase()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it('starts analytics without the automatic page_view on the live site', async () => {
        servedFrom('rounds.studio')
        await firebase.initAnalytics()

        // page_location would carry the round URL, which is a bearer link
        expect(initializeAnalytics).toHaveBeenCalledTimes(1)
        expect(initializeAnalytics).toHaveBeenCalledWith(firebase.app, { config: { send_page_view: false } })
        expect(firebase.analytics).toEqual({ name: 'analytics' })
    })

    it('never starts analytics outside a production build', async () => {
        await firebase.initAnalytics()

        expect(isSupported).not.toHaveBeenCalled()
        expect(initializeAnalytics).not.toHaveBeenCalled()
        expect(firebase.analytics).toBeNull()
    })

    it('never starts analytics on a host that is not the live site', async () => {
        // the PR preview channels and the Cypress build in CI are production builds too
        servedFrom('roundaround--pr-42-abc123.web.app')
        await firebase.initAnalytics()

        expect(isSupported).not.toHaveBeenCalled()
        expect(initializeAnalytics).not.toHaveBeenCalled()
        expect(firebase.analytics).toBeNull()
    })

    it('never starts analytics where the browser does not support it', async () => {
        servedFrom('rounds.studio')
        isSupported.mockResolvedValueOnce(false)
        await firebase.initAnalytics()

        expect(initializeAnalytics).not.toHaveBeenCalled()
        expect(firebase.analytics).toBeNull()
    })
})

describe('Firebase error reporting', () => {
    let firebase

    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => { })
        firebase = new Firebase()
    })

    afterEach(() => {
        console.error.mockRestore()
    })

    it('logs an exception event when analytics is running', () => {
        firebase.analytics = initializeAnalytics()
        firebase.reportError(new TypeError('layer is not a function'), { fatal: true, context: 'render' })

        expect(logEvent).toHaveBeenCalledWith(firebase.analytics, 'exception', {
            description: 'TypeError: layer is not a function [render]',
            fatal: true
        })
    })

    it('treats an error as non-fatal and context-free unless told otherwise', () => {
        firebase.analytics = initializeAnalytics()
        firebase.reportError(new Error('boom'))

        expect(logEvent).toHaveBeenCalledWith(firebase.analytics, 'exception', {
            description: 'Error: boom',
            fatal: false
        })
    })

    it('truncates the description to what analytics accepts', () => {
        firebase.analytics = initializeAnalytics()
        firebase.reportError(new Error('x'.repeat(300)))

        const { description } = logEvent.mock.calls[0][2]
        expect(description).toHaveLength(150)
        expect(description.startsWith('Error: xxx')).toBe(true)
    })

    it('degrades to the console when analytics is not running', () => {
        firebase.reportError(new Error('boom'), { context: 'promise' })

        expect(logEvent).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith('Error: boom [promise]', expect.any(Error))
    })

    it('logs to the console whether or not analytics is running', () => {
        firebase.analytics = initializeAnalytics()
        firebase.reportError(new Error('boom'))

        expect(console.error).toHaveBeenCalledWith('Error: boom', expect.any(Error))
    })

    it('describes a thrown value that is not an Error', () => {
        firebase.reportError('just a string')

        expect(console.error).toHaveBeenCalledWith('Error: just a string', 'just a string')
    })
})
