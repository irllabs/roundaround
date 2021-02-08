
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Lowpass extends FXBaseClass {
    static fxName = 'lowpass';
    static icon = '<svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.09945 2.6557C6.69992 1.91666 7.89574 2.3557 7.87533 3.30772L7.73081 10.0517C7.63146 14.688 11.3626 18.5 16 18.5H19C19.5523 18.5 20 18.0522 20 17.5C20 16.9477 19.5523 16.5 19 16.5H16C12.484 16.5 9.65503 13.6097 9.73036 10.0945L9.87488 3.35057C9.93608 0.494536 6.34864 -0.822611 4.54722 1.39452L2.32419 4.13055C2.1343 4.36426 1.84921 4.49996 1.54808 4.49996H1C0.447716 4.49996 0 4.94767 0 5.49996C0 6.05224 0.447716 6.49996 1 6.49996H1.54808C2.45147 6.49996 3.30676 6.09287 3.87642 5.39174L6.09945 2.6557Z" fill="currentColor" fill-opacity="0.9"/></svg>'

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
