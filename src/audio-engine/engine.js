/**
 * The playback engine the app uses: the old Tone-based one by default, the v2 snapshot
 * scheduler with `?engine=v2` (see v2/selection.js). Both expose the same surface; v2 keeps the
 * old engine underneath for the user busses, the effects and the master chain.
 */
import AudioEngine from './AudioEngine'
import { createPlaybackEngineV2 } from './v2/PlaybackEngineV2'
import { selectedEngine } from './v2/selection'

const engine = selectedEngine() === 'v2' ? createPlaybackEngineV2({ base: AudioEngine }) : AudioEngine

export default engine
