
import FXBaseClass, { BYPASS_STRATEGY_FREQUENCY } from './fx-base-class';
import * as Tone from 'tone';

export default class Lowpass extends FXBaseClass {
    static fxName = 'lowpass';
    static icon =
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.000488281" width="32.0004" height="32" rx="16" fill="white" fill-opacity="0.1"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M15.6534 13.0545C15.4833 11.8489 14.2846 11.0737 13.1153 11.4131L11.5122 11.8785C11.331 11.9311 11.1433 11.9578 10.9546 11.9578L9.33385 11.9578V13.2912L10.9546 13.2912C11.2691 13.2912 11.582 13.2467 11.884 13.159L13.487 12.6936C13.8768 12.5805 14.2764 12.8389 14.3331 13.2407L15.017 18.09C15.2489 19.7348 16.6566 20.9578 18.3177 20.9578H22.0008C22.369 20.9578 22.6675 20.6594 22.6675 20.2912C22.6675 19.923 22.369 19.6245 22.0008 19.6245H18.3177C17.321 19.6245 16.4764 18.8907 16.3373 17.9038L15.6534 13.0545Z" fill="white" fill-opacity="0.9"/>
        </svg>`

    static bypassStrategy = BYPASS_STRATEGY_FREQUENCY
    static defaultFrequency = 500
    // a lowpass at the top of the audible range passes everything
    static passThroughFrequency = 20000

    constructor(fxParameters) {
        super(fxParameters)
        this._type = 'lowpass';
        this.label = 'Lowpass'
        this.isOn = fxParameters.isOn
    }

    createNode() {
        return new Tone.Filter(this._frequency, this._type)
    }

    // Filter.type is a plain property, not a Signal
    set type(value) {
        this._type = value
        if (this.isOn) {
            this.fx.type = value
        }
    }
}
