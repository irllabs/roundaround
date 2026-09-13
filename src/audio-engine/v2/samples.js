/**
 * The sample library: fetches and decodes the files of an instrument's articulation once, keeps
 * the decoded buffers, and picks the velocity layer for a hit the way the old sampler did (the
 * quieter "b" file below a MIDI velocity of 65, the "a" file from 65 up). Custom samples come
 * from their stored URL. Everything is behind injectable `fetch` and `decode`, so the tests need
 * no network and no audio.
 */
import _ from 'lodash'
import HiHatSamples from '../../samples/HiHats/index'
import KickSamples from '../../samples/Kicks/index'
import SnareSamples from '../../samples/Snares/index'
import PercSamples from '../../samples/Perc/index'
import CustomSamples from '../CustomSamples'

export const MANIFESTS = {
    HiHats: { folder: 'HiHats', articulations: HiHatSamples },
    Kicks: { folder: 'Kicks', articulations: KickSamples },
    Snares: { folder: 'Snares', articulations: SnareSamples },
    Perc: { folder: 'Perc', articulations: PercSamples }
}

export const CUSTOM = 'custom'

/** The files an articulation plays, with the velocity range each covers (MIDI 0 to 127). */
export function filesFor (sampler, articulation, manifests = MANIFESTS) {
    const manifest = manifests[sampler]
    if (_.isNil(manifest)) {
        throw new Error(`Unknown instrument "${sampler}"`)
    }
    const entry = manifest.articulations[articulation]
    if (_.isNil(entry)) {
        throw new Error(`Unknown articulation "${articulation}" for instrument ${sampler}`)
    }
    return entry.samples.map(sample => ({
        url: `/samples/${manifest.folder}/${sample.sample}`,
        lovel: _.isNil(sample.lovel) ? 0 : Number(sample.lovel),
        hivel: _.isNil(sample.hivel) ? 127 : Number(sample.hivel)
    }))
}

/** Which of `files` a hit at `velocity` (0 to 1) uses: the one whose range holds it, else the loudest. */
export function fileForVelocity (files, velocity) {
    const midi = Math.round(Math.max(0, Math.min(1, velocity)) * 127)
    const match = files.find(f => midi >= f.lovel && midi <= f.hivel)
    return match || files[files.length - 1]
}

/**
 * @param {object} o
 * @param {BaseAudioContext} o.context decodes the files
 * @param {typeof fetch} [o.fetchImpl]
 * @param {(context: BaseAudioContext, bytes: ArrayBuffer) => Promise<AudioBuffer>} [o.decode]
 * @param {(id: string) => Promise<object>} [o.customSample] looks a custom sample up by id
 */
export function createSampleLibrary ({ context, fetchImpl = (...a) => fetch(...a), decode = (ctx, bytes) => ctx.decodeAudioData(bytes), customSample = (id) => CustomSamples.get(id), manifests = MANIFESTS } = {}) {
    const buffers = new Map() // url -> Promise<AudioBuffer>
    const sets = new Map() // `${sampler}/${articulation}` -> Promise<SampleSet>

    const bufferFor = (url) => {
        if (!buffers.has(url)) {
            buffers.set(url, (async () => {
                const response = await fetchImpl(url)
                if (!response.ok) {
                    throw new Error(`Could not fetch sample ${url} (${response.status})`)
                }
                return decode(context, await response.arrayBuffer())
            })().catch(error => {
                buffers.delete(url)
                throw error
            }))
        }
        return buffers.get(url)
    }

    const library = {
        /**
         * The decoded set for an instrument's articulation: `{ files: [{ url, lovel, hivel, buffer }], bufferFor(velocity) }`.
         * Loaded once; the same promise is shared by every layer that asks.
         */
        load (sampler, articulation) {
            const key = `${sampler}/${articulation}`
            if (!sets.has(key)) {
                sets.set(key, (async () => {
                    let files
                    if (sampler === CUSTOM) {
                        const sample = await customSample(articulation)
                        if (_.isNil(sample)) {
                            throw new Error(`Custom sample ${articulation} was not found`)
                        }
                        files = [{ url: sample.localURL || sample.remoteURL, lovel: 0, hivel: 127 }]
                    } else {
                        files = filesFor(sampler, articulation, manifests)
                    }
                    const loaded = await Promise.all(files.map(async f => ({ ...f, buffer: await bufferFor(f.url) })))
                    return Object.freeze({
                        files: loaded,
                        bufferFor (velocity) {
                            return fileForVelocity(loaded, velocity).buffer
                        }
                    })
                })().catch(error => {
                    sets.delete(key)
                    throw error
                }))
            }
            return sets.get(key)
        },
        /** Starts loading in the background; a failure is logged, not thrown. */
        prefetch (sampler, articulation) {
            return library.load(sampler, articulation).catch(error => console.warn('Could not prefetch samples', sampler, articulation, error))
        },
        has (sampler, articulation) {
            return sets.has(`${sampler}/${articulation}`)
        },
        size () {
            return buffers.size
        }
    }
    return library
}
