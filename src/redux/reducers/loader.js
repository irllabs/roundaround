import { TOGGLE_LOADER, RESET_LOADER_STORE } from "../actionTypes";

const initialState = {
    active: false
};

export default function(state = initialState, action) {
  switch (action.type) {
    case RESET_LOADER_STORE: {
      console.log('reset');
      return initialState;
    }
    case TOGGLE_LOADER: {
      return {
        ...state,
        active: action.payload.active
      };
    }
    default:
      return state;
  }
}
