import { SET_USER, CLEAR_USER } from "../actionTypes";

const initialState = null;

export default function(state = initialState, action) {
    // console.log(action)
  switch (action.type) {
    case SET_USER: {
        return action.payload.user
    };
    case CLEAR_USER: {
        return initialState
    }
    default:
      return state;
  }
}
