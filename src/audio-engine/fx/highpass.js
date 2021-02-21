
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Highpass extends FXBaseClass {
    static fxName = 'highpass';
    static icon = '<svg width="20" height="15" viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5209 2.64432C10.776 0.835899 12.5741 -0.326981 14.328 0.182215L16.7325 0.880297C17.0043 0.959207 17.2859 0.999258 17.5689 0.999258L20 0.999257V2.99926L17.5689 2.99926C17.0972 2.99926 16.6279 2.93251 16.1749 2.80099L13.7703 2.10291C13.1857 1.93318 12.5863 2.3208 12.5013 2.92361L11.4755 10.1975C11.1276 12.6647 9.01618 14.4993 6.52452 14.4993H1C0.447715 14.4993 0 14.0515 0 13.4993C0 12.947 0.447715 12.4993 1 12.4993H6.52452C8.01952 12.4993 9.28636 11.3985 9.49513 9.91819L10.5209 2.64432Z" fill="white" fill-opacity="0.9"/></svg>'

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
