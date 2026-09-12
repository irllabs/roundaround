import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import _ from 'lodash'
import { PlayUI } from './PlayUI'
import AudioEngine from '../../audio-engine/AudioEngine'
import roundReducer from '../../redux/reducers/round'
import { SET_SELECTED_LAYER_ID, TOGGLE_STEP, UPDATE_LAYERS } from '../../redux/actionTypes'

// PlayUI draws with SVG.js and cannot be mounted here (the pan/zoom plugin wants a global SVG), so
// these tests build the component with `new` and exercise the saving it does around a toggle,
// which needs no drawing.
vi.mock('@svgdotjs/svg.js', () => ({ SVG: () => ({}) }))
vi.mock('@svgdotjs/svg.panzoom.js', () => ({}))
vi.mock('tone', () => ({}))
vi.mock('../../audio-engine/AudioEngine', () => ({ default: { recalculateParts: vi.fn(), play: vi.fn(), stop: vi.fn() } }))
vi.mock('../../audio-engine/Instruments', () => ({ default: {} }))

const user = { id: 'me', color: '#fff' }

const step = (id, isOn = false) => ({ id, order: 0, isOn, velocity: 1, probability: 1, note: 'C4' })

const layer = (steps) => ({
    id: 'l1', createdBy: 'me', createdAt: 1, gain: 0, isMuted: false, timeOffset: 0, percentOffset: 0, instrument: {}, steps
})

/** What a pattern stores for `layer`: the fields getCurrentState() keeps, as its own copy. */
const patternState = (layer) => _.cloneDeep({ layers: [_.pick(layer, ['id', 'createdBy', 'createdAt', 'steps', 'gain', 'isMuted', 'timeOffset', 'percentOffset'])] })

/**
 * The user's round: one layer with two steps, both off, and patterns P1 (saved with those steps)
 * and P2 (never saved).
 */
function makeRound() {
    const layers = [layer([step('s0'), step('s1')])]
    return {
        id: 'r1', bpm: 120, layers,
        userPatterns: {
            me: {
                id: 'me', isPlayingSequence: false, sequence: [false, false],
                patterns: [{ id: 'p1', order: 0, state: patternState(layers[0]) }, { id: 'p2', order: 1, state: {} }]
            }
        }
    }
}

/** The component as React would build it, with props that follow a dispatch the way the store does. */
function makeUI(round) {
    const dispatch = vi.fn(action => { ui.props = { ...ui.props, round: roundReducer(ui.props.round, action) } })
    const ui = new PlayUI({ round, user, dispatch, saveUserPattern: vi.fn() })
    ui.context = { updateLayer: vi.fn().mockResolvedValue(), saveUserPatterns: vi.fn().mockResolvedValue() }
    ui.round = _.cloneDeep(round)
    ui.activePatternId = 'p1'
    return ui
}

/** The state pattern `id` was last written with. */
const writtenState = (ui, id) => _.find(_.last(ui.context.saveUserPatterns.mock.calls)[2].patterns, { id }).state

