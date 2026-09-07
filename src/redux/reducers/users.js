import { createReducer } from "@reduxjs/toolkit";
import { SET_USERS } from "../actionTypes";

const initialState = [];

export default createReducer(initialState, (builder) => {
    builder
        .addCase(SET_USERS, (state, action) => action.payload.value)
});
