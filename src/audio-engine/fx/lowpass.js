
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Lowpass extends FXBaseClass {
    static fxName = 'lowpass';
    static icon = '<svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.47907 2.58182C9.22404 0.773399 7.42594 -0.389481 5.67204 0.119715L3.26753 0.817797C2.99573 0.896707 2.71413 0.936758 2.4311 0.936758L7.62939e-06 0.936757V2.93676L2.4311 2.93676C2.90281 2.93676 3.37215 2.87001 3.82515 2.73849L6.22966 2.04041C6.81429 1.87068 7.41366 2.2583 7.49867 2.86111L8.52447 10.135C8.87241 12.6022 10.9838 14.4368 13.4755 14.4368H19C19.5523 14.4368 20 13.989 20 13.4368C20 12.8845 19.5523 12.4368 19 12.4368H13.4755C11.9805 12.4368 10.7136 11.336 10.5049 9.85569L9.47907 2.58182Z" fill="white" fill-opacity="0.9"/></svg>'

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
