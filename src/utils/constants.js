export const HTML_UI_Params = {
    // sizes follow the Rounds-SoT Figma (node 1648-148100): a 48px step with a 4px outline, a 52px band at 20%,
    // 128px between your rings, the first ring 1024px across, the play button 128px, collaborators at half size
    stepDiameter: 48,
    sequenceButtonDots: 12,
    addNewLayerButtonDiameter: 128,
    playIconWidth: 60,
    playIconHeight: 67,
    layerPadding: 80,
    otherUserLayerPadding: 23,
    firstLayerDiameter: 1024,
    stepAnimationUpdateTime: 200,
    stepStrokeWidth: 4,
    layerStrokeMax: 52,
    layerStrokeOpacity: 0.1,
    stepModalDimensions: 200,
    stepModalThumbDiameter: 32,
    otherUserLayerSizeDivisor: 2,
}

export const Colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']
export const PRESET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export const KEY_MAPPINGS = {
    playToggle: ' '
}

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
    MinGain: -48,
    MaxGain: 6
}

export const Limits = {
    stepsPerLayer: {
        min: 1,
        max: 32
    }
}