import { createReducer } from "@reduxjs/toolkit";
import {
    SET_IS_SHOWING_SIGNIN_DIALOG,
    SET_REDIRECT_AFTER_SIGN_IN,
    SET_SIGNUP_DISPLAYNAME,
    SET_SELECTED_LAYER_ID,
    SET_IS_SHOWING_LAYER_SETTINGS,
    SET_IS_USING_JITSI,
    SET_IS_SHOWING_RENAME_DIALOG,
    SET_IS_SHOWING_DELETE_ROUND_DIALOG,
    SET_IS_SHOWING_SHARE_DIALOG,
    SET_DISABLE_KEY_LISTENER,
    SET_SELECTED_ROUND_ID,
    SET_IS_SHOWING_ORIENTATION_DIALOG,
    SET_IS_RECORDING_SEQUENCE,
    SET_CURRENT_SEQUENCE_PATTERN
} from "../actionTypes";

const initialState = {
    selectedLayerId: null,
    isShowingSignInDialog: false,
    redirectAfterSignIn: null,
    signupDisplayName: null,
    isUsingJitsi: false,
    isShowingRenameDialog: false,
    isShowingDeleteRoundDialog: false,
    isShowingShareDialog: false,
    disableKeyListener: false,
    selectedRoundId: null,
    isShowingOrientationDialog: false,
    isRecordingSequence: false,
    currentSequencePattern: null
};

export default createReducer(initialState, (builder) => {
    builder
        .addCase(SET_IS_SHOWING_SIGNIN_DIALOG, (state, action) => {
            state.isShowingSignInDialog = action.payload.value
        })
        .addCase(SET_REDIRECT_AFTER_SIGN_IN, (state, action) => {
            state.redirectAfterSignIn = action.payload.value
        })
        .addCase(SET_SIGNUP_DISPLAYNAME, (state, action) => {
            state.signupDisplayName = action.payload.value
        })
        .addCase(SET_SELECTED_LAYER_ID, (state, action) => {
            state.selectedLayerId = action.payload.layerId
        })
        .addCase(SET_IS_SHOWING_LAYER_SETTINGS, (state, action) => {
            state.isShowingLayerSettings = action.payload.value
        })
        .addCase(SET_IS_USING_JITSI, (state, action) => {
            state.isUsingJitsi = action.payload.value
        })
        .addCase(SET_IS_SHOWING_RENAME_DIALOG, (state, action) => {
            state.isShowingRenameDialog = action.payload.value
        })
        .addCase(SET_IS_SHOWING_DELETE_ROUND_DIALOG, (state, action) => {
            state.isShowingDeleteRoundDialog = action.payload.value
        })
        .addCase(SET_IS_SHOWING_SHARE_DIALOG, (state, action) => {
            state.isShowingShareDialog = action.payload.value
        })
        .addCase(SET_DISABLE_KEY_LISTENER, (state, action) => {
            state.disableKeyListener = action.payload.value
        })
        .addCase(SET_SELECTED_ROUND_ID, (state, action) => {
            state.selectedRoundId = action.payload.value
        })
        .addCase(SET_IS_SHOWING_ORIENTATION_DIALOG, (state, action) => {
            state.isShowingOrientationDialog = action.payload.value
        })
        .addCase(SET_IS_RECORDING_SEQUENCE, (state, action) => {
            state.isRecordingSequence = action.payload.value
        })
        .addCase(SET_CURRENT_SEQUENCE_PATTERN, (state, action) => {
            state.currentSequencePattern = action.payload.value
        })
});
