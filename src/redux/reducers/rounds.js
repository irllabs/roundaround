/* eslint-disable import/no-anonymous-default-export */
import { SET_ROUNDS } from "../actionTypes";
import update from 'immutability-helper';

const initialState = [];

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_ROUNDS: {
            return update(state, {
                $set: action.payload.value
            }
            )

        }
        default:
            return state;
    }
}