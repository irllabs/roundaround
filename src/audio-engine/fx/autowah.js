'use strict';
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';
import { numberRange } from '../../utils/index'

export default class Autowah extends FXBaseClass {
    static name = 'autowah';
    constructor (fxParameters) {
        super(fxParameters)
        this._q = 4
        this._mix = 1
        this._mixBeforeBypass = this._mix
        this.label = 'Autowah'
        this.isOn = fxParameters.isOn
    }

    setQ (value, time) {
        this._q = value
        if (this.isOn) {
            this.fx.Q = value
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
        this.fx = new Tone.AutoWah(50, 6, -30)
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
