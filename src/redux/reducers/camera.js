import { SET_CAMERA, RESET_CAMERA_STORE } from "../actionTypes";

const initialState = 'orthographic';

export default function(state = initialState, action) {
  switch (action.type) {
    case RESET_CAMERA_STORE: {
      console.log('reset');
      return initialState;
    }
    case SET_CAMERA: {
      return action.payload.camera;
    }
    default:
      return state;
  }
}
