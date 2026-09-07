import { createReducer } from "@reduxjs/toolkit";
import {
    SET_ROUND,
    UPDATE_LAYERS,
    TOGGLE_STEP,
    SET_STEP_VELOCITY,
    SET_STEP_PROBABILITY,
    SET_STEP_NOTE,
    ADD_STEP,
    REMOVE_STEP,
    SET_LAYER_NAME,
    SET_LAYER_GAIN,
    SET_LAYER_MUTE,
    SET_LAYER_PREVIEW,
    UPDATE_LAYER_INSTRUMENT,
    ADD_LAYER,
    ADD_ROUND_LAYERS,
    REMOVE_LAYER,
    SET_ROUND_NAME,
    SET_ROUND_BPM,
    SET_ROUND_SWING,
    TOGGLE_LAYER,
    SET_LAYER_STEPS,
    SET_ROUND_ID,
    UPDATE_STEP,
    SET_LAYER_TYPE,
    UPDATE_LAYER_AUTOMATION_FX_ID,
    SET_USER_BUS_FX_OVERRIDE,
    ADD_USERBUS,
    SET_USER_BUS_FX,
    SAVE_USER_PATTERN,
    SET_IS_PLAYING,
    SET_ROUND_SHORTLINK,
    SET_ROUND_CURRENT_USERS,
    SET_ROUND_CONTRIBUTORS,
    SET_LAYER_TIME_OFFSET,
    SET_LAYER_PERCENT_OFFSET,
    UPDATE_LAYER,
    SET_USER_PATTERN_SEQUENCE,
    SET_IS_PLAYING_SEQUENCE
} from "../actionTypes";
import _ from 'lodash'

const initialState = null;

const layerById = (state, id) => _.find(state.layers, { id })

/**
 * Writes one property of one step and stamps when it changed. Only TOGGLE_STEP knows the time, so
 * for the others lastUpdated is cleared, which is what the collaboration listeners expect.
 */
const updateStepProperty = (state, name, value, layerId, stepId, lastUpdated) => {
    const step = _.find(layerById(state, layerId).steps, { id: stepId })
    step[name] = value
    step.lastUpdated = lastUpdated
}

