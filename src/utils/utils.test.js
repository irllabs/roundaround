import { describe, it, expect } from 'vitest'
import { changeLayerLength, convertPercentToDB, convertDBToPercent, duplicateRound, uuid, arraymove } from './index'

const layerWithSteps = (pattern) => ({
    id: 'layer',
    steps: pattern.split('').map((c, i) => ({ id: 's' + i, order: i, isOn: c === 'x', probability: 1, velocity: 1 }))
})
const asPattern = (steps) => steps.map(step => (step.isOn ? 'x' : '.')).join('')

describe('changeLayerLength', () => {
    it('halving keeps every other step', () => {
        const steps = changeLayerLength(layerWithSteps('x.x.x.x.x.x.x.x.'), 8)
        expect(asPattern(steps)).toBe('xxxxxxxx')
        expect(steps.map(s => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    })
    it('doubling spreads steps onto multiples', () => {
        expect(asPattern(changeLayerLength(layerWithSteps('x..x'), 8))).toBe('x.....x.')
    })
    it('non-multiple lengths copy the leading steps', () => {
        expect(asPattern(changeLayerLength(layerWithSteps('x.x.x.'), 4))).toBe('x.x.')
        expect(asPattern(changeLayerLength(layerWithSteps('x.x.'), 6))).toBe('x.x...')
    })
    it('gives every new step a fresh id', () => {
        const steps = changeLayerLength(layerWithSteps('x...'), 4)
        expect(new Set(steps.map(s => s.id)).size).toBe(4)
    })
})

describe('volume conversion', () => {
    it('maps the slider range onto dB and back', () => {
        expect(convertPercentToDB(100)).toBe(6)
        expect(convertPercentToDB(60)).toBe(-6)
        expect(convertPercentToDB(0)).toBe(-96)
        expect(convertDBToPercent(6)).toBe(100)
        expect(convertDBToPercent(-6)).toBe(60)
        expect(convertDBToPercent(-48)).toBe(0)
        expect(convertDBToPercent(-96)).toBe(0)
    })
})

describe('duplicateRound', () => {
    const original = {
        id: 'r1', name: 'Jam', createdBy: 'alice', createdAt: 1, currentUsers: ['alice', 'bob'],
        shortLink: 'https://bit.ly/x', isPlaying: true, bpm: 100,
        layers: [{ id: 'l1', createdBy: 'bob', steps: [] }],
        userBuses: { alice: { fx: [] } }, userPatterns: { alice: { patterns: [] } }
    }
    it('makes an independent copy owned by the duplicating user', () => {
        const copy = duplicateRound(original, 'carol')
        expect(copy.id).not.toBe('r1')
        expect(copy.name).toBe('Jam (duplicate)')
        expect(copy.createdBy).toBe('carol')
        expect(copy.currentUsers).toEqual(['carol'])
        expect(copy.shortLink).toBeUndefined()
        expect(copy.isPlaying).toBeUndefined()
        expect(copy.bpm).toBe(100)
        expect(copy.layers).toEqual(original.layers)
        expect(copy.layers).not.toBe(original.layers)
        expect(original.currentUsers).toEqual(['alice', 'bob'])
    })
})

describe('uuid', () => {
    it('produces v4-shaped ids', () => {
        expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
})

describe('arraymove', () => {
    it('moves an element in place', () => {
        const items = ['a', 'b', 'c', 'd']
        arraymove(items, 0, 2)
        expect(items).toEqual(['b', 'c', 'a', 'd'])
    })
})