describe('PlayUI saving a step toggle', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('writes the layer\'s steps at once, and the pattern once, a second after the last toggle', () => {
        const ui = makeUI(makeRound())

        ui.onStepClick({ id: 's0', layerId: 'l1' })
        ui.onStepClick({ id: 's1', layerId: 'l1' })

        expect(ui.props.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: TOGGLE_STEP, payload: expect.objectContaining({ stepId: 's0', isOn: true }) }))
        expect(ui.context.updateLayer).toHaveBeenCalledTimes(2)
        expect(ui.context.updateLayer).toHaveBeenLastCalledWith('r1', 'l1', { steps: [step('s0', true), step('s1', true)] })
        expect(AudioEngine.recalculateParts).toHaveBeenCalledWith(ui.round, 'l1')
        expect(ui.context.saveUserPatterns).not.toHaveBeenCalled()

        vi.advanceTimersByTime(999)
        expect(ui.context.saveUserPatterns).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1)
        expect(ui.context.saveUserPatterns).toHaveBeenCalledTimes(1)
        expect(writtenState(ui, 'p1').layers[0].steps.map(step => step.isOn)).toEqual([true, true])
    })

    it('does not write the pattern when it already holds what the layers hold', () => {
        const ui = makeUI(makeRound())

        ui.savePatternDebounced()
        vi.runAllTimers()

        expect(ui.context.saveUserPatterns).not.toHaveBeenCalled()
        expect(ui.props.saveUserPattern).not.toHaveBeenCalled()
    })

    it('saves a pending toggle into the pattern it was made in before another pattern takes over', () => {
        const round = makeRound()
        round.layers[0].steps[0].isOn = true // toggled since P1 was saved
        const ui = makeUI(round)
        ui.savePatternDebounced()

        ui.setActivePattern('p2')

        expect(ui.props.saveUserPattern).toHaveBeenCalledWith('me', 'p1', expect.objectContaining({ layers: [expect.objectContaining({ id: 'l1' })] }))
        expect(writtenState(ui, 'p1').layers[0].steps[0].isOn).toBe(true)
        expect(ui.activePatternId).toBe('p2')

        // the flushed save is not made a second time when the timer would have fired
        vi.runAllTimers()
        expect(ui.context.saveUserPatterns).toHaveBeenCalledTimes(1)
    })

    it('saves a pending toggle into its own pattern before a sequence loads the next one', async () => {
        const round = makeRound()
        // P2 holds the layer as it was saved: both steps off
        round.userPatterns.me.patterns[1].state = patternState(round.layers[0])
        round.layers[0].steps[0].isOn = true // toggled since P1 was saved
        const ui = makeUI(round)
        ui.savePatternDebounced()

        // the next bar of the sequence: P2's steps take over the layers
        await ui.loadPatternPriority('me', 'p2', 1)

        expect(ui.props.saveUserPattern).toHaveBeenCalledWith('me', 'p1', expect.objectContaining({ layers: [expect.objectContaining({ id: 'l1' })] }))
        expect(writtenState(ui, 'p1').layers[0].steps[0].isOn).toBe(true)
        expect(ui.round.layers[0].steps[0].isOn).toBe(false) // and P2 is what plays now
        expect(ui.context.saveUserPatterns).toHaveBeenCalledTimes(1)

        // the flushed save is not made a second time when the timer would have fired
        vi.runAllTimers()
        expect(ui.context.saveUserPatterns).toHaveBeenCalledTimes(1)
    })

    it('saves a pending toggle when the component goes away', () => {
        const round = makeRound()
        round.layers[0].steps[1].isOn = true
        const ui = makeUI(round)
        ui.savePatternDebounced()

        ui.componentWillUnmount()

        expect(ui.context.saveUserPatterns).toHaveBeenCalledTimes(1)
        expect(writtenState(ui, 'p1').layers[0].steps[1].isOn).toBe(true)
    })
})

describe('PlayUI loading a pattern from its button', () => {
    /**
     * The pattern buttons are SVG.js listeners, outside React's event system, so React 18 leaves
     * props as they were until it re-renders. This dispatch does the same: it records the action
     * without touching `ui.props`, which is what the handler has to cope with.
     */
    function makeBatchedUI(round) {
        const dispatched = []
        const ui = new PlayUI({
            round,
            user,
            display: { isRecordingSequence: false },
            dispatch: action => dispatched.push(action),
            saveUserPattern: vi.fn(),
            updateLayers: vi.fn(layers => dispatched.push({ type: UPDATE_LAYERS, payload: { layers } }))
        })
        ui.context = { updateLayer: vi.fn().mockResolvedValue(), saveUserPatterns: vi.fn().mockResolvedValue() }
        ui.round = _.cloneDeep(round)
        ui.activePatternId = 'p1'
        ui.setState = () => {} // never mounted, so there is no updater to enqueue into
        ui.draw = vi.fn()
        return { ui, dispatched }
    }

    /** A round whose P2 holds the layer with its first step on; the round's own layers are off. */
    function roundWithPatternToLoad() {
        const round = makeRound()
        const loaded = _.cloneDeep(round.layers[0])
        loaded.steps[0].isOn = true
        round.userPatterns.me.patterns[1].state = patternState(loaded)
        return round
    }

    beforeEach(() => AudioEngine.recalculateParts.mockClear())

    it('recalculates the parts from the layers it dispatched, not the ones still in props', async () => {
        const round = roundWithPatternToLoad()
        const { ui } = makeBatchedUI(round)

        await ui.onPatternClick('p2', round.userPatterns.me.patterns[1].state.layers)

        // props are still the round from before the dispatch, as they are under React 18
        expect(ui.props.round.layers[0].steps.map(step => step.isOn)).toEqual([false, false])
        expect(AudioEngine.recalculateParts).toHaveBeenCalledTimes(1)
        const [recalculated] = AudioEngine.recalculateParts.mock.calls[0]
        expect(recalculated.layers[0].steps.map(step => step.isOn)).toEqual([true, false])
    })

    it('dispatches the pattern\'s layers, keeping the round\'s other fields', async () => {
        const round = roundWithPatternToLoad()
        const { ui } = makeBatchedUI(round)

        await ui.onPatternClick('p2', round.userPatterns.me.patterns[1].state.layers)

        expect(ui.props.updateLayers).toHaveBeenCalledTimes(1)
        const [dispatchedLayers] = ui.props.updateLayers.mock.calls[0]
        expect(dispatchedLayers[0].steps.map(step => step.isOn)).toEqual([true, false])
        const [recalculated] = AudioEngine.recalculateParts.mock.calls[0]
        expect(recalculated.id).toBe('r1')
        expect(recalculated.bpm).toBe(120)
    })
})

