
import FXBaseClass, { BYPASS_STRATEGY_FREQUENCY } from './fx-base-class';
import * as Tone from 'tone';

export default class Highpass extends FXBaseClass {
    static fxName = 'highpass';
    static icon =
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.000488281" width="32.0004" height="32" rx="16" fill="white" fill-opacity="0.1"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M16.3479 13.763C16.5179 12.5574 17.7166 11.7822 18.8859 12.1216L20.489 12.587C20.6702 12.6396 20.8579 12.6663 21.0466 12.6663L22.6674 12.6663V13.9997L21.0466 13.9997C20.7321 13.9997 20.4192 13.9552 20.1172 13.8675L18.5142 13.4021C18.1244 13.2889 17.7248 13.5474 17.6682 13.9492L16.9843 18.7985C16.7523 20.4433 15.3447 21.6663 13.6835 21.6663H10.0004C9.63222 21.6663 9.33374 21.3679 9.33374 20.9997C9.33374 20.6315 9.63222 20.333 10.0004 20.333H13.6835C14.6802 20.333 15.5248 19.5992 15.664 18.6123L16.3479 13.763Z" fill="white" fill-opacity="0.9"/>
        </svg>`

    static bypassStrategy = BYPASS_STRATEGY_FREQUENCY
    static defaultFrequency = 4000
    // a highpass at the bottom of the audible range passes everything
    static passThroughFrequency = 0

    constructor(fxParameters) {
        super(fxParameters)
        this._type = 'highpass';
        this.label = 'Highpass'
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
