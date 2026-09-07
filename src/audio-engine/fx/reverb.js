
import FXBaseClass from './fx-base-class';
import * as Tone from 'tone';

export default class Reverb extends FXBaseClass {
    static fxName = 'reverb';
    static defaultMix = 0.2

    constructor (fxParameters) {
        super(fxParameters)
        this._size = 0.7
        this.label = 'Reverb'
        this.isOn = fxParameters.isOn
    }

    createNode () {
        return new Tone.Freeverb(this._size)
    }

    setSize (value, time) {
        this._size = value
        if (this.isOn) {
            this.setSignalValue(this.fx.roomSize, value, time)
        }
    }
}