describe('PlayUI keeping a layer selected', () => {
    /**
     * `selectedLayerId` is this component's own copy of the store's selection and the only thing
     * `interfaceClicked` -- the listener on `window` -- reads. The ring's mousedown writes it
     * through `onLayerClicked`; a layer picked in the mixer does not, because
     * `LayerSettings.onLayerClicked` only dispatches.
     */
    function makeSelectionUI() {
        const dispatched = []
        const round = makeRound()
        const ui = new PlayUI({
            round, user, users: [user], display: { isRecordingSequence: false }, childRef: vi.fn(),
            selectedLayer: null, selectedLayerId: null, setIsRecordingSequence: vi.fn(),
            dispatch: action => dispatched.push(action), saveUserPattern: vi.fn()
        })
        ui.round = _.cloneDeep(round)
        ui.activePatternId = 'p1'
        ui.userColors = { me: user.color }
        return { ui, dispatched, round }
    }

    /** The store delivering a new selection: the props PlayUI is re-rendered with. */
    function selectionArrives(ui, round) {
        const prevProps = ui.props
        ui.props = { ...ui.props, selectedLayerId: 'l1', selectedLayer: round.layers[0] }
        return prevProps
    }

    it('keeps a layer picked in the mixer through the next click on the page', () => {
        const { ui, dispatched, round } = makeSelectionUI()

        const prevProps = selectionArrives(ui, round)
        ui.componentDidUpdate(prevProps)

        // the click on the layer popup's own ms button, which nothing stops on its way to window
        ui.interfaceClicked({})

        expect(ui.selectedLayerId).toBe('l1')
        expect(dispatched).toEqual([])
    })

    it('keeps a layer the store was already holding when it mounts', async () => {
        const { ui, dispatched, round } = makeSelectionUI()
        // the round is re-entered with the selection still in the store, as it is after a trip to
        // /rounds: props carry the layer from the first render on, so no update ever announces it
        ui.props = { ...ui.props, selectedLayerId: 'l1', selectedLayer: round.layers[0] }
        // the drawing, the audio and the orientation check are not what this is about, and none of
        // them runs here: PlayUI's SVG.js container cannot be built in jsdom
        ui.createRound = vi.fn()
        ui.loadSequence = vi.fn()
        ui.setDefaultPattern = vi.fn()
        ui.checkOrientation = vi.fn()

        await ui.componentDidMount()
        try {
            // a real click, through the listener componentDidMount registered
            window.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        } finally {
            await ui.componentWillUnmount()
        }

        expect(ui.selectedLayerId).toBe('l1')
        expect(dispatched).toEqual([])
    })

    it('still lets a click on the round itself deselect', () => {
        const { ui, dispatched, round } = makeSelectionUI()
        ui.componentDidUpdate(selectionArrives(ui, round))

        // the listener on #round runs first and gives up the selection, then the click reaches window
        ui.onOutsideClick()
        ui.interfaceClicked({})

        expect(ui.selectedLayerId).toBeNull()
        expect(dispatched).toContainEqual({ type: SET_SELECTED_LAYER_ID, payload: { layerId: null } })
    })

    it('does not take the selection back when that click re-renders it on the way out', () => {
        const { ui, round } = makeSelectionUI()
        ui.componentDidUpdate(selectionArrives(ui, round))

        // onOutsideClick's own dispatch re-renders this component before the click reaches window;
        // the store's selection has not changed, so the copy it just gave up must stay given up.
        ui.onOutsideClick()
        const prevProps = ui.props
        ui.props = { ...ui.props, display: { ...ui.props.display, isShowingLayerSettings: false } }
        ui.componentDidUpdate(prevProps)

        expect(ui.selectedLayerId).toBeNull()
    })
})

