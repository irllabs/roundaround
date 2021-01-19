import {
    RESET_CAMERA_STORE,
    RESET_EDITING_MODE_STORE,
    RESET_EDIT_ALL_LAYERS_STORE,
    RESET_LOADER_STORE,
    RESET_RAYCASTER_STORE,
    RESET_ROUNDS_STORE,
    RESET_ROUND_STORE,
    RESET_COLLABORATION_STORE,
    RESET_LAST_EDITOR,
    TOGGLE_LOADER,
    TOGGLE_RAYCASTER,
    SET_CAMERA,
    SET_EDITING_MODE,
    SET_EDIT_ALL_LAYERS,
    SET_ROUND_DATA,
    SET_ROUNDS,
    UPDATE_ROUND,
    TOGGLE_STEP,
    SET_STEP_VELOCITY,
    SET_STEP_PROBABILITY,
    SET_STEP_NOTE,
    ADD_STEP,
    REMOVE_STEP,
    SET_LAYER_NAME,
    SET_LAYER_GAIN,
    UPDATE_LAYER_INSTRUMENT,
    ADD_LAYER,
    ADD_ROUND_LAYERS,
    REMOVE_LAYER,
    SET_ROUND_NAME,
    SET_ROUND_BPM,
    SET_ROUND_ID,
    TOGGLE_LAYER,
    SET_LAYER_STEPS,
    ADD_ROUND,
    REMOVE_ROUND,
    SET_USER,
    CLEAR_USER,
    SET_COLLABORATION,
    SET_CONTRIBUTORS_POSITIONS,
    SET_LAYERS_POSITIONS,
    SET_LAYER_CONTROLS_POSITION,
    SET_STEPS_POSITIONS,
    SET_ROUND_INFO_POSITION,
    UPDATE_STEP,
    ADD_USERBUS,
    SET_USER_BUS_FX_OVERRIDE
} from "./actionTypes";

export const resetRoundsStore = () => ({
    type: RESET_ROUNDS_STORE
})
export const resetRoundStore = () => ({
    type: RESET_ROUND_STORE
})
export const resetRaycasterStore = () => ({
    type: RESET_RAYCASTER_STORE
})
export const resetLoaderStore = () => ({
    type: RESET_LOADER_STORE
})
export const resetCollaborationStore = () => ({
    type: RESET_COLLABORATION_STORE
})
export const resetEditingModeStore = () => ({
    type: RESET_EDITING_MODE_STORE
})
export const resetEditAllLayers = () => ({
    type: RESET_EDIT_ALL_LAYERS_STORE
})
export const resetCameraStore = () => ({
    type: RESET_CAMERA_STORE
})
export const resetLastEditor = () => ({
    type: RESET_LAST_EDITOR
})

export const setCamera = camera => ({
    type: SET_CAMERA,
    payload: { camera }
})

export const setEditingMode = mode => ({
    type: SET_EDITING_MODE,
    payload: { mode }
})

export const setEditAllLayers = value => ({
    type: SET_EDIT_ALL_LAYERS,
    payload: { value }
})

export const toggleLoader = active => ({
    type: TOGGLE_LOADER,
    payload: { active }
});

export const toggleRaycaster = active => ({
    type: TOGGLE_RAYCASTER,
    payload: { active }
})

export const setRoundData = data => ({
    type: SET_ROUND_DATA,
    payload: { data }
})

export const addRound = round => ({
    type: ADD_ROUND,
    payload: { round }
})

export const removeRound = roundIndex => ({
    type: REMOVE_ROUND,
    payload: { roundIndex }
})

export const setRounds = rounds => ({
    type: SET_ROUNDS,
    payload: { rounds }
})

export const updateRound = (round, roundIndex) => ({
    type: UPDATE_ROUND,
    payload: { round, roundIndex }
})
export const addUserBus = (userId, userBus) => ({
    type: ADD_USERBUS,
    payload: { userId, userBus }
})

export const toggleStep = (isOn, layerIndex, stepIndex, user) => ({
    type: TOGGLE_STEP,
    payload: { isOn, layerIndex, stepIndex, user }
})

export const updateStep = (step, layerId, stepId, user) => ({
    type: UPDATE_STEP,
    payload: { step, layerId, stepId, user }
})
export const addStep = (layerId, step, user) => ({
    type: ADD_STEP,
    payload: { step, layerId, user }
})

export const removeStep = (layerId, stepId, user) => ({
    type: REMOVE_STEP,
    payload: { layerId, stepId, user }
})

export const setStepVelocity = (velocity, layerIndex, stepIndex, user) => ({
    type: SET_STEP_VELOCITY,
    payload: { velocity, layerIndex, stepIndex, user }
})


export const setStepProbability = (probability, layerIndex, stepIndex, user) => ({
    type: SET_STEP_PROBABILITY,
    payload: { probability, layerIndex, stepIndex, user }
})

export const setStepNote = (note, layerIndex, stepIndex, user) => ({
    type: SET_STEP_NOTE,
    payload: { note, layerIndex, stepIndex, user }
})

export const toggleLayer = (isActive, layerIndex, user) => ({
    type: TOGGLE_LAYER,
    payload: { isActive, layerIndex, user }
})



export const setLayerSteps = (layerIndex, steps, user) => ({
    type: SET_LAYER_STEPS,
    payload: { layerIndex, steps, user }
})

export const setLayerName = (layerIndex, name, user) => ({
    type: SET_LAYER_NAME,
    payload: { layerIndex, name, user }
})
export const setLayerGain = (id, value, user) => ({
    type: SET_LAYER_GAIN,
    payload: { id, value, user }
})

export const updateLayerInstrument = (layerIndex, instrument, user) => ({
    type: UPDATE_LAYER_INSTRUMENT,
    payload: { layerIndex, instrument, user }
})

export const addLayer = (layer, user) => ({
    type: ADD_LAYER,
    payload: { layer, user }
})

export const removeLayer = (id, user) => ({
    type: REMOVE_LAYER,
    payload: { id, user }
})

export const addRoundLayers = layers => ({
    type: ADD_ROUND_LAYERS,
    payload: { layers }
})

export const setRoundName = (name, user) => ({
    type: SET_ROUND_NAME,
    payload: { name, user }
})

export const setRoundBpm = (bpm, user) => ({
    type: SET_ROUND_BPM,
    payload: { bpm, user }
})

export const setUser = user => ({
    type: SET_USER,
    payload: { user }
})

export const clearUser = () => ({
    type: CLEAR_USER
})

export const setCollaboration = collaboration => ({
    type: SET_COLLABORATION,
    payload: { collaboration }
})

export const setContributorsPositions = contributors => ({
    type: SET_CONTRIBUTORS_POSITIONS,
    payload: { contributors }
})

export const setLayersPositions = layers => ({
    type: SET_LAYERS_POSITIONS,
    payload: { layers }
})

export const setStepsPositions = (layerIndex, steps) => ({
    type: SET_STEPS_POSITIONS,
    payload: { layerIndex, steps }
})

export const setLayerControlsPositions = (layerIndex, controls) => ({
    type: SET_LAYER_CONTROLS_POSITION,
    payload: { layerIndex, controls }
})

export const setRoundInfoPosition = (round) => ({
    type: SET_ROUND_INFO_POSITION,
    payload: { round }
})

export const updateUserBusFxOverride = (userId, fxId, value) => ({
    type: SET_USER_BUS_FX_OVERRIDE,
    payload: { userId, fxId, value }
})