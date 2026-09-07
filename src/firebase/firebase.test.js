import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics'
import Firebase from './firebase'

// The only part of the SDK this suite stands in for: everything else (app, auth, firestore,
// storage) is constructed for real, which is what proves the wrapper builds without a network.
vi.mock('firebase/analytics', () => ({
    getAnalytics: vi.fn(() => ({ name: 'analytics' })),
    isSupported: vi.fn().mockResolvedValue(true),
    logEvent: vi.fn()
}))

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

    it('never starts analytics outside a production build', async () => {
        await firebase.initAnalytics()
        expect(isSupported).not.toHaveBeenCalled()
        expect(getAnalytics).not.toHaveBeenCalled()
        expect(firebase.analytics).toBeNull()
    })

    it('logs an exception event when analytics is running', () => {
        firebase.analytics = getAnalytics()
        firebase.reportError(new TypeError('layer is not a function'), { fatal: true, context: 'render' })

        expect(logEvent).toHaveBeenCalledWith(firebase.analytics, 'exception', {
            description: 'TypeError: layer is not a function [render]',
            fatal: true
        })
    })

    it('treats an error as non-fatal and context-free unless told otherwise', () => {
        firebase.analytics = getAnalytics()
        firebase.reportError(new Error('boom'))

        expect(logEvent).toHaveBeenCalledWith(firebase.analytics, 'exception', {
            description: 'Error: boom',
            fatal: false
        })
    })

    it('truncates the description to what analytics accepts', () => {
        firebase.analytics = getAnalytics()
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
        firebase.analytics = getAnalytics()
        firebase.reportError(new Error('boom'))

        expect(console.error).toHaveBeenCalledWith('Error: boom', expect.any(Error))
    })

    it('describes a thrown value that is not an Error', () => {
        firebase.reportError('just a string')

        expect(console.error).toHaveBeenCalledWith('Error: just a string', 'just a string')
    })
})
