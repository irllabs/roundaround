import Delay from '../audio-engine/fx/delay';
import Lowpass from '../audio-engine/fx/lowpass';
import Highpass from '../audio-engine/fx/highpass';
import Distortion from '../audio-engine/fx/distortion';
import Bitcrusher from '../audio-engine/fx/bitcrusher';
import Autowah from '../audio-engine/fx/autowah';
import Reverb from '../audio-engine/fx/reverb';
import _ from 'lodash'

const FX = {
    fxClasses: {},
    fx: [],
    fxById: {},
    init () {
        let classes = [Delay, Distortion, Bitcrusher, Autowah, Reverb, Lowpass, Highpass]
        for (let fxClass of classes) {
            this.fxClasses[fxClass.fxName] = fxClass
        }
    },
    create (fxParameters) {
        let _this = this
        return new Promise(async function (resolve, reject) {
            let fxClass = _this.fxClasses[fxParameters.name]
            let fx = new fxClass(fxParameters)
            _this.fx.push(fx)
            _this.fxById[fx.id] = fx
            resolve(fx)
        })
    },
    reset () {
        // todo
    },
    dispose () {
        // todo
    },
    getUI (name) {
        return this.fxClasses[name].ui
    },
    getIcon (name) {
        let fxClass = this.fxClasses[name]
        if (!_.isNil(fxClass)) {
            return this.fxClasses[name].icon
        }
        return null
    }
}
export default FX
