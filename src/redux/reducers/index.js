import { combineReducers } from "redux";
import camera from './camera';
import editingMode from './editingMode';
import editAllLayers from './editAllLayers';
import loader from "./loader";
import raycaster from "./raycaster";
import round from './round';
import rounds from './rounds';
import user from './user';
import collaboration from './collaboration';
import positions from './positions';

export default combineReducers({
    loader,
    raycaster,
    round,
    rounds,
    camera,
    editingMode,
    editAllLayers,
    user,
    collaboration,
    positions
});
