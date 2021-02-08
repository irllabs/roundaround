
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Highpass extends FXBaseClass {
    static fxName = 'highpass';
    static icon = '<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.1023 2.54825C13.642 1.66049 12.3076 1.92344 12.2185 2.9195L11.3219 12.9454C11.0913 15.5239 8.93058 17.5 6.34176 17.5H1C0.447715 17.5 0 17.0523 0 16.5C0 15.9477 0.447715 15.5 1 15.5H6.34176C7.89505 15.5 9.19147 14.3143 9.32983 12.7672L10.2265 2.74135C10.4937 -0.246782 14.4968 -1.03571 15.8778 1.62762L16.2684 2.38095C16.7842 3.37563 17.8112 4 18.9317 4H19C19.5523 4 20 4.44771 20 5C20 5.55229 19.5523 6 19 6H18.9317C17.0643 6 15.3525 4.95938 14.4929 3.30159L14.1023 2.54825Z" fill="currentColor" fill-opacity="0.9"/></svg>'

    constructor (fxParameters) {
        super(fxParameters)
        this._frequency = 4000
        this._frequencyBeforeBypass = this._frequency
        this._type = 'highpass';
        this.label = 'Highpass'
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
            // set frequency to min rather than turn off so that we can do this rapidly without needing to rebuild the audio chain
            if (this._frequency > 0) {
                this._frequencyBeforeBypass = this._frequency
            }
            this.setFrequency(0, time)
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
            }
        ]
    }
}
