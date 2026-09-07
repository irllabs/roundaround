import { vi, describe, it, expect, beforeEach } from 'vitest'
import _ from 'lodash'
import round from './round'
import * as types from '../actionTypes'
import { deepFreeze } from '../../test/deep-freeze'
import { makeRound, USER_ID, COLLABORATOR_ID } from '../../test/fixtures'
import { getDefaultLayerData, getDefaultStepData, getDefaultUserBus } from '../../utils/defaultData'

// defaultData reaches Tone.js through the instrument classes. The reducer has nothing to do with
// audio, and loading Tone in a reducer test only buys a banner on stdout.
vi.mock('tone', () => ({}))

/**
 * One case per action type the round reducer handles: the action the app dispatches, and what the
 * state looks like afterwards. The state handed to the reducer is deep-frozen and compared against
 * a copy of itself afterwards, so a reducer that writes to its input fails here.
 */
describe('the round reducer', () => {
    let state
    let layer
    let otherLayer
    let step
    let extraLayer
    let extraStep

    beforeEach(async () => {
        state = await makeRound()
        layer = state.layers[0]
        otherLayer = state.layers[1]
        step = layer.steps[2]
        extraLayer = await getDefaultLayerData(USER_ID)
        extraStep = getDefaultStepData()
        deepFreeze(state)
        deepFreeze(extraLayer)
        deepFreeze(extraStep)
    })

    it('starts out with no round', () => {
        expect(round(undefined, { type: 'ANY' })).toBeNull()
    })

    it('hands back the state it was given for an action it does not handle', () => {
        expect(round(state, { type: 'NOT_A_ROUND_ACTION', payload: {} })).toBe(state)
    })

    const cases = [
        {
            name: 'SET_ROUND replaces the whole round',
            action: () => ({ type: types.SET_ROUND, payload: { value: { id: 'other-round', bpm: 90, layers: [] } } }),
            assert: (next) => expect(next).toEqual({ id: 'other-round', bpm: 90, layers: [] })
        },
        {
            name: 'SET_ROUND clears the round when the value is null',
            action: () => ({ type: types.SET_ROUND, payload: { value: null } }),
            assert: (next) => expect(next).toBeNull()
        },
        {
            name: 'UPDATE_LAYERS merges each layer into the layer at the same position',
            action: () => ({ type: types.UPDATE_LAYERS, payload: { layers: [{ id: layer.id, gain: -6 }, { id: otherLayer.id, isMuted: true }] } }),
            assert: (next) => {
                expect(next.layers[0].gain).toBe(-6)
                expect(next.layers[0].name).toBe(layer.name)
                expect(next.layers[1].isMuted).toBe(true)
                expect(next.layers[2]).toEqual(state.layers[2])
            }
        },
        {
            name: 'UPDATE_STEP merges the step into the step with the same id',
            action: () => ({ type: types.UPDATE_STEP, payload: { layerId: layer.id, step: { id: step.id, velocity: 0.5, probability: 0.25 } } }),
            assert: (next) => {
                expect(next.layers[0].steps[2]).toEqual({ ...step, velocity: 0.5, probability: 0.25 })
                expect(next.layers[0].steps).toHaveLength(layer.steps.length)
            }
        },
        {
            name: 'ADD_STEP appends a step to the layer',
            action: () => ({ type: types.ADD_STEP, payload: { layerId: layer.id, step: extraStep } }),
            assert: (next) => {
                expect(next.layers[0].steps).toHaveLength(layer.steps.length + 1)
                expect(next.layers[0].steps[layer.steps.length]).toEqual(extraStep)
            }
        },
        {
            name: 'REMOVE_STEP takes the step out of the layer',
            action: () => ({ type: types.REMOVE_STEP, payload: { layerId: layer.id, stepId: step.id } }),
            assert: (next) => {
                expect(next.layers[0].steps).toHaveLength(layer.steps.length - 1)
                expect(_.find(next.layers[0].steps, { id: step.id })).toBeUndefined()
            }
        },
        {
            name: 'TOGGLE_STEP switches the step on and records when it changed',
            action: () => ({ type: types.TOGGLE_STEP, payload: { layerId: layer.id, stepId: step.id, isOn: true, lastUpdated: 1234 } }),
            assert: (next) => {
                expect(next.layers[0].steps[2]).toEqual({ ...step, isOn: true, lastUpdated: 1234 })
                expect(next.layers[0].steps[1]).toEqual(layer.steps[1])
            }
        },
        {
            name: 'SET_STEP_VELOCITY sets the velocity and clears lastUpdated',
            action: () => ({ type: types.SET_STEP_VELOCITY, payload: { layerId: layer.id, stepId: step.id, velocity: 0.4 } }),
            assert: (next) => {
                expect(next.layers[0].steps[2].velocity).toBe(0.4)
                expect(next.layers[0].steps[2]).toHaveProperty('lastUpdated', undefined)
            }
        },
        {
            name: 'SET_STEP_PROBABILITY sets the probability and clears lastUpdated',
            action: () => ({ type: types.SET_STEP_PROBABILITY, payload: { layerId: layer.id, stepId: step.id, probability: 0.7 } }),
            assert: (next) => {
                expect(next.layers[0].steps[2].probability).toBe(0.7)
                expect(next.layers[0].steps[2]).toHaveProperty('lastUpdated', undefined)
            }
        },
        {
            name: 'SET_STEP_NOTE sets the note and clears lastUpdated',
            action: () => ({ type: types.SET_STEP_NOTE, payload: { layerId: layer.id, stepId: step.id, note: 'D#3' } }),
            assert: (next) => {
                expect(next.layers[0].steps[2].note).toBe('D#3')
                expect(next.layers[0].steps[2]).toHaveProperty('lastUpdated', undefined)
            }
        },
        {
            name: 'TOGGLE_LAYER sets isActive on the layer',
            action: () => ({ type: types.TOGGLE_LAYER, payload: { id: otherLayer.id, isActive: false } }),
            assert: (next) => {
                expect(next.layers[1].isActive).toBe(false)
                expect(next.layers[0].isActive).toBe(true)
            }
        },
        {
            name: 'SET_LAYER_STEPS replaces the layer steps',
            action: () => ({ type: types.SET_LAYER_STEPS, payload: { id: layer.id, steps: [extraStep] } }),
            assert: (next) => expect(next.layers[0].steps).toEqual([extraStep])
        },
        {
            name: 'SET_LAYER_NAME renames the layer',
            action: () => ({ type: types.SET_LAYER_NAME, payload: { id: layer.id, name: 'Bassline' } }),
            assert: (next) => expect(next.layers[0].name).toBe('Bassline')
        },
        {
            name: 'SET_LAYER_TYPE changes the layer type',
            action: () => ({ type: types.SET_LAYER_TYPE, payload: { id: layer.id, value: 'TRACK_TYPE_AUTOMATION' } }),
            assert: (next) => expect(next.layers[0].type).toBe('TRACK_TYPE_AUTOMATION')
        },
        {
            name: 'SET_LAYER_TIME_OFFSET sets the layer time offset',
            action: () => ({ type: types.SET_LAYER_TIME_OFFSET, payload: { id: layer.id, value: 25 } }),
            assert: (next) => expect(next.layers[0].timeOffset).toBe(25)
        },
        {
            name: 'SET_LAYER_PERCENT_OFFSET sets the layer percent offset',
            action: () => ({ type: types.SET_LAYER_PERCENT_OFFSET, payload: { id: layer.id, value: 12 } }),
            assert: (next) => expect(next.layers[0].percentOffset).toBe(12)
        },
        {
            name: 'SET_LAYER_GAIN sets the layer gain',
            action: () => ({ type: types.SET_LAYER_GAIN, payload: { id: layer.id, value: -3 } }),
            assert: (next) => expect(next.layers[0].gain).toBe(-3)
        },
        {
            name: 'SET_LAYER_MUTE mutes the layer',
            action: () => ({ type: types.SET_LAYER_MUTE, payload: { id: layer.id, value: true } }),
            assert: (next) => expect(next.layers[0].isMuted).toBe(true)
        },
        {
            name: 'SET_LAYER_PREVIEW sets isPreviewed on the layer instrument',
            action: () => ({ type: types.SET_LAYER_PREVIEW, payload: { id: layer.id, value: true } }),
            assert: (next) => {
                expect(next.layers[0].instrument.isPreviewed).toBe(true)
                expect(next.layers[0].instrument.sampler).toBe(layer.instrument.sampler)
            }
        },
        {
            name: 'UPDATE_LAYER_INSTRUMENT merges into the layer instrument',
            action: () => ({ type: types.UPDATE_LAYER_INSTRUMENT, payload: { id: layer.id, instrument: { sampler: 'Kicks', sample: 'punchy' } } }),
            assert: (next) => {
                expect(next.layers[0].instrument).toEqual({ ...layer.instrument, sampler: 'Kicks', sample: 'punchy' })
            }
        },
        {
            name: 'UPDATE_LAYER_AUTOMATION_FX_ID sets the automated effect',
            action: () => ({ type: types.UPDATE_LAYER_AUTOMATION_FX_ID, payload: { id: layer.id, value: state.userBuses[USER_ID].fx[2].id } }),
            assert: (next) => expect(next.layers[0].automationFxId).toBe(state.userBuses[USER_ID].fx[2].id)
        },
        {
            name: 'UPDATE_LAYER merges the given fields into the layer',
            action: () => ({ type: types.UPDATE_LAYER, payload: { id: otherLayer.id, data: { gain: -12, isMuted: true } } }),
            assert: (next) => expect(next.layers[1]).toEqual({ ...otherLayer, gain: -12, isMuted: true })
        },
        {
            name: 'ADD_LAYER appends the layer',
            action: () => ({ type: types.ADD_LAYER, payload: { layer: extraLayer } }),
            assert: (next) => {
                expect(next.layers).toHaveLength(4)
                expect(next.layers[3]).toEqual(extraLayer)
            }
        },
        {
            name: 'ADD_ROUND_LAYERS appends every layer it is given',
            action: () => ({ type: types.ADD_ROUND_LAYERS, payload: { layers: [extraLayer] } }),
            assert: (next) => {
                expect(next.layers).toHaveLength(4)
                expect(next.layers[3]).toEqual(extraLayer)
            }
        },
        {
            name: 'REMOVE_LAYER takes the layer out of the round',
            action: () => ({ type: types.REMOVE_LAYER, payload: { id: otherLayer.id } }),
            assert: (next) => {
                expect(next.layers).toHaveLength(2)
                expect(_.find(next.layers, { id: otherLayer.id })).toBeUndefined()
            }
        },
        {
            name: 'ADD_USERBUS adds a bus for a user who did not have one',
            action: () => ({ type: types.ADD_USERBUS, payload: { userId: 'user-3', userBus: getDefaultUserBus('user-3') } }),
            assert: (next) => {
                expect(next.userBuses['user-3'].fx).toHaveLength(6)
                expect(next.userBuses[USER_ID]).toEqual(state.userBuses[USER_ID])
            }
        },
        {
            name: 'SET_USER_BUS_FX_OVERRIDE switches one effect of one user bus on',
            action: () => ({ type: types.SET_USER_BUS_FX_OVERRIDE, payload: { userId: USER_ID, fxId: state.userBuses[USER_ID].fx[3].id, value: true } }),
            assert: (next) => {
                expect(next.userBuses[USER_ID].fx[3].isOverride).toBe(true)
                expect(next.userBuses[USER_ID].fx[2].isOverride).toBe(false)
                expect(next.userBuses[COLLABORATOR_ID]).toEqual(state.userBuses[COLLABORATOR_ID])
            }
        },
        {
            name: 'SET_USER_BUS_FX replaces the effects of one user bus',
            action: () => ({ type: types.SET_USER_BUS_FX, payload: { userId: USER_ID, data: [...state.userBuses[USER_ID].fx].reverse() } }),
            assert: (next) => {
                expect(next.userBuses[USER_ID].fx.map(fx => fx.name)).toEqual(['highpass', 'lowpass', 'distortion', 'delay', 'autowah', 'pingpong'])
                expect(next.userBuses[USER_ID].id).toBe(USER_ID)
            }
        },
        {
            name: 'SAVE_USER_PATTERN stores the state of one pattern',
            action: () => ({ type: types.SAVE_USER_PATTERN, payload: { userId: USER_ID, patternId: state.userPatterns[USER_ID].patterns[1].id, data: { layers: [{ id: layer.id, steps: [] }] } } }),
            assert: (next) => {
                expect(next.userPatterns[USER_ID].patterns[1].state).toEqual({ layers: [{ id: layer.id, steps: [] }] })
                expect(next.userPatterns[USER_ID].patterns[0].state).toEqual({})
            }
        },
        {
            name: 'SET_USER_PATTERN_SEQUENCE stores the sequence of one user',
            action: () => ({ type: types.SET_USER_PATTERN_SEQUENCE, payload: { userId: USER_ID, data: [state.userPatterns[USER_ID].patterns[0].id, false, false, false, false, false, false, false] } }),
            assert: (next) => {
                expect(next.userPatterns[USER_ID].sequence[0]).toBe(state.userPatterns[USER_ID].patterns[0].id)
                expect(next.userPatterns[COLLABORATOR_ID].sequence).toEqual(state.userPatterns[COLLABORATOR_ID].sequence)
            }
        },
        {
            name: 'SET_IS_PLAYING_SEQUENCE starts one user sequence',
            action: () => ({ type: types.SET_IS_PLAYING_SEQUENCE, payload: { userId: COLLABORATOR_ID, value: true } }),
            assert: (next) => {
                expect(next.userPatterns[COLLABORATOR_ID].isPlayingSequence).toBe(true)
                expect(next.userPatterns[USER_ID].isPlayingSequence).toBe(false)
            }
        },
        {
            name: 'SET_ROUND_NAME renames the round',
            action: () => ({ type: types.SET_ROUND_NAME, payload: { value: 'Tuesday jam' } }),
            assert: (next) => expect(next.name).toBe('Tuesday jam')
        },
        {
            name: 'SET_ROUND_BPM sets the tempo',
            action: () => ({ type: types.SET_ROUND_BPM, payload: { bpm: 140 } }),
            assert: (next) => expect(next.bpm).toBe(140)
        },
        {
            name: 'SET_ROUND_SWING sets the swing',
            action: () => ({ type: types.SET_ROUND_SWING, payload: { swing: 30 } }),
            assert: (next) => expect(next.swing).toBe(30)
        },
        {
            name: 'SET_ROUND_ID sets the round id',
            action: () => ({ type: types.SET_ROUND_ID, payload: { id: 'round-2' } }),
            assert: (next) => expect(next.id).toBe('round-2')
        },
        {
            name: 'SET_IS_PLAYING marks the round as playing',
            action: () => ({ type: types.SET_IS_PLAYING, payload: { value: true } }),
            assert: (next) => expect(next.isPlaying).toBe(true)
        },
        {
            name: 'SET_ROUND_SHORTLINK stores the share link',
            action: () => ({ type: types.SET_ROUND_SHORTLINK, payload: { value: 'https://rndr.nd/abc' } }),
            assert: (next) => expect(next.shortLink).toBe('https://rndr.nd/abc')
        },
        {
            name: 'SET_ROUND_CURRENT_USERS replaces the list of members',
            action: () => ({ type: types.SET_ROUND_CURRENT_USERS, payload: { value: [USER_ID] } }),
            assert: (next) => expect(next.currentUsers).toEqual([USER_ID])
        },
        {
            name: 'SET_ROUND_CONTRIBUTORS replaces the list of contributors',
            action: () => ({ type: types.SET_ROUND_CONTRIBUTORS, payload: { value: [USER_ID, COLLABORATOR_ID, 'user-3'] } }),
            assert: (next) => expect(next.contributors).toEqual([USER_ID, COLLABORATOR_ID, 'user-3'])
        }
    ]

    it.each(cases)('$name', ({ action, assert }) => {
        const before = _.cloneDeep(state)
        const next = round(state, action())
        assert(next)
        expect(state).toEqual(before)
    })

    it('covers every action type the round reducer handles', () => {
        const handled = [
            types.SET_ROUND, types.UPDATE_LAYERS, types.UPDATE_STEP, types.ADD_STEP, types.REMOVE_STEP,
            types.TOGGLE_STEP, types.SET_STEP_VELOCITY, types.SET_STEP_PROBABILITY, types.SET_STEP_NOTE,
            types.TOGGLE_LAYER, types.SET_LAYER_STEPS, types.SET_LAYER_NAME, types.SET_LAYER_TYPE,
            types.SET_LAYER_TIME_OFFSET, types.SET_LAYER_PERCENT_OFFSET, types.SET_LAYER_GAIN,
            types.SET_LAYER_MUTE, types.SET_LAYER_PREVIEW, types.UPDATE_LAYER_INSTRUMENT,
            types.UPDATE_LAYER_AUTOMATION_FX_ID, types.UPDATE_LAYER, types.ADD_LAYER, types.ADD_ROUND_LAYERS,
            types.REMOVE_LAYER, types.ADD_USERBUS, types.SET_USER_BUS_FX_OVERRIDE, types.SET_USER_BUS_FX,
            types.SAVE_USER_PATTERN, types.SET_USER_PATTERN_SEQUENCE, types.SET_IS_PLAYING_SEQUENCE,
            types.SET_ROUND_NAME, types.SET_ROUND_BPM, types.SET_ROUND_SWING, types.SET_ROUND_ID,
            types.SET_IS_PLAYING, types.SET_ROUND_SHORTLINK, types.SET_ROUND_CURRENT_USERS,
            types.SET_ROUND_CONTRIBUTORS
        ]
        const covered = new Set(cases.map(({ action }) => action().type))
        expect([...covered].sort()).toEqual([...handled].sort())
    })
})
