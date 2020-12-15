import { ACTIVE_TTL } from '../../../../utils/constants';
import * as Tone from 'tone';

const getActivePercent = (activeTtl) => {
    const x = (ACTIVE_TTL - activeTtl) / ACTIVE_TTL;
    return Math.exp(
        -Math.PI * 2 * x ** 2
    );
};
// for changing color of the step and deciding if to play it
export class ActiveStep {
    constructor (isOn, note, velocity, probability) {
        this.isOn = isOn;
        this.activeTtl = 0;
        this.note = note;
        this.velocity = velocity;
        this.probability = probability;
    }

    toggleIsOn (isOn) {
        this.isOn = isOn;
    }

    setNote (note) {
        this.note = note;
    }

    setVelocity (velocity) {
        this.velocity = velocity;
    }

    setProbability (probability) {
        this.probability = probability;
    }

    setAsActive = () => {
        this.activeTtl = ACTIVE_TTL;
    }

    update (elapsedTime) {
        if (this.activeTtl <= 0) {
            return { activePercent: 0 };
        }
        this.activeTtl = this.activeTtl - elapsedTime;
        return { activePercent: getActivePercent(this.activeTtl) };
    }
}

// for managing what to play and what not
export class ActiveLayer {
    constructor (layerIsActive) {
        this.layerIsActive = layerIsActive;
        this.steps = {};
        this.instrument;
        this.gain;
    }

    addStep (step) {
        this.steps[step.id] = new ActiveStep(step.isOn, step.note, step.velocity, step.probability);
    }

    removeStep (stepId) {
        delete this.steps[stepId];
    }

    toggleStep (stepId, isOn) {
        this.steps[stepId].toggleIsOn(isOn)
    }

    toggleLayerActive = (isActive) => {
        this.layerIsActive = isActive;
    }

    setNewInstrument = (instrument) => {
        this.instrument = instrument;
    }

    setInstrumentGain = (gain) => {
        this.gain = gain;
    }

    changeGainValue (gain) {
        this.gain.gain.linearRampToValueAtTime(gain, Tone.now() + 0.2);
    }
}
