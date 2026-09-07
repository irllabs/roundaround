import { createReducer } from "@reduxjs/toolkit";
import { SET_USER, CLEAR_USER, SET_USER_DISPLAYNAME, SET_USER_COLOR } from "../actionTypes";

const initialState = null;

export default createReducer(initialState, (builder) => {
    builder
        .addCase(SET_USER, (state, action) => action.payload.value)
        .addCase(SET_USER_DISPLAYNAME, (state, action) => {
            state.displayName = action.payload.value
        })
        .addCase(SET_USER_COLOR, (state, action) => {
            state.color = action.payload.value
        })
        .addCase(CLEAR_USER, () => initialState)
});
