'use strict';
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Delay extends FXBaseClass {
    static name = 'delay';
    constructor (fxParameters) {
        super(fxParameters)
        this._mix = 0.2
        this._mixBeforeBypass = this._mix
        this.label = 'Tape delay'
        this._delayTime = '8t';
        this._feedback = 0.7
        this.isOn = fxParameters.isOn
    }

    setDelayTime (value) {
        this._delayTime = value
        if (this.isOn) {
            this.fx.delayTime.value = value
        }
    }
    setFeedback (value) {
        this._feedback = value
        if (this.isOn) {
            this.fx.feedback.value = value
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
        this.fx = new Tone.FeedbackDelay(this._delayTime, this._feedback)
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
