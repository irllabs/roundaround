import { SET_EDIT_ALL_LAYERS, RESET_EDIT_ALL_LAYERS_STORE } from "../actionTypes";

const initialState = false;

export default function (state = initialState, action) {
    switch (action.type) {
        case RESET_EDIT_ALL_LAYERS_STORE: {
            return initialState;
        }
        case SET_EDIT_ALL_LAYERS: {
            return action.payload.value;
        }
        default:
            return state;
    }
}
