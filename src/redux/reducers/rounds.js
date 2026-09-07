import { createReducer } from "@reduxjs/toolkit";
import { SET_ROUNDS } from "../actionTypes";

const initialState = [];

export default createReducer(initialState, (builder) => {
    builder
        .addCase(SET_ROUNDS, (state, action) => action.payload.value)
});
