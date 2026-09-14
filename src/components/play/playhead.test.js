import { describe, it, expect } from 'vitest'
import { playheadAngle, playheadSpan, playheadTransform } from './playhead'

describe('playheadAngle', () => {
    it('turns once a bar, clockwise from the top, from the position in bars', () => {
        expect(playheadAngle(0)).toBe(0)
        expect(playheadAngle(0.25)).toBeCloseTo(90, 9)
        expect(playheadAngle(1.5)).toBeCloseTo(180, 9)
        expect(playheadAngle(7.999)).toBeCloseTo(359.64, 9)
    })

    it('rests at the top before the start and without a position', () => {
        expect(playheadAngle(-0.05)).toBe(0)
        expect(playheadAngle(NaN)).toBe(0)
        expect(playheadAngle(undefined)).toBe(0)
    })
})

describe('playheadSpan', () => {
    it('reaches from the innermost ring\'s inner edge to the outermost ring\'s outer edge', () => {
        expect(playheadSpan([{ radius: 512, edge: 38 }, { radius: 640, edge: 13 }, { radius: 800, edge: 38 }])).toEqual({ inner: 474, outer: 838 })
    })

    it('is nothing without rings', () => {
        expect(playheadSpan([])).toBeNull()
        expect(playheadSpan(null)).toBeNull()
    })
})

describe('playheadTransform', () => {
    it('rotates about the round\'s centre', () => {
        expect(playheadTransform(90, 650, 450)).toBe('rotate(90.000 650 450)')
    })
})
