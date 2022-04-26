
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Lowpass extends FXBaseClass {
    static fxName = 'lowpass';
    static icon =
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.000488281" width="32.0004" height="32" rx="16" fill="white" fill-opacity="0.1"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M15.6534 13.0545C15.4833 11.8489 14.2846 11.0737 13.1153 11.4131L11.5122 11.8785C11.331 11.9311 11.1433 11.9578 10.9546 11.9578L9.33385 11.9578V13.2912L10.9546 13.2912C11.2691 13.2912 11.582 13.2467 11.884 13.159L13.487 12.6936C13.8768 12.5805 14.2764 12.8389 14.3331 13.2407L15.017 18.09C15.2489 19.7348 16.6566 20.9578 18.3177 20.9578H22.0008C22.369 20.9578 22.6675 20.6594 22.6675 20.2912C22.6675 19.923 22.369 19.6245 22.0008 19.6245H18.3177C17.321 19.6245 16.4764 18.8907 16.3373 17.9038L15.6534 13.0545Z" fill="white" fill-opacity="0.9"/>
        </svg>`

    constructor(fxParameters) {
        super(fxParameters)
        this._frequency = 500
        this._frequencyBeforeBypass = this._frequency
        this._type = 'lowpass';
        this.label = 'Lowpass'
        this.isOn = fxParameters.isOn
    }

    set type(value) {
        this._type = value
        if (this.isOn) {
            this.fx.type = value
        }
    }
    setFrequency(value, time) {
        this._frequency = value
        if (this.isOn) {
            if (!_.isNil(time)) {
                this.fx.frequency.setValueAtTime(value, time)
            } else {
                this.fx.frequency.value = value
            }
        }
    }
    setBypass(value, time) {
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

    enable() {
        this.fx = new Tone.Filter(this._frequency, this._type)
        this.setBypass(true)
    }

    getAutomationOptions() {
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
