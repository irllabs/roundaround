'use strict';
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';
import { numberRange } from '../../utils/index'

export default class Lowpass extends FXBaseClass {
    static name = 'lowpass';
    constructor (fxParameters) {
        super(fxParameters)
        this._frequency = 500
        this._frequencyBeforeBypass = this._frequency
        this._type = 'lowpass';
        this.label = 'Lowpass'
        this.isOn = fxParameters.isOn
    }

    set type (value) {
        this._type = value
        if (this.isOn) {
            this.fx.type = value
        }
    }
    setFrequency (value, time) {
        this._frequency = value
        if (this.isOn) {
            if (!_.isNil(time)) {
                this.fx.frequency.setValueAtTime(value, time)
            } else {
                this.fx.frequency.value = value
            }
        }
    }
    setBypass (value, time) {
        if (value === true && !this._override) {
            // set frequency to max rather than turn off so that we can do this rapidly without needing to rebuild the audio chain
            if (this._frequency < 20000) {
                this._frequencyBeforeBypass = this._frequency
            }
            this.setFrequency(20000, time)
        } else {
            this.setFrequency(this._frequencyBeforeBypass, time)
        }
    }

    enable () {
        this.fx = new Tone.Filter(this._frequency, this._type)
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
            },
            /*{
                label: 'Frequency',
                name: 'frequency',
                setParameter: this.setFrequency.bind(this),
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return numberRange(value, 0, 1, 0, 5000)
                }
            }*/
        ]
    }
}
