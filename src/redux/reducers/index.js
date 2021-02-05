import { combineReducers } from "redux";
import user from './user';
import users from './users';
import display from './display';
import rounds from './rounds';
import round from './round';


export default combineReducers({
    user,
    users,
    display,
    rounds,
    round
});
