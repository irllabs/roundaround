'use strict';
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';
import { numberRange } from '../../utils/index'

export default class Bitcrusher extends FXBaseClass {
    static name = 'bitcrusher';
    constructor (fxParameters) {
        super(fxParameters)
        this._bits = 4
        this._mix = 1
        this._mixBeforeBypass = this._mix
        this.label = 'Bitcrusher'
        this.isOn = fxParameters.isOn
    }

    setBits (value, time) {
        this._bits = value
        if (this.isOn) {
            this.fx.bits = value
        }
    }
    setMix (value, time) {
        this._mix = value
        if (this.isOn) {
            if (!_.isNil(time)) {
                this.fx.wet.setValueAtTime(value, time)
            } else {
                this.fx.wet.value = value
            }
        }
    }
    setBypass (value, time) {
        if (value === true && !this._override) {
            // set mix to 0 rather than turn off so that we can do this rapidly without needing to rebuild the audio chain
            if (this._mix > 0) {
                this._mixBeforeBypass = this._mix
            }
            this.setMix(0, time)
        } else {
            this.setMix(this._mixBeforeBypass, time)
        }
    }


    enable () {
        this.fx = new Tone.BitCrusher(this._bits)
        this.fx.wet.value = this._mix
        this.setBypass(true)
    }

    getAutomationOptions () {
        return [
            {
                label: 'Enabled',
                name: 'enabled',
                setParameter: this.setBypass.bind(this),
                calculateValue: function (value) {
                    return value === false ? true : false
                }
            }
        ]
    }
}
