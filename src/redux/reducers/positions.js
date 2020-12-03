import {
    SET_CONTRIBUTORS_POSITIONS,
    SET_LAYERS_POSITIONS,
    SET_STEPS_POSITIONS,
    SET_LAYER_CONTROLS_POSITION,
    SET_ROUND_INFO_POSITION
} from "../actionTypes";
import update from 'immutability-helper';

const initialState = {
    contributors: {},
    layers: {},
    steps: {},
    layerControls: {},
    round: {}
};

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_CONTRIBUTORS_POSITIONS: {
            return update(state, {
                contributors: {
                    $set: action.payload.contributors
                }
            });
        }
        case SET_LAYERS_POSITIONS: {
            return update(state, {
                layers: {
                    $set: action.payload.layers
                }
            })
        }
        case SET_STEPS_POSITIONS: {
            const steps = {...state.steps, [action.payload.layerIndex]: action.payload.steps}
            return {...state, steps};
        }
        case SET_LAYER_CONTROLS_POSITION: {
            const {layerIndex, controls} = action.payload;
            return update(state, {
                layerControls: {
                    [layerIndex]: {
                        $set: controls
                    }
                }
            })
        }
        case SET_ROUND_INFO_POSITION: {
            return update(state, {
                round: {
                    $set: action.payload.round
                }
            })
        }
        default:
            return state;
    }
}
