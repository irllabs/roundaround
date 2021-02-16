/* eslint-disable import/no-anonymous-default-export */
import {
    SET_ROUND,
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
    SET_LAYER_TIME_OFFSET
} from "../actionTypes";
import update from 'immutability-helper';
import _ from 'lodash'

const initialState = null;
const updateStepProperty = (state, name, value, layerId, stepId) => {
    const layerIndex = _.findIndex(state.layers, { id: layerId })
    const layer = _.find(state.layers, { id: layerId })
    const stepIndex = _.findIndex(layer.steps, { id: stepId })

    return update(state, {
        layers: {
            [layerIndex]: {
                steps: {
                    [stepIndex]: {
                        [name]: {
                            $set: value
                        }
                    }
                }
            }
        }
    });
}

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_ROUND: {
            return update(state, {
                $set: action.payload.value
            }
            )

        }
        case UPDATE_STEP: {
            const { step, layerId } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id: layerId })
            const layer = _.find(state.layers, { id: layerId })
            const stepIndex = _.findIndex(layer.steps, { id: step.id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            [stepIndex]: {
                                $merge: step
                            }
                        }
                    }
                }
            });
        }
        case ADD_STEP: {
            const { layerId, step } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id: layerId })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            $push: [step]
                        }
                    }
                }
            })
        }
        case REMOVE_STEP: {
            const { layerId, stepId } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id: layerId })
            const layer = _.find(state.layers, { id: layerId })
            const stepIndex = _.findIndex(layer.steps, { id: stepId })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            $splice: [[stepIndex, 1]]
                        }
                    }
                }
            })
        }
        case TOGGLE_STEP: {
            const { layerId, stepId, isOn } = action.payload;
            return updateStepProperty(state, 'isOn', isOn, layerId, stepId);
        }
        case SET_STEP_VELOCITY: {
            const { layerId, stepId, velocity } = action.payload;
            return updateStepProperty(state, 'velocity', velocity, layerId, stepId);
        }
        case SET_STEP_PROBABILITY: {
            const { layerId, stepId, probability } = action.payload;
            return updateStepProperty(state, 'probability', probability, layerId, stepId);
        }
        case SET_STEP_NOTE: {
            const { layerId, stepId, note } = action.payload;
            return updateStepProperty(state, 'note', note, layerId, stepId);
        }
        case TOGGLE_LAYER: {
            const { isActive, id } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        isActive: {
                            $set: isActive
                        }
                    }
                }
            })
        }
        case SET_LAYER_STEPS: {
            const { id, steps } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            $set: steps
                        }
                    }
                }
            })
        }
        case SET_LAYER_NAME: {
            const { id, name } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        name: {
                            $set: name
                        }
                    }
                }
            })
        }
        case SET_LAYER_TYPE: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        type: {
                            $set: value
                        }
                    }
                }
            })
        }
        case SET_LAYER_TIME_OFFSET: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        timeOffset: {
                            $set: value
                        }
                    }
                }
            })
        }

        case ADD_USERBUS: {
            const { userId, userBus } = action.payload;
            return update(state, {
                userBuses: {
                    [userId]: {
                        $set: userBus
                    }
                }
            })
        }
        case SET_USER_BUS_FX_OVERRIDE: {
            const { userId, fxId, value } = action.payload;
            const fxIndex = _.findIndex(state.userBuses[userId].fx, { id: fxId })
            //console.log('SET_USER_BUS_FX_OVERRIDE', userId, fxId, value, state);
            return update(state, {
                userBuses: {
                    [userId]: {
                        fx: {
                            [fxIndex]: {
                                isOverride: {
                                    $set: value
                                }
                            }
                        }
                    }
                }
            })
        }
        case SET_USER_BUS_FX: {
            const { userId, data } = action.payload;
            // console.log('SET_USER_BUS_FX', userId, data, state);
            return update(state, {
                userBuses: {
                    [userId]: {
                        fx: {

                            $set: data


                        }
                    }
                }
            })
        }
        case UPDATE_LAYER_AUTOMATION_FX_ID: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        automationFxId: {
                            $set: value
                        }
                    }
                }
            })
        }
        case SAVE_USER_PATTERN: {
            const { userId, patternId, data } = action.payload;
            const patternIndex = _.findIndex(state.userPatterns[userId].patterns, { id: patternId })
            return update(state, {
                userPatterns: {
                    [userId]: {
                        patterns: {
                            [patternIndex]: {
                                state: {
                                    $set: data
                                }
                            }
                        }
                    }
                }
            })
        }
        case SET_LAYER_GAIN: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        gain: {
                            $set: value
                        }
                    }
                }
            })
        }
        case SET_LAYER_PREVIEW: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        instrument: {
                            isPreviewed: {
                                $set: value
                            }
                        }
                    }
                }
            })
        }
        case SET_LAYER_MUTE: {
            const { id, value } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        instrument: {
                            isMuted: {
                                $set: value
                            }
                        }
                    }
                }
            })
        }
        case UPDATE_LAYER_INSTRUMENT: {
            const { id, instrument } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        instrument: {
                            $merge: instrument
                        }
                    }
                }
            })
        }
        case ADD_LAYER: {
            const { layer } = action.payload;
            return update(state, {
                layers: {
                    $push: [layer]
                }
            })
        }
        case REMOVE_LAYER: {
            const { id } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    $splice: [[layerIndex, 1]]
                }
            })
        }
        case ADD_ROUND_LAYERS: {
            const { layers } = action.payload;
            return update(state, {
                layers: {
                    $push: layers
                }
            })
        }
        case SET_ROUND_NAME: {
            const { value } = action.payload;
            return update(state, {
                name: {
                    $set: value
                }
            })
        }
        case SET_ROUND_BPM: {
            const { bpm } = action.payload;
            return update(state, {
                bpm: {
                    $set: bpm
                }
            })
        }
        case SET_ROUND_SWING: {
            const { swing } = action.payload;
            return update(state, {
                swing: {
                    $set: swing
                }
            })
        }
        case SET_ROUND_ID: {
            const { id } = action.payload;
            return update(state, {
                id: {
                    $set: id
                }
            })
        }
        case SET_IS_PLAYING: {
            const { value } = action.payload;
            return update(state, {
                isPlaying: {
                    $set: value
                }
            })
        }
        case SET_ROUND_SHORTLINK: {
            const { value } = action.payload;
            return update(state, {
                shortLink: {
                    $set: value
                }
            })
        }
        case SET_ROUND_CURRENT_USERS: {
            const { value } = action.payload;
            return update(state, {
                currentUsers: {
                    $set: value
                }
            })
        }
        default:
            return state;
    }
}
