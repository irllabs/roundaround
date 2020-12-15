import {
    SET_ROUND_DATA,
    TOGGLE_STEP,
    SET_STEP_VELOCITY,
    SET_STEP_PROBABILITY,
    SET_STEP_NOTE,
    ADD_LAYER_STEP,
    REMOVE_LAYER_STEP,
    SET_LAYER_NAME,
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

const initialState = null;
const updateStepProperty = (state, name, value, layerIndex, stepIndex, user) => {
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
                layerIndex,
                stepIndex
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
            const { layerIndex, stepIndex, isOn, user } = action.payload;
            return updateStepProperty(state, 'isOn', isOn, layerIndex, stepIndex, user);
        }
        case SET_STEP_VELOCITY: {
            const { layerIndex, stepIndex, velocity, user } = action.payload;
            return updateStepProperty(state, 'velocity', velocity, layerIndex, stepIndex, user);
        }
        case SET_STEP_PROBABILITY: {
            const { layerIndex, stepIndex, probability, user } = action.payload;
            return updateStepProperty(state, 'probability', probability, layerIndex, stepIndex, user);
        }
        case SET_STEP_NOTE: {
            const { layerIndex, stepIndex, note, user } = action.payload;
            return updateStepProperty(state, 'note', note, layerIndex, stepIndex, user);
        }
        case TOGGLE_LAYER: {
            const { isActive, layerIndex, user } = action.payload;
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
            const { layerIndex, steps, user } = action.payload;
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
        case ADD_LAYER_STEP: {
            const { layerIndex, step, user } = action.payload;
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            $push: [step]
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
        case REMOVE_LAYER_STEP: {
            const { layerIndex, stepIndex, user } = action.payload;
            return update(state, {
                layers: {
                    [layerIndex]: {
                        steps: {
                            $splice: [[stepIndex, 1]]
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
            const { layerIndex, name, user } = action.payload;
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
        case UPDATE_LAYER_INSTRUMENT: {
            const { layerIndex, instrument, user } = action.payload;
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
            const { layerIndex, user } = action.payload;
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
