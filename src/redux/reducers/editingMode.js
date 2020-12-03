import { SET_EDITING_MODE, RESET_EDITING_MODE_STORE } from "../actionTypes";

const initialState = 'steps';

export default function(state = initialState, action) {
  switch (action.type) {
    case RESET_EDITING_MODE_STORE: {
      console.log('reset');
      return initialState;
    }
    case SET_EDITING_MODE: {
      return action.payload.mode;
    }
    default:
      return state;
  }
}
