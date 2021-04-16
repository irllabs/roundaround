/* eslint-disable import/no-anonymous-default-export */
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
import update from 'immutability-helper';

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

export default function (state = initialState, action) {
    switch (action.type) {
        case SET_IS_SHOWING_SIGNIN_DIALOG: {
            return update(state, {
                isShowingSignInDialog: { $set: action.payload.value }
            })
        }
        case SET_REDIRECT_AFTER_SIGN_IN: {
            return update(state, {
                redirectAfterSignIn: { $set: action.payload.value }
            })
        }
        case SET_SIGNUP_DISPLAYNAME: {
            return update(state, {
                signupDisplayName: { $set: action.payload.value }
            })
        }
        case SET_SELECTED_LAYER_ID: {
            return update(state, {
                selectedLayerId: { $set: action.payload.layerId }
            })
        }
        case SET_IS_SHOWING_LAYER_SETTINGS: {
            return update(state, {
                isShowingLayerSettings: { $set: action.payload.value }
            })
        }
        case SET_IS_USING_JITSI: {
            return update(state, {
                isUsingJitsi: { $set: action.payload.value }
            })
        }
        case SET_IS_SHOWING_RENAME_DIALOG: {
            return update(state, {
                isShowingRenameDialog: { $set: action.payload.value }
            })
        }
        case SET_IS_SHOWING_DELETE_ROUND_DIALOG: {
            return update(state, {
                isShowingDeleteRoundDialog: { $set: action.payload.value }
            })
        }
        case SET_IS_SHOWING_SHARE_DIALOG: {
            return update(state, {
                isShowingShareDialog: { $set: action.payload.value }
            })
        }
        case SET_DISABLE_KEY_LISTENER: {
            return update(state, {
                disableKeyListener: { $set: action.payload.value }
            })
        }
        case SET_SELECTED_ROUND_ID: {
            return update(state, {
                selectedRoundId: { $set: action.payload.value }
            })
        }
        case SET_IS_SHOWING_ORIENTATION_DIALOG: {
            return update(state, {
                isShowingOrientationDialog: { $set: action.payload.value }
            })
        }
        case SET_IS_RECORDING_SEQUENCE: {
            return update(state, {
                isRecordingSequence: { $set: action.payload.value }
            })
        }
        case SET_CURRENT_SEQUENCE_PATTERN: {
            return update(state, {
                currentSequencePattern: { $set: action.payload.value }
            })
        }

        default:
            return state;
    }
}