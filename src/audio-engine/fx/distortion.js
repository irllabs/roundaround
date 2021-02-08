
import FXBaseClass from './fx-base-class';
import _ from 'lodash';
import * as Tone from 'tone';

export default class Distortion extends FXBaseClass {
    static fxName = 'distortion';
    static icon = '<svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.0825 1.12928C12.747 0.0107834 11.1297 0.11685 10.9431 1.26955L9.45993 10.4301L8.69712 6.67566C8.498 5.69564 7.20035 5.46825 6.67987 6.32217L1.09822 15.4796C0.81078 15.9511 0.960058 16.5665 1.43165 16.8539C1.90323 17.1413 2.51855 16.9921 2.80599 16.5205L7.19385 9.32165L8.48206 15.662C8.72563 16.8609 10.4504 16.8263 10.6459 15.6188L12.2917 5.45343L15.4552 15.9984C15.7595 17.0127 17.1807 17.0535 17.5426 16.0583L21.4395 5.34176C21.6283 4.82273 21.3605 4.24896 20.8415 4.06022C20.3224 3.87148 19.7487 4.13924 19.5599 4.65827L16.5908 12.8234L13.0825 1.12928Z" fill="white"/></svg>'

    constructor (fxParameters) {
        super(fxParameters)
        this._amount = 4
        this._mix = 0.2
        this._mixBeforeBypass = this._mix
        this.label = 'Distortion'
        this.isOn = fxParameters.isOn
    }

    setAmount (value, time) {
        this._amount = value
        if (this.isOn) {
            this.fx.distortion = value
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
        this.fx = new Tone.Distortion(this._amount)
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
