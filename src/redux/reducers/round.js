import {
    SET_ROUND_DATA,
    TOGGLE_STEP,
    SET_STEP_VELOCITY,
    SET_STEP_PROBABILITY,
    SET_STEP_NOTE,
    ADD_LAYER_STEP,
    REMOVE_LAYER_STEP,
    SET_LAYER_NAME,
    SET_LAYER_GAIN,
    SET_LAYER_MUTE,
    SET_LAYER_PREVIEW,
    UPDATE_LAYER_INSTRUMENT,
    ADD_ROUND_LAYER,
    ADD_ROUND_LAYERS,
    REMOVE_ROUND_LAYER,
    SET_ROUND_NAME,
    SET_ROUND_BPM,
    TOGGLE_LAYER,
    SET_LAYER_STEPS,
    SET_ROUND_ID,
    RESET_ROUND_STORE
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
        },
        lastEdition: {
            $set: {
                unit: 'step',
                layerId,
                stepId
            }
        },
        lastEditor: {
            $set: user
        },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layer',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layer',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layerControls',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layerControls',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layerControls',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layerControls',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layerControls',
                        layerIndex
                    }
                },
            })
        }
        case ADD_ROUND_LAYER: {
            const { layer, user } = action.payload;
            return update(state, {
                layers: {
                    $push: [layer]
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layer',
                        layerIndex: state.layers.length
                    }
                },
            })
        }
        case REMOVE_ROUND_LAYER: {
            const { id, user } = action.payload;
            const layerIndex = _.findIndex(state.layers, { id })
            return update(state, {
                layers: {
                    $splice: [[layerIndex, 1]]
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'layer',
                        layerIndex
                    }
                },
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
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'round',
                    }
                },
            })
        }
        case SET_ROUND_BPM: {
            const { bpm, user } = action.payload;
            return update(state, {
                bpm: {
                    $set: bpm
                },
                lastEditor: {
                    $set: user
                },
                lastEdition: {
                    $set: {
                        unit: 'round',
                    }
                },
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
