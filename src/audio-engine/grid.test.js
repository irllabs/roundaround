import { describe, it, expect } from 'vitest'
import { stepTick, stepLength, stepTicks, percentOffsetTicks, msToTicks, wrapTick } from './grid'

const BAR = 192 * 4

describe('the step grid', () => {
    it('adds up to exactly one bar for every step count the app allows', () => {
        for (let n = 1; n <= 32; n++) {
            let total = 0
            for (let i = 0; i < n; i++) total += stepLength(i, n, BAR)
            expect(total).toBe(BAR)
            expect(stepTick(0, n, BAR)).toBe(0)
            expect(stepTick(n, n, BAR)).toBe(BAR)
        }
    })

    it('puts every step within half a tick of its exact position', () => {
        for (let n = 1; n <= 32; n++) {
            for (let i = 0; i < n; i++) {
                expect(Math.abs(stepTick(i, n, BAR) - (i * BAR) / n)).toBeLessThanOrEqual(0.5)
            }
        }
    })

    it('fixes the counts the old rounding got wrong', () => {
        // 7 steps used to be 110 ticks each, 770 a bar, the last interval 2 ticks short; 19 used to be 40 each, 8 ticks long
        expect(stepTicks(7, BAR)).toEqual([0, 110, 219, 329, 439, 549, 658])
        expect(stepLength(6, 7, BAR)).toBe(110)
        expect(stepLength(18, 19, BAR)).toBe(40)
        expect(stepTicks(16, BAR)).toEqual(Array.from({ length: 16 }, (u, i) => i * 48))
    })

    it('shifts by a share of the exact step and by milliseconds at the tempo, and wraps into the bar', () => {
        expect(percentOffsetTicks(50, 16, BAR)).toBe(24)
        expect(percentOffsetTicks(50, 7, BAR)).toBe(Math.round(768 / 7 / 2))
        expect(msToTicks(125, 120, 192)).toBe(48)
        expect(msToTicks(-125, 120, 192)).toBe(-48)
        expect(wrapTick(-48, BAR)).toBe(720)
        expect(wrapTick(768 + 10, BAR)).toBe(10)
        // a negative time offset moves the first step to the end of the bar
        expect(stepTicks(16, BAR, { timeOffsetTicks: -48 })[0]).toBe(720)
        expect(stepTicks(16, BAR, { percentOffset: 50 })[1]).toBe(72)
        expect(stepTicks(16, BAR, { percentOffset: 50, timeOffsetTicks: -72 })[0]).toBe(720)
    })
})
