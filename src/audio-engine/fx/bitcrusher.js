
import FXBaseClass from './fx-base-class';
import * as Tone from 'tone';

export default class Bitcrusher extends FXBaseClass {
    static fxName = 'bitcrusher';
    static defaultMix = 1

    constructor (fxParameters) {
        super(fxParameters)
        this._bits = 4
        this.label = 'Bitcrusher'
        this.isOn = fxParameters.isOn
    }

    createNode () {
        return new Tone.BitCrusher(this._bits)
    }

    setBits (value, time) {
        this._bits = value
        if (this.isOn) {
            this.setSignalValue(this.fx.bits, value, time)
        }
    }
}
