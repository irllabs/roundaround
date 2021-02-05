import {
    SET_IS_SHOWING_SIGNIN_DIALOG,
    SET_USER,
    SET_REDIRECT_AFTER_SIGN_IN,
    SET_ROUNDS,
    SET_SIGNUP_DISPLAYNAME,
    SET_USER_DISPLAYNAME,
    SET_ROUND,
    SET_IS_PLAYING,
    SET_USERS,
    SET_IS_USING_JITSI,
    SET_IS_SHOWING_RENAME_DIALOG,
    SET_IS_SHOWING_DELETE_ROUND_DIALOG,
    SET_ROUND_NAME,
    SET_IS_SHOWING_SHARE_DIALOG,
    SET_ROUND_SHORTLINK,
    SET_USER_BUS_FX_OVERRIDE,
    SET_USER_BUS_FX,
    SAVE_USER_PATTERN,
    SET_LAYER_STEPS,
    ADD_USERBUS,
    SET_ROUND_CURRENT_USERS,
    SET_DISABLE_KEY_LISTENER,
    SET_USER_COLOR,
    SET_ROUND_BPM,
    SET_ROUND_SWING,
    SET_SELECTED_ROUND_ID
} from './actionTypes'

// User
export const setUser = (value) => ({
    type: SET_USER,
    payload: { value }
})
export const setUserDisplayName = (value) => ({
    type: SET_USER_DISPLAYNAME,
    payload: { value }
})
export const setUserColor = (value) => ({
    type: SET_USER_COLOR,
    payload: { value }
})

// Users
export const setUsers = (value) => ({
    type: SET_USERS,
    payload: { value }
})

// Userbus
export const addUserBus = (userId, userBus) => ({
    type: ADD_USERBUS,
    payload: { userId, userBus }
})

// Display
export const setIsShowingSignInDialog = (value) => ({
    type: SET_IS_SHOWING_SIGNIN_DIALOG,
    payload: { value }
})
export const setRedirectAfterSignIn = (value) => ({
    type: SET_REDIRECT_AFTER_SIGN_IN,
    payload: { value }
})
export const setSignUpDisplayName = (value) => ({
    type: SET_SIGNUP_DISPLAYNAME,
    payload: { value }
})
export const setIsUsingJitsi = (value) => ({
    type: SET_IS_USING_JITSI,
    payload: { value }
})
export const setIsShowingRenameDialog = (value) => ({
    type: SET_IS_SHOWING_RENAME_DIALOG,
    payload: { value }
})
export const setIsShowingDeleteRoundDialog = (value) => ({
    type: SET_IS_SHOWING_DELETE_ROUND_DIALOG,
    payload: { value }
})
export const setIsShowingShareDialog = (value) => ({
    type: SET_IS_SHOWING_SHARE_DIALOG,
    payload: { value }
})
export const setDisableKeyListener = (value) => ({
    type: SET_DISABLE_KEY_LISTENER,
    payload: { value }
})
export const setSelectedRoundId = (value) => ({
    type: SET_SELECTED_ROUND_ID,
    payload: { value }
})

// Rounds
export const setRounds = (value) => ({
    type: SET_ROUNDS,
    payload: { value }
})
export const setRoundShortLink = (value) => ({
    type: SET_ROUND_SHORTLINK,
    payload: { value }
})

// Round
export const setRound = (value) => ({
    type: SET_ROUND,
    payload: { value }
})
export const setIsPlaying = (value) => ({
    type: SET_IS_PLAYING,
    payload: { value }
})
export const setRoundName = (value) => ({
    type: SET_ROUND_NAME,
    payload: { value }
})
export const setUserBusFxOverride = (userId, fxId, value) => ({
    type: SET_USER_BUS_FX_OVERRIDE,
    payload: { userId, fxId, value }
})
export const setUserBusFx = (userId, data) => ({
    type: SET_USER_BUS_FX,
    payload: { userId, data }
})
export const saveUserPattern = (userId, patternId, data) => ({
    type: SAVE_USER_PATTERN,
    payload: { userId, patternId, data }
})
export const setRoundCurrentUsers = (value) => ({
    type: SET_ROUND_CURRENT_USERS,
    payload: { value }
})
export const setRoundBpm = (bpm) => ({
    type: SET_ROUND_BPM,
    payload: { bpm }
})
export const setRoundSwing = (swing) => ({
    type: SET_ROUND_SWING,
    payload: { swing }
})
// Layer
export const setLayerSteps = (id, steps) => ({
    type: SET_LAYER_STEPS,
    payload: { id, steps }
})