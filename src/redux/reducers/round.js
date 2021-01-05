import {
    SET_ROUND_DATA,
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
    TOGGLE_LAYER,
    SET_LAYER_STEPS,
    SET_ROUND_ID,
    RESET_ROUND_STORE,
    UPDATE_STEP
} from "../actionTypes";
import update from 'immutability-helper';
import _ from 'lodash'

const initialState = null;
const updateStepProperty = (state, name, value, layerId, stepId, user) => {
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
        case RESET_ROUND_STORE: {
            console.log('reset');
            return initialState;
        }
        case SET_ROUND_DATA: {
            const { data } = action.payload;
            return data;
        }
        case UPDATE_STEP: {
            const { step, layerId, stepId, user } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id: layerId })
            const layer = _.find(state.layers, { id: layerId })
            const stepIndex = _.findIndex(layer.steps, { id: stepId })
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            [stepIndex]: {
                                $set: step
                            }
                        }
                    }
                }
            });
        }
        case ADD_STEP: {
            const { layerId, step, user } = action.payload;
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
            const { layerId, stepId, user } = action.payload;
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
            const { layerId, stepId, isOn, user } = action.payload;
            return updateStepProperty(state, 'isOn', isOn, layerId, stepId, user);
        }
        case SET_STEP_VELOCITY: {
            const { layerId, stepId, velocity, user } = action.payload;
            return updateStepProperty(state, 'velocity', velocity, layerId, stepId, user);
        }
        case SET_STEP_PROBABILITY: {
            const { layerId, stepId, probability, user } = action.payload;
            return updateStepProperty(state, 'probability', probability, layerId, stepId, user);
        }
        case SET_STEP_NOTE: {
            const { layerId, stepId, note, user } = action.payload;
            return updateStepProperty(state, 'note', note, layerId, stepId, user);
        }
        case TOGGLE_LAYER: {
            const { isActive, id, user } = action.payload;
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
            const { id, steps, user } = action.payload;
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
            const { id, name, user } = action.payload;
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
        case SET_LAYER_GAIN: {
            const { id, value, user } = action.payload;
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
            const { id, value, user } = action.payload;
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
            const { id, value, user } = action.payload;
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
            const { id, instrument, user } = action.payload;
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
            const { layer, user } = action.payload;
            return update(state, {
                layers: {
                    $push: [layer]
                }
            })
        }
        case REMOVE_LAYER: {
            const { id, user } = action.payload;
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
            const { name, user } = action.payload;
            return update(state, {
                name: {
                    $set: name
                }
            })
        }
        case SET_ROUND_BPM: {
            const { bpm, user } = action.payload;
            return update(state, {
                bpm: {
                    $set: bpm
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
        default:
            return state;
    }
}
