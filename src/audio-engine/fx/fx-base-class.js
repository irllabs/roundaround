'use strict';
export default class FXBaseClass {
    constructor (fxParameters) {
        this.id = fxParameters.id
        if (_.isNil(this.id)) {
            this.id = Math.floor(Math.random() * 999999)
        }
        this.name = fxParameters.name
        this.order = fxParameters.order
        this.fx = null
        this._override = false // if true will switch fx on and ignore other calls to switch it off (from automation)
    }
    dispose () {
        console.log('FX dispose()');
        if (!_.isNil(this.fx) && !_.isNil(this.fx._context)) {
            this.fx.dispose()
        }
    }

    setBypass (value) {
        // overriden
    }

    set isOn (value) {
        this._isOn = value
        if (this._isOn) {
            this.enable()
        } else {
            this.disable()
        }
    }

    get isOn () {
        return this._isOn
    }

    set override (value) {
        this._override = value
        if (value === true) {
            this.setBypass(false)
        } else {
            this.setBypass(true)
        }
    }

    enable () {
        // overwritten
    }
    disable () {
        this.dispose()
    }

    getAutomationOptions () {
        // overridden
        return []
    }
}
