/* eslint-disable import/no-anonymous-default-export */
import { SET_USER, CLEAR_USER, SET_USER_DISPLAYNAME, SET_USER_COLOR } from "../actionTypes";
import update from 'immutability-helper';

const initialState = null;

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_USER: {
            return update(state, {
                $set: action.payload.value
            }
            )
        }
        case SET_USER_DISPLAYNAME: {
            return update(state, {
                displayName: {
                    $set: action.payload.value
                }
            }
            )
        }
        case SET_USER_COLOR: {
            return update(state, {
                color: {
                    $set: action.payload.value
                }
            }
            )
        }
        case CLEAR_USER: {
            return update(state, {
                $set: initialState
            }
            )
        }
        default:
            return state;
    }
}