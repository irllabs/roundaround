import { SET_COLLABORATION, RESET_COLLABORATION_STORE } from "../actionTypes";

const initialState = null;

export default function(state = initialState, action) {
  switch (action.type) {
    case SET_COLLABORATION: {
        return action.payload.collaboration
    };
    case RESET_COLLABORATION_STORE: {
        return initialState
    }
    default:
      return state;
  }
}
