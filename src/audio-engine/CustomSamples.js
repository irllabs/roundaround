
import _ from "lodash";

const CustomSamples = {
    samples: {},
    init (firebase) {
        this.firebase = firebase
    },
    add (sample) {
        if (!_.isNil(sample)) {
            this.samples[sample.id] = sample
        }
    },
    async get (id) {
        const _this = this
        return new Promise(async (resolve, reject) => {
            if (!_.isNil(this.samples[id])) {
                resolve(this.samples[id])
            }
            if (!_.isNil(id)) {
                try {
                    let sample = await this.firebase.getSample(id)
                    _this.samples[id] = _.cloneDeep(sample)
                    resolve(sample)
                } catch (e) {
                    resolve(null)
                }
            }
            resolve(null)
        })
    },
    delete (sampleId, userId) {
        return new Promise(async (resolve, reject) => {
            await this.firebase.deleteSample(sampleId)
            const fileRef = this.firebase.storage.ref().child(userId + '/' + sampleId + '.wav')
            await fileRef.delete()
            delete this.samples[sampleId]
            resolve()
        })
    },
    rename (sampleId, newName) {
        this.samples[sampleId].name = newName
        this.firebase.updateSample({ id: sampleId, name: newName })
    }

};

export default CustomSamples;
