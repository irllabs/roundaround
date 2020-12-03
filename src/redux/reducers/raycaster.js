import { TOGGLE_RAYCASTER, RESET_RAYCASTER_STORE } from "../actionTypes";

const initialState = {
    active: true
};

export default function(state = initialState, action) {
  switch (action.type) {
    case RESET_RAYCASTER_STORE: {
      console.log('reset');
      return initialState;
    }
    case TOGGLE_RAYCASTER: {
      return {
        ...state,
        active: action.payload.active
      };
    }
    default:
      return state;
  }
}
