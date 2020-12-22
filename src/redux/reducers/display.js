import {
    SET_SELECTED_LAYER_ID,
    SET_IS_SHOWING_LAYER_SETTINGS
} from "../actionTypes";
import update from 'immutability-helper';

const initialState = {
    selectedLayerId: null,
    isShowingLayerSettings: false
};

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_SELECTED_LAYER_ID: {
            return update(state, {
                selectedLayerId: { $set: action.payload.layerId }
            })
        }
        case SET_IS_SHOWING_LAYER_SETTINGS: {
            return update(state, {
                isShowingLayerSettings: { $set: action.payload.value }
            })
        }
        default:
            return state;
    }
}