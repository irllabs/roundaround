export const HTML_UI_Params = {
    stepDiameter: 48,
    addNewLayerButtonDiameter: 128,
    layerPadding: 16,
    initialLayerPadding: 384,
    avatarDiameter: 128,
    avatarPadding: 128,
    avatarRoundPadding: 128,
    activityIndicatorDiameter: 48,
    activityAnimationTime: 700,
    stepAnimationUpdateTime: 200,
    stepStrokeWidth: 6,
    layerStrokeMax: 48,
    layerStrokeOpacity: 0.3
}


// for change
export const Layer = {
    DefaultStepsAmount: 16,
    Padding: 0.5
};

export const Beat = {
    MinVelocity: 0,
    MaxVelocity: 1,
    MinProbability: 0,
    MaxProbability: 1
};

export const Instrument = {
    MinGain: 0,
    MaxGain: 1
}

export const Limits = {
    stepsPerLayer: {
        min: 1,
        max: 32
    }
}

// coefficients for mouse gesture speed
export const UX = {
    Step: {
        Velocity: 0.5,
        Probability: 0.5,
    },
    Layer: {
        Gain: 4,
        StepsAmount: 4
    }
}

export const SphereArgs = {
    addLayer: [0.3, 16, 16,],
    Contributor: [0.3, 32, 32,],
    xPadding: 1,
    yPadding: 1
}

export const ThrottleDelay = 1000;

export const ACTIVE_TTL = 0.6;

export const EditorLineParams = {
    speed: 4
}


