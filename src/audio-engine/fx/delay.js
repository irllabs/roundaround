
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Delay extends FXBaseClass {
    static fxName = 'delay';
    static icon =
        `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.000488281" width="32.0004" height="32" rx="16" fill="white" fill-opacity="0.1"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M20.5491 10.272L19.9343 17.0345L19.5348 15.9694L19.0229 16.6414L18.263 12.9844L17.524 14.4624L16.4326 10.3813L15.334 14.6662L14.8704 17.1828L14.1518 13.9179L13.3857 16.0724L12.7224 13.8752L11.7885 16.4737L10.4221 13.5948L9.35184 18.6782V21.3329L10.6493 18.9875L10.9125 17.7376L11.9588 19.9421L12.6122 18.1239L13.2823 20.3433L13.8789 18.6653L14.9112 21.2285L15.6674 18.6963L16.3129 15.0948L17.1442 18.2034L17.7386 17.0146L18.312 19.7744L19.1334 18.6963L19.9343 20.0599C20.0435 20.3511 20.5972 20.925 20.5491 20.9995C20.5491 20.9995 20.6393 20.3092 20.6675 19.9995L21.4526 15.0604L22.6675 15.9694L20.5491 10.272Z" fill="white" fill-opacity="0.9"/>
        </svg>`

    constructor(fxParameters) {
        super(fxParameters)
        this._mix = 0.2
        this._mixBeforeBypass = this._mix
        this.label = 'Tape delay'
        this._delayTime = '3t';
        this._feedback = 0.7
        this.isOn = fxParameters.isOn
    }

    setDelayTime(value) {
        this._delayTime = value
        if (this.isOn) {
            this.fx.delayTime.value = value
        }
    }
    setFeedback(value) {
        this._feedback = value
        if (this.isOn) {
            this.fx.feedback.value = value
        }
    }
    setMix(value, time) {
        this._mix = value
        if (this.isOn) {
            if (!_.isNil(time)) {
                this.fx.wet.setValueAtTime(value, time)
            } else {
                this.fx.wet.value = value
            }
        }
    }
    setBypass(value, time) {
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

    enable() {
        this.fx = new Tone.FeedbackDelay(this._delayTime, this._feedback)
        this.fx.wet.value = this._mix
        this.setBypass(true)
    }

    getAutomationOptions() {
        return [
            {
                label: 'Enabled',
                name: 'enabled',
                setParameter: this.setBypass.bind(this),
                calculateValue: function (value) {
                    return value === true ? false : true
                }
            },
            /*{
                label: 'Time',
                value: 'delayTime',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return numberRange(value, 0, 1, 0, 2000)
                }
            },
            {
                label: 'Feedback',
                value: 'feedback',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return value
                }
            },
            {
                label: 'Mix',
                value: 'mix',
                calculateValue: function (value) {
                    // function to take a 0 - 1 value from interface and return appropriate value for this FX parameter
                    return value
                }
            }*/
        ]
    }
}
