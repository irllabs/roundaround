import { describe, it, expect, vi } from 'vitest'
import { alignedOrigin, offsetFromSample, offsetFromSamples, estimateServerOffset } from './transport'

describe('alignedOrigin', () => {
    it('puts bar 0 where the server says the transport started, on this context\'s clock', () => {
        // the server started the transport 3.25 s ago by its clock; our clock runs 200 ms behind the server's
        const origin = alignedOrigin({ startedAtServerMs: 1_000_000, serverOffsetMs: 200, contextNow: 50, wallNowMs: 1_003_050 })
        expect(origin).toBeCloseTo(50 - 3.25, 9)
    })

    it('is the context time itself when the start is right now', () => {
        expect(alignedOrigin({ startedAtServerMs: 5000, serverOffsetMs: 0, contextNow: 7, wallNowMs: 5000 })).toBe(7)
    })

    it('trusts the local clock when no offset is known', () => {
        expect(alignedOrigin({ startedAtServerMs: 4000, contextNow: 10, wallNowMs: 5000 })).toBe(9)
    })
})

describe('server offset', () => {
    it('is the server stamp against the middle of the round trip', () => {
        expect(offsetFromSample({ t0: 100, t1: 300, serverMs: 250 })).toBe(50)
        expect(offsetFromSample({ t0: 100, t1: 300, serverMs: 150 })).toBe(-50)
    })

    it('takes the median of several trips and ignores broken ones', () => {
        expect(offsetFromSamples([
            { t0: 0, t1: 100, serverMs: 60 },
            { t0: 0, t1: 100, serverMs: 800 }, // one very slow trip
            { t0: 0, t1: 100, serverMs: 55 },
            { t0: 0, t1: 100, serverMs: null }
        ])).toBe(10)
        expect(offsetFromSamples([])).toBe(0)
        expect(offsetFromSamples([{ t0: 0, t1: 100, serverMs: 70 }, { t0: 0, t1: 100, serverMs: 90 }])).toBe(30)
    })

    it('estimates from the injected round trips and survives a failure', async () => {
        const sample = vi.fn()
            .mockResolvedValueOnce({ t0: 0, t1: 100, serverMs: 62 })
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ t0: 0, t1: 100, serverMs: 58 })
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { offsetMs, samples } = await estimateServerOffset({ sample, rounds: 3 })
        spy.mockRestore()
        expect(samples).toBe(2)
        expect(offsetMs).toBe(10)
        expect(sample).toHaveBeenCalledTimes(3)
    })
})
