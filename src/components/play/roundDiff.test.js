import { describe, it, expect } from 'vitest'
import { classifyRoundChange } from './roundDiff'
import { deepFreeze } from '../../test/deep-freeze'

const step = (id, fields = {}) => ({ id, order: 0, isOn: false, velocity: 1, probability: 1, note: 'C4', ...fields })

const layer = (id, createdBy, fields = {}) => ({
    id, createdBy, createdAt: 1, type: 'TRACK_TYPE_LAYER', gain: 0, isMuted: false, timeOffset: 0, percentOffset: 0,
    instrument: { sampler: 'Kick', sample: 'a' },
    steps: [step(id + '-s0'), step(id + '-s1'), step(id + '-s2')],
    ...fields
})

const userPatterns = (id) => ({ id, isPlayingSequence: false, sequence: [false, false], patterns: [{ id: id + '-p0', order: 0, state: {} }] })

/** The user's layer and a collaborator's, each with three steps, and a patterns document each. */
const round = () => ({
    id: 'r1', bpm: 120,
    layers: [layer('mine', 'me'), layer('theirs', 'them')],
    userPatterns: { me: userPatterns('me'), them: userPatterns('them') }
})

/** `round()` with `edit` applied to it. */
const edited = (edit) => {
    const next = round()
    edit(next)
    return next
}

const NOTHING = {
    addedLayers: [],
    removedLayerIds: [],
    changedSteps: {},
    changedLayerFields: {},
    tempoChanged: false,
    changedUserPatterns: [],
    changedSequencePlayback: [],
    stepsOnly: null
}

describe('classifyRoundChange', () => {
    it('reports nothing for two equal rounds, and writes to neither', () => {
        const previous = deepFreeze(round())
        const next = deepFreeze(round())
        expect(classifyRoundChange(previous, next)).toEqual(NOTHING)
    })

    it('matches layers by id, whatever order they are in', () => {
        expect(classifyRoundChange(round(), edited(next => next.layers.reverse()))).toEqual(NOTHING)
    })

    it('reports a toggled step as a steps-only change', () => {
        const next = edited(next => { next.layers[1].steps[1].isOn = true })
        expect(classifyRoundChange(round(), next)).toEqual({
            ...NOTHING,
            changedSteps: { theirs: ['theirs-s1'] },
            stepsOnly: { theirs: ['theirs-s1'] }
        })
    })

    it('counts velocity, probability and note as step changes, across layers', () => {
        const next = edited(next => {
            next.layers[0].steps[0].velocity = 0.5
            next.layers[1].steps[1].probability = 0.2
            next.layers[1].steps[2].note = 'D#3'
        })
        expect(classifyRoundChange(round(), next).stepsOnly).toEqual({ mine: ['mine-s0'], theirs: ['theirs-s1', 'theirs-s2'] })
    })

    it('ignores a step whose only change is when it was last updated', () => {
        // the user's own toggle coming back from the store, or a collaborator's toggle and toggle
        // back arriving in one snapshot
        const next = edited(next => { next.layers[1].steps[1].lastUpdated = 1234 })
        expect(classifyRoundChange(round(), next)).toEqual(NOTHING)
    })

    it('is not steps-only when a layer field changed as well', () => {
        const next = edited(next => {
            next.layers[1].steps[1].isOn = true
            next.layers[1].isMuted = true
        })
        expect(classifyRoundChange(round(), next)).toEqual({
            ...NOTHING,
            changedSteps: { theirs: ['theirs-s1'] },
            changedLayerFields: { theirs: ['isMuted'] }
        })
    })

    it('reports a layer that appeared', () => {
        const added = layer('new', 'them')
        const change = classifyRoundChange(round(), edited(next => next.layers.push(added)))
        expect(change).toEqual({ ...NOTHING, addedLayers: [added] })
    })

    it('reports a layer that disappeared', () => {
        const change = classifyRoundChange(round(), edited(next => next.layers.splice(1, 1)))
        expect(change).toEqual({ ...NOTHING, removedLayerIds: ['theirs'] })
    })

    it('reports a step list of a different shape as a layer change, not as step changes', () => {
        const longer = edited(next => { next.layers[0].steps = [step('a'), step('b'), step('c'), step('d')] })
        expect(classifyRoundChange(round(), longer)).toEqual({ ...NOTHING, changedLayerFields: { mine: ['steps'] } })

        const renumbered = edited(next => { next.layers[0].steps = [step('a'), step('b'), step('c', { isOn: true })] })
        expect(classifyRoundChange(round(), renumbered)).toEqual({ ...NOTHING, changedLayerFields: { mine: ['steps'] } })
    })

    it('reports each changed layer field by the reaction it needs', () => {
        const next = edited(next => {
            Object.assign(next.layers[0], { instrument: { sampler: 'Snare', sample: 'b' }, type: 'TRACK_TYPE_AUTOMATION', automationFxId: 'fx-1', gain: -6, timeOffset: 20 })
            next.layers[1].percentOffset = 30
        })
        expect(classifyRoundChange(round(), next).changedLayerFields).toEqual({
            mine: ['instrument', 'type', 'automationFxId', 'gain', 'offset'],
            theirs: ['offset']
        })
    })

    it('reports a tempo change, which rules out steps-only', () => {
        const next = edited(next => {
            next.bpm = 140
            next.layers[1].steps[0].isOn = true
        })
        expect(classifyRoundChange(round(), next)).toEqual({
            ...NOTHING,
            tempoChanged: true,
            changedSteps: { theirs: ['theirs-s0'] }
        })
    })

    it('reports a changed patterns document, which rules out steps-only', () => {
        const next = edited(next => {
            next.userPatterns.me.patterns[0].state = { layers: [] }
            next.layers[0].steps[0].isOn = true
        })
        expect(classifyRoundChange(round(), next)).toEqual({
            ...NOTHING,
            changedUserPatterns: ['me'],
            changedSteps: { mine: ['mine-s0'] }
        })
    })

    it('reports a sequence being started or stopped, and only that', () => {
        const started = edited(next => { next.userPatterns.them.isPlayingSequence = true })
        expect(classifyRoundChange(round(), started)).toEqual({
            ...NOTHING,
            changedUserPatterns: ['them'],
            changedSequencePlayback: ['them']
        })

        // a document that gains the field, still not playing, has not started anything
        const previous = edited(previous => { delete previous.userPatterns.them.isPlayingSequence })
        expect(classifyRoundChange(previous, round())).toEqual({ ...NOTHING, changedUserPatterns: ['them'] })
    })

    it('does not report a user whose patterns document is new', () => {
        const next = edited(next => { next.userPatterns.newcomer = userPatterns('newcomer') })
        expect(classifyRoundChange(round(), next)).toEqual(NOTHING)
    })
})
