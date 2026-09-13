import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as ToneMock from 'tone'
import AudioEngine from './AudioEngine'

vi.mock('tone', () => {
    const calls = []
    const context = {
        state: 'suspended',
        resume: vi.fn(() => new Promise(resolve => setTimeout(() => { context.state = 'running'; calls.push('resumed'); resolve() }, 0)))
    }
    const transport = {
        PPQ: 192,
        bpm: { value: 120 },
        loop: null,
        loopEnd: null,
        state: 'stopped',
        start: vi.fn((when) => { calls.push('start ' + when + ' while ' + context.state) }),
        stop: vi.fn()
    }
    return { calls, context, transport, getContext: () => context, getTransport: () => transport }
})

const { calls, context, transport } = ToneMock

describe('AudioEngine.play', () => {
    beforeEach(() => {
        calls.length = 0
        context.state = 'suspended'
        transport.start.mockClear()
        context.resume.mockClear()
    })

    it('starts the transport only once the context is running', async () => {
        // on a fresh context the first events used to be scheduled while it was still suspended
        await AudioEngine.play()
        expect(calls).toEqual(['resumed', 'start +0.1 while running'])
        expect(transport.loop).toBe(false)
        expect(transport.loopEnd).toBe('1:0:0')
    })

    it('does not ask a running context to resume', async () => {
        context.state = 'running'
        await AudioEngine.play()
        expect(context.resume).not.toHaveBeenCalled()
        expect(calls).toEqual(['start +0.1 while running'])
    })
})