export default createReducer(initialState, (builder) => {
    builder
        .addCase(SET_ROUND, (state, action) => action.payload.value)
        .addCase(UPDATE_LAYERS, (state, action) => {
            const { layers } = action.payload;
            for (let i = 0; i < layers.length; i++) {
                Object.assign(state.layers[i], layers[i])
            }
        })
        .addCase(UPDATE_STEP, (state, action) => {
            const { step, layerId } = action.payload;
            Object.assign(_.find(layerById(state, layerId).steps, { id: step.id }), step)
        })
        .addCase(ADD_STEP, (state, action) => {
            const { layerId, step } = action.payload;
            layerById(state, layerId).steps.push(step)
        })
        .addCase(REMOVE_STEP, (state, action) => {
            const { layerId, stepId } = action.payload;
            const layer = layerById(state, layerId)
            layer.steps.splice(_.findIndex(layer.steps, { id: stepId }), 1)
        })
        .addCase(TOGGLE_STEP, (state, action) => {
            const { layerId, stepId, isOn, lastUpdated } = action.payload;
            updateStepProperty(state, 'isOn', isOn, layerId, stepId, lastUpdated)
        })
        .addCase(SET_STEP_VELOCITY, (state, action) => {
            const { layerId, stepId, velocity } = action.payload;
            updateStepProperty(state, 'velocity', velocity, layerId, stepId)
        })
        .addCase(SET_STEP_PROBABILITY, (state, action) => {
            const { layerId, stepId, probability } = action.payload;
            updateStepProperty(state, 'probability', probability, layerId, stepId)
        })
        .addCase(SET_STEP_NOTE, (state, action) => {
            const { layerId, stepId, note } = action.payload;
            updateStepProperty(state, 'note', note, layerId, stepId)
        })
        .addCase(TOGGLE_LAYER, (state, action) => {
            const { isActive, id } = action.payload;
            layerById(state, id).isActive = isActive
        })
        .addCase(SET_LAYER_STEPS, (state, action) => {
            const { id, steps } = action.payload;
            layerById(state, id).steps = steps
        })
        .addCase(SET_LAYER_NAME, (state, action) => {
            const { id, name } = action.payload;
            layerById(state, id).name = name
        })
        .addCase(SET_LAYER_TYPE, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).type = value
        })
        .addCase(SET_LAYER_TIME_OFFSET, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).timeOffset = value
        })
        .addCase(SET_LAYER_PERCENT_OFFSET, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).percentOffset = value
        })
        .addCase(SET_LAYER_GAIN, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).gain = value
        })
        .addCase(SET_LAYER_MUTE, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).isMuted = value
        })
        .addCase(SET_LAYER_PREVIEW, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).instrument.isPreviewed = value
        })
        .addCase(UPDATE_LAYER_INSTRUMENT, (state, action) => {
            const { id, instrument } = action.payload;
            Object.assign(layerById(state, id).instrument, instrument)
        })
        .addCase(UPDATE_LAYER_AUTOMATION_FX_ID, (state, action) => {
            const { id, value } = action.payload;
            layerById(state, id).automationFxId = value
        })
        .addCase(UPDATE_LAYER, (state, action) => {
            const { id, data } = action.payload;
            Object.assign(layerById(state, id), data)
        })
        .addCase(ADD_LAYER, (state, action) => {
            state.layers.push(action.payload.layer)
        })
        .addCase(ADD_ROUND_LAYERS, (state, action) => {
            state.layers.push(...action.payload.layers)
        })
        .addCase(REMOVE_LAYER, (state, action) => {
            state.layers.splice(_.findIndex(state.layers, { id: action.payload.id }), 1)
        })
        .addCase(ADD_USERBUS, (state, action) => {
            const { userId, userBus } = action.payload;
            state.userBuses[userId] = userBus
        })
        .addCase(SET_USER_BUS_FX_OVERRIDE, (state, action) => {
            const { userId, fxId, value } = action.payload;
            _.find(state.userBuses[userId].fx, { id: fxId }).isOverride = value
        })
        .addCase(SET_USER_BUS_FX, (state, action) => {
            const { userId, data } = action.payload;
            state.userBuses[userId].fx = data
        })
        .addCase(SAVE_USER_PATTERN, (state, action) => {
            const { userId, patternId, data } = action.payload;
            _.find(state.userPatterns[userId].patterns, { id: patternId }).state = data
        })
        .addCase(SET_USER_PATTERN_SEQUENCE, (state, action) => {
            const { userId, data } = action.payload;
            state.userPatterns[userId].sequence = data
        })
        .addCase(SET_IS_PLAYING_SEQUENCE, (state, action) => {
            const { userId, value } = action.payload;
            state.userPatterns[userId].isPlayingSequence = value
        })
        .addCase(SET_ROUND_NAME, (state, action) => {
            state.name = action.payload.value
        })
        .addCase(SET_ROUND_BPM, (state, action) => {
            state.bpm = action.payload.bpm
        })
        .addCase(SET_ROUND_SWING, (state, action) => {
            state.swing = action.payload.swing
        })
        .addCase(SET_ROUND_ID, (state, action) => {
            state.id = action.payload.id
        })
        .addCase(SET_IS_PLAYING, (state, action) => {
            state.isPlaying = action.payload.value
        })
        .addCase(SET_ROUND_SHORTLINK, (state, action) => {
            state.shortLink = action.payload.value
        })
        .addCase(SET_ROUND_CURRENT_USERS, (state, action) => {
            state.currentUsers = action.payload.value
        })
        .addCase(SET_ROUND_CONTRIBUTORS, (state, action) => {
            state.contributors = action.payload.value
        })
});
