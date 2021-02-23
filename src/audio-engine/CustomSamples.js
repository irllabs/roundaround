
import _ from "lodash";

const CustomSamples = {
    samples: {},
    init (firebase) {
        this.firebase = firebase
    },
    add (sample) {
        this.samples[sample.id] = sample
    },
    async get (id) {
        const _this = this
        return new Promise(async (resolve, reject) => {
            if (!_.isNil(this.samples[id])) {
                resolve(this.samples[id])
            }
            let sample = await this.firebase.getSample(id)
            _this.samples[id] = sample
            resolve(sample)
        })
    },

};

export default CustomSamples;