describe('PlayUI showing whether the round is playing', () => {
    /**
     * The play button in the middle of the round shows `isPlaying`, which its click sends to the
     * store through `setIsPlaying`. React batches the store's answer until the click handler has
     * returned, so the props the handler holds are still the old ones: the button is drawn from the
     * prop when it arrives (componentDidUpdate), never from inside the handler.
     */
    function makePlaybackUI(isPlaying) {
        const round = makeRound()
        const ui = new PlayUI({
            round, user, users: [user], display: { isRecordingSequence: false }, isPlaying,
            selectedLayer: null, selectedLayerId: null, setIsRecordingSequence: vi.fn(), setIsPlaying: vi.fn(),
            dispatch: vi.fn(), saveUserPattern: vi.fn()
        })
        ui.round = _.cloneDeep(round)
        ui.activePatternId = 'p1'
        ui.userColors = { me: user.color }
        // the SVG.js elements draw() would have made for the button and its icon
        ui.playbackToggle = { attr: vi.fn() }
        ui.playbackToggleIcon = { clear: vi.fn(), svg: vi.fn() }
        ui.draw = vi.fn()
        return ui
    }

    /** The store answering setIsPlaying: the props PlayUI is re-rendered with. */
    function playingArrives(ui, isPlaying) {
        const prevProps = ui.props
        ui.props = { ...ui.props, isPlaying }
        return prevProps
    }

    /** What the icon was last drawn as, and what the button was last labelled. */
    const drawn = (ui) => ({
        icon: _.last(ui.playbackToggleIcon.svg.mock.calls)?.[0].match(/data-icon="(\w+)"/)?.[1],
        label: _.last(ui.playbackToggle.attr.mock.calls)?.[0]['aria-label']
    })

    beforeEach(() => vi.clearAllMocks())

    it('starts the engine on a click and shows pause once the store says the round is playing', () => {
        const ui = makePlaybackUI(false)

        ui.onPlaybackToggle()

        expect(AudioEngine.play).toHaveBeenCalledTimes(1)
        expect(ui.props.setIsPlaying).toHaveBeenCalledWith(true)
        // nothing is drawn from the props the handler still holds, which would show play
        expect(ui.draw).not.toHaveBeenCalled()
        expect(ui.playbackToggleIcon.svg).not.toHaveBeenCalled()

        ui.componentDidUpdate(playingArrives(ui, true))

        expect(drawn(ui)).toEqual({ icon: 'pause', label: 'Stop' })
        expect(ui.draw).not.toHaveBeenCalled()
    })

    it('stops the engine on the next click and shows play once the store says the round stopped', () => {
        const ui = makePlaybackUI(true)

        ui.onPlaybackToggle()

        expect(AudioEngine.stop).toHaveBeenCalledTimes(1)
        expect(ui.props.setIsPlaying).toHaveBeenCalledWith(false)
        expect(ui.playbackToggleIcon.svg).not.toHaveBeenCalled()

        ui.componentDidUpdate(playingArrives(ui, false))

        expect(drawn(ui)).toEqual({ icon: 'play', label: 'Play' })
    })

    it('leaves the button alone on an update that does not change isPlaying', () => {
        const ui = makePlaybackUI(true)

        const prevProps = ui.props
        ui.props = { ...ui.props, display: { ...ui.props.display, isShowingLayerSettings: true } }
        ui.componentDidUpdate(prevProps)

        expect(ui.playbackToggleIcon.svg).not.toHaveBeenCalled()
        expect(ui.playbackToggle.attr).not.toHaveBeenCalled()
    })
})
