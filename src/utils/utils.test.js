import { describe, it, expect } from 'vitest'
import { changeLayerLength, convertPercentToDB, convertDBToPercent, duplicateRound, uuid, arraymove, soloMuteStates, profileFromAuthUser, layerWithStepsOff, patternLayersForRound, normalizeLegacyFxOrder } from './index'
import { deepFreeze } from '../test/deep-freeze'

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

describe('soloMuteStates', () => {
    const layers = [{ id: 'a', isMuted: false }, { id: 'b', isMuted: true }, { id: 'c', isMuted: false }]
    it('keeps the saved mute state when nothing is soloed', () => {
        expect(soloMuteStates(layers, null)).toEqual({ a: false, b: true, c: false })
    })
    it('silences every other layer while one is soloed, without touching saved state', () => {
        expect(soloMuteStates(layers, 'c')).toEqual({ a: true, b: true, c: false })
        expect(layers[0].isMuted).toBe(false)
    })
    it('a soloed layer that is itself muted stays muted', () => {
        expect(soloMuteStates(layers, 'b')).toEqual({ a: true, b: true, c: true })
    })
})

describe('profileFromAuthUser', () => {
    it('copies only the fields the auth provider actually has', () => {
        expect(profileFromAuthUser({ uid: 'u1', isAnonymous: false, displayName: 'Ada', email: 'ada@example.test', photoURL: null }))
            .toEqual({ id: 'u1', isGuest: false, displayName: 'Ada', email: 'ada@example.test' })
    })
    it('marks anonymous users as guests and never writes null names', () => {
        const profile = profileFromAuthUser({ uid: 'anon', isAnonymous: true, displayName: null, email: null, photoURL: null })
        expect(profile).toEqual({ id: 'anon', isGuest: true })
        expect(Object.keys(profile)).not.toContain('displayName')
    })
})

describe('patternLayersForRound', () => {
    const layer = (id, createdBy, pattern) => ({
        id,
        createdBy,
        steps: pattern.split('').map((c, i) => ({ id: id + '-' + i, order: i, isOn: c === 'x' }))
    })
    const me = 'user-1'
    const them = 'user-2'

    it('keeps the layers the pattern and the round both have, in the order the pattern saved them', () => {
        const saved = [layer('a', me, 'x...'), layer('b', me, '..x.')]
        const round = [layer('b', me, 'xxxx'), layer('a', me, 'xxxx')]
        const layers = patternLayersForRound(saved, round, me)
        expect(layers.map(l => l.id)).toEqual(['a', 'b'])
        expect(layers.map(l => asPattern(l.steps))).toEqual(['x...', '..x.'])
    })

    it('brings back a layer added since the pattern was saved, with every step off', () => {
        const saved = [layer('a', me, 'x...')]
        const round = [layer('a', me, 'x...'), layer('new', me, 'xxxx')]
        const layers = patternLayersForRound(saved, round, me)
        expect(layers.map(l => l.id)).toEqual(['a', 'new'])
        expect(asPattern(layers[1].steps)).toBe('....')
    })

    it('leaves collaborators layers out of the pattern', () => {
        const saved = [layer('a', me, 'x...')]
        const round = [layer('a', me, 'x...'), layer('theirs', them, 'xxxx')]
        expect(patternLayersForRound(saved, round, me).map(l => l.id)).toEqual(['a'])
    })

    it('drops a layer that has been deleted from the round', () => {
        const saved = [layer('a', me, 'x...'), layer('gone', me, 'xx..')]
        const round = [layer('a', me, 'x...')]
        expect(patternLayersForRound(saved, round, me).map(l => l.id)).toEqual(['a'])
    })

    it('leaves the pattern and the round it was given untouched', () => {
        const saved = deepFreeze([layer('a', me, 'x...')])
        const round = deepFreeze([layer('a', me, 'x...'), layer('new', me, 'xxxx')])
        const layers = patternLayersForRound(saved, round, me)
        expect(layers).not.toBe(saved)
        expect(saved).toHaveLength(1)
        expect(asPattern(round[1].steps)).toBe('xxxx')
    })
})

describe('layerWithStepsOff', () => {
    it('copies the layer with every step off and leaves the original alone', () => {
        const original = deepFreeze({ id: 'a', gain: -3, steps: [{ id: 's0', isOn: true }, { id: 's1', isOn: false }] })
        const silenced = layerWithStepsOff(original)
        expect(silenced.steps.map(s => s.isOn)).toEqual([false, false])
        expect(silenced.gain).toBe(-3)
        expect(original.steps[0].isOn).toBe(true)
    })
})

describe('normalizeLegacyFxOrder', () => {
    const fx = (names) => names.map((name, order) => ({ id: 'fx-' + name, name, order, isOn: true, isOverride: false }))
    const roundWith = (buses) => ({ id: 'round-1', layers: [], userBuses: buses })
    const names = (bus) => bus.fx.map(f => f.name)
    const legacy = ['pingpong', 'lowpass', 'highpass', 'autowah', 'delay', 'distortion']
    const current = ['pingpong', 'autowah', 'delay', 'distortion', 'lowpass', 'highpass']

    it('moves lowpass and highpass to fourth and fifth in an old bus', () => {
        const round = roundWith({ 'user-1': { id: 'user-1', fx: fx(legacy) } })
        expect(names(normalizeLegacyFxOrder(round).userBuses['user-1'])).toEqual(['pingpong', 'autowah', 'delay', 'lowpass', 'highpass', 'distortion'])
    })

    it('puts every old bus in the round right and leaves the others as they are', () => {
        const theirs = { id: 'user-2', fx: fx(current) }
        const round = roundWith({ 'user-1': { id: 'user-1', fx: fx(legacy) }, 'user-2': theirs })
        const normalized = normalizeLegacyFxOrder(round)
        expect(names(normalized.userBuses['user-1'])[3]).toBe('lowpass')
        expect(normalized.userBuses['user-2']).toBe(theirs)
    })

    it('hands back the same round when there is nothing to put right', () => {
        const round = roundWith({ 'user-1': { id: 'user-1', fx: fx(current) } })
        expect(normalizeLegacyFxOrder(round)).toBe(round)
    })

    it('never writes to the round it was given', () => {
        const round = deepFreeze(roundWith({ 'user-1': { id: 'user-1', fx: fx(legacy) } }))
        expect(names(normalizeLegacyFxOrder(round).userBuses['user-1'])[1]).toBe('autowah')
        expect(names(round.userBuses['user-1'])).toEqual(legacy)
    })

    it('leaves a round with no user buses, or none at all, alone', () => {
        const round = { id: 'round-1', layers: [] }
        expect(normalizeLegacyFxOrder(round)).toBe(round)
        expect(normalizeLegacyFxOrder(null)).toBeNull()
    })

    it('leaves a bus with too few effects to reorder alone', () => {
        const round = roundWith({ 'user-1': { id: 'user-1', fx: fx(['lowpass']) } })
        expect(normalizeLegacyFxOrder(round)).toBe(round)
    })
})
