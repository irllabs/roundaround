import { Color, Vector3 } from 'three';

export const Colors = {
    off: new Color(0.9, 0.9, 0.9),
    on: new Color(0.2, 0.3, 0.8),
    accent: new Color(0xcc76f7),
    active: new Color(0.8, 0.3, 0.4),
    neutral: new Color(0xabb2bf)
};

export const Constants = {
    AXIS: new Vector3(0, 1, 0),
    ANGLE: Math.PI / 2
};
// for change
export const Layer = {
    Color: {
        Selected: Colors.off,
        Deselected: Colors.on
    },
    Mark: {
        Length: 0.2,
        Color: Colors.on
    },
    Instrument: {
        LabelWidth: '100px', // value in pixels
        LabelColor: Colors.on,
    },
    Line: {
        MinThickness: 0.01, // must be lesser than max
        MaxThickness: 0.05, // must be greater than min,
    },
    DefaultStepsAmount: 16,
    Padding: 0.5
};
export const Step = {
    Geometry: {
        EdgeColor: Colors.on,
        FillColor: Colors.on,
        EdgeLength: 0.2,
        MinScale: 1, // must be lesser than max
        MaxScale: 1.5, // must be greater than min
    },
    Note: {
        TextSize: '16px',
        TextColor: '#fff'
    }
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

export const Round = {
    DashedOutline: {
        Color: Colors.neutral,
        Padding: 1
    },
    Tempo: {
        Color: '#cc76f7'
    },
    Padding: {
        Interior: 1
    }
};

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

export const ContributorSphereArgs = [0.1, 16, 16,];

export const ThrottleDelay = 1000;

export const ACTIVE_TTL = 0.6;

export const EditorLineParams = {
    speed: 4
}
