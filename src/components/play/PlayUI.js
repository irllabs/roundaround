import React, { Component } from 'react';
import _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import { HTML_UI_Params, PRESET_LETTERS } from '../../utils/constants'
import { connect } from "react-redux";
import AudioEngine from '../../audio-engine/AudioEngine'
import { getDefaultLayerData } from '../../utils/defaultData';
import { SET_LAYER_MUTE, TOGGLE_STEP, ADD_LAYER, SET_SELECTED_LAYER_ID, SET_IS_SHOWING_LAYER_SETTINGS, UPDATE_STEP, SET_IS_SHOWING_ORIENTATION_DIALOG, UPDATE_LAYERS, SET_CURRENT_SEQUENCE_PATTERN } from '../../redux/actionTypes'
import { FirebaseContext } from '../../firebase/'
import * as Tone from 'tone';
import { withStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import { numberRange } from '../../utils/index'
import Instruments from '../../audio-engine/Instruments'
import { getDefaultUserPatternSequence } from '../../utils/defaultData'
import { detailedDiff } from 'deep-object-diff';
import {
    setIsPlaying,
    setIsRecordingSequence,
    setUserPatternSequence,
    updateLayers,
    setIsPlayingSequence,
    setCurrentSequencePattern,
    saveUserPattern
} from "../../redux/actions";
const styles = theme => ({
    button: {
        cursor: 'pointer'
    },
    fadeIn: {
        transition: "all 0.5s ease-in"
    },
    fadeOut: {
        transition: "all 0.5s ease-out"
    },
    smallCross: {
        width: 5,
        height: 5
    },
    buttonIcon: {
        pointerEvents: 'none'
    }
})

class PlayUI extends Component {
    static contextType = FirebaseContext
    constructor(props) {
        super(props)
        this.state = {
            selectedPattern: null,
            isMinimized: false
        }
        this.selectedPatternNeedsSaving = false
        this.isZooming = false
        this.isPanning = false
        this.isRecordingSequence = false
        this.isPlayingSequence = false
        this.stepGraphics = []
        this.microStepGraphics = []
        this.layerGraphics = []
        this.microLayerGraphics = []
        this.microPatternGraphics = []
        this.sequenceGraphics = []
        this.sequencerButtons = []
        this.activePattern = undefined
        this.activeSequence = undefined
        this.round = null // local copy of round, prevent mutating store.
        this.isOn = false
        this.editAllLayers = false
        this.swipeToggleActive = false
        this.userColors = {};
        this.isScrolling = false;
        this.stepOnTimer = 0;
        this.onWindowResizeThrottled = _.throttle(this.onWindowResize.bind(this), 1000)
        this.selectedLayerId = null;
        this.onKeypress = this.onKeypress.bind(this)
        this.onOutsideClick = this.onOutsideClick.bind(this)
        this.stepModalStepUpdateThrottled = _.throttle(this.stepModalStepUpdate.bind(this), 300)
        this.sequencerParts = {}
    }

    async componentDidMount() {
        const { round, user } = this.props
        // register this component with parent so we can do some instant updates bypassing redux for speed
        this.props.childRef(this)
        this.isPlayingSequence = round.userPatterns[user.id].isPlayingSequence
        window.addEventListener('click', this.interfaceClicked)
        window.addEventListener('resize', this.onWindowResizeThrottled)
        window.addEventListener('keypress', this.onKeypress)
        this.addBackgroundEventListeners()
        this.checkOrientation()
        // load sequence if enabled
        const patterns = round.userPatterns
        this.loadSequence(patterns)
        this.setDefaultPattern()
        await this.createRound()
    }

    async componentWillUnmount() {
        window.removeEventListener('click', this.interfaceClicked)
        window.removeEventListener('resize', this.onWindowResizeThrottled)
        window.removeEventListener('keypress', this.onKeypress)
        this.removeBackgroundEventListeners()
        this.clear()
        this.disposeToneEvents()
    }

    setDefaultPattern = async () => {
        const { user, round } = this.props
        const defaultPattern = round.userPatterns[user.id].patterns[0]
        this.activePatternId = defaultPattern.id
        this.onLoadPattern(defaultPattern.id)
    }

    interfaceClicked = (e) => {
        if (!this.selectedLayerId && this.props.selectedLayer) {
            this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId: null } })
            this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
        }
    }

    async createRound() {
        this.round = _.cloneDeep(this.props.round)
        this.userColors = this.getUserColors()
        // Create SVG container
        this.containerWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
        this.containerHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        const roundElement = document.getElementById('round')
        roundElement.style.width = this.containerWidth + 'px'
        roundElement.style.height = this.containerHeight + 'px'
        this.container = SVG()
            .addTo(roundElement)
            .size(this.containerWidth, this.containerHeight)
            .panZoom({ zoomMin: 0.2, zoomMax: 1.3, zoomFactor: 0.2 })
        this.container.on('panning', (e) => {
            if (this.stepIsPanning) {
                e.preventDefault()
            }
        })
        this.container.viewbox(0, 0, this.containerWidth, this.containerHeight)
        this.draw()
    }

    async componentDidUpdate(prevProps) {
        const { round, user, display, setIsRecordingSequence } = this.props
        const oldRound = prevProps.round
        let redraw = false
        let shouldRecalculateParts = false
        const _this = this
        const sameLayerLength = prevProps.round.layers.length === round.layers.length

        this.isPlayingSequence = round.userPatterns[user.id].isPlayingSequence

        !this.activePatternId &&
            this.setDefaultPattern()

        let diff = detailedDiff(this.round, this.props.round)
        if (!_.isEqual(round.userPatterns[user.id].isPlayingSequence, oldRound.userPatterns[user.id].isPlayingSequence)) {
            redraw = true
        }

        if (!_.isEqual(display.isRecordingSequence, prevProps.display.isRecordingSequence)) {
            redraw = true
        }

        if (!_.isEqual(this.isRecordingSequence, display.isRecordingSequence)) {
            /** update props to match state */
            setIsRecordingSequence(this.isRecordingSequence)
        }

        // whole round has changed
        if (this.round.id !== this.props.round.id) {
            this.round = _.cloneDeep(this.props.round)
            AudioEngine.load(this.props.round)
            this.draw()
            return
        }

        if (!sameLayerLength) {
            await this.onSavePattern(this.activePatternId)
        }

        //layer removal
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (_.isNil(newLayer)) {
                AudioEngine.removeTrack(layer.id)
                redraw = true
            }
        }

        // sequence update
        if (!_.isNil(diff.updated.userPatterns)) {
            this.loadSequence(diff.updated.userPatterns)
            redraw = true
        }

        //  tempo changed
        if (this.round.bpm !== this.props.round.bpm) {
            this.round.bpm = this.props.round.bpm
            AudioEngine.setTempo(this.round.bpm)
            this.reclaculateIndicatorAnimation()
            this.adjustAllLayerOffsets()
        }

        // User profile color changed
        const userColors = this.getUserColors()
        if (!_.isEqual(userColors, this.userColors)) {
            this.userColors = userColors
            redraw = true
        }

        // add layer or step
        if (!_.isNil(diff.added.layers)) {
            for (let [, layer] of Object.entries(diff.added.layers)) {
                AudioEngine.createTrack(layer)
            }
            shouldRecalculateParts = true
            redraw = true
        }

        // add remove layer or step
        if (!_.isNil(diff.deleted.layers)) {
            for (let [, layer] of Object.entries(diff.deleted.layers)) {
                AudioEngine.createTrack(layer)
            }
            shouldRecalculateParts = true
            redraw = true
        }

        // Check for layer type or instrument changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.instrument, newLayer.instrument)) {
                // instrument has changed
                AudioEngine.tracksById[newLayer.id].setInstrument(newLayer.instrument)
                this.updateLayerLabelText(layer.id, newLayer.instrument.sampler)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.type, newLayer.type)) {
                // type has changed
                AudioEngine.tracksById[newLayer.id].setType(newLayer.type, newLayer.automationFxId)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.automationFxId, newLayer.automationFxId)) {
                // automation has changed
                AudioEngine.tracksById[newLayer.id].setAutomatedFx(newLayer.automationFxId)
            }
        }
        // Check for gain changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.gain, newLayer.gain)) {
                AudioEngine.tracksById[newLayer.id].setVolume(newLayer.gain)
            }
        }

        // Check for mute changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.isMuted, newLayer.isMuted)) {
                AudioEngine.tracksById[newLayer.id]?.setMute(newLayer.isMuted)
                redraw = true
            }
        }

        // Check for layer time offset changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.timeOffset, newLayer.timeOffset)) {
                AudioEngine.recalculateParts(this.props.round)
                this.adjustLayerOffset(newLayer.id, newLayer.percentOffset, newLayer.timeOffset)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.percentOffset, newLayer.percentOffset)) {
                AudioEngine.recalculateParts(this.props.round)
                this.adjustLayerOffset(newLayer.id, newLayer.percentOffset, newLayer.timeOffset)
            }
        }

        if (shouldRecalculateParts) {
            AudioEngine.recalculateParts(this.props.round)
        }
        if (redraw) {
            this.clear()
            this.round = _.cloneDeep(this.props.round)
            _this.draw(false)
        }
        this.round = _.cloneDeep(this.props.round)
    }

    loadSequence = (patterns) => {
        const { round } = this.props
        for (let [userPatternsId, userPatterns] of Object.entries(patterns)) {
            if (!_.isNil(userPatterns.isPlayingSequence)) {
                if (userPatterns.isPlayingSequence) {
                    const newUserPatterns = round.userPatterns[userPatternsId]
                    this.startSequence(newUserPatterns)
                } else {
                    this.stopSequence(userPatternsId)
                }
            }
        }
    }

    onMuteToggle = (props) => {
        const isMuted = props.selectedLayer?.isMuted
        if (props.selectedLayer) {
            AudioEngine.tracksById[props.selectedLayer.id]?.setMute(!isMuted)
            props.dispatch({ type: SET_LAYER_MUTE, payload: { id: props.selectedLayer.id, value: !isMuted, user: props.user.id } })
            this.context.updateLayer(props.round.id, props.selectedLayer.id, { isMuted: !isMuted })
        }
    }

    getStep(id) {
        let steps = []
        for (let layer of this.round.layers) {
            steps.push(...layer.steps)
        }
        return _.find(steps, { id })
    }

    async draw(shouldAnimate) {
        const { isPlaying } = this.props

        this.clear()

        this.orderLayers()
        this.cacheStepLayers()

        // draw layers
        this.stepGraphics = []
        this.layerGraphics = []
        let i = 0
        for (const layer of this.round.layers) {
            // add order parameter so we can calculate offsets (todo: add this when we create a layer?)
            this.addLayer(layer, i++, shouldAnimate)
        }
        // Create activity line
        this.drawAvatars()
        this.activityIndicator = this.container.circle(HTML_UI_Params.activityIndicatorDiameter).fill({ color: '#fff', opacity: 0 })

        // add layer button
        this.playbackToggle = this.container.circle(HTML_UI_Params.addNewLayerButtonDiameter).stroke({ width: 1, color: 'rgba(0,0,0,0)' }).fill('white').opacity('0.1')
        this.playbackToggle.x((this.containerWidth / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.playbackToggle.y((this.containerHeight / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.playbackToggle.click(this.onPlaybackToggle)
        this.playbackToggle.addClass(this.props.classes.button)
        this.playbackToggleIcon = this.container.nested()
        if (!isPlaying)
            this.playbackToggleIcon.svg(`<svg width="36" height="39" viewBox="0 0 36 39" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M32.744 24.2206L8.57602 38.174C5.19566 40.1256 0.970215 37.6861 0.970215 33.7828L0.970215 5.87595C0.970215 1.97265 5.19567 -0.46691 8.57602 1.48474L32.744 15.4382C36.1244 17.3898 36.1244 22.2689 32.744 24.2206ZM31.0144 21.2247C32.0885 20.6046 32.0885 19.0542 31.0144 18.434L6.84635 4.48061C5.77222 3.86046 4.42955 4.63565 4.42955 5.87595L4.42955 33.7828C4.42955 35.0231 5.77222 35.7983 6.84635 35.1781L31.0144 21.2247Z" fill="#fff" width="38.06px" height="34.31px" fill-opacity="0.9" /></svg>`)
        if (isPlaying)
            this.playbackToggleIcon.svg(`<svg width="36" height="39" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 36 39" style="enable-background:new 0 0 36 39;" xml:space="preserve">
            <style type="text/css">
                .st0{fill-rule:evenodd;clip-rule:evenodd;fill:#fff;fill-opacity:0.9;}
            </style>
            <path class="st0" d="M15.5,30.8V8c0-4.1-3.3-7.4-7.4-7.4S0.7,3.9,0.7,8v22.8c0,4.1,3.3,7.4,7.4,7.4S15.5,34.9,15.5,30.8z M4.1,8 c0-2.2,1.8-4,4-4c2.2,0,4,1.8,4,4v22.8c0,2.2-1.8,4-4,4c-2.2,0-4-1.8-4-4V8z" />
            <path class="st0" d="M34.9,30.8V8c0-4.1-3.3-7.4-7.4-7.4S20.1,3.9,20.1,8v22.8c0,4.1,3.3,7.4,7.4,7.4S34.9,34.9,34.9,30.8z M23.5,8 c0-2.2,1.8-4,4-4s4,1.8,4,4v22.8c0,2.2-1.8,4-4,4s-4-1.8-4-4V8z" /></svg>`)
        this.playbackToggleIcon.x((this.containerWidth / 2) - 17.5)
        this.playbackToggleIcon.y((this.containerHeight / 2) - 19.5)
        this.playbackToggleIcon.addClass(this.props.classes.buttonIcon)

        this.stepModal = this.container.nested()
        this.stepModalBackground = this.stepModal.rect(HTML_UI_Params.stepModalDimensions, HTML_UI_Params.stepModalDimensions).fill({ color: '#000', opacity: 0.8 }).radius(HTML_UI_Params.stepModalThumbDiameter / 2)

        this.stepModalProbabilityText = this.stepModal.text('Probability')
        this.stepModalProbabilityText.fill('#545454')
        this.stepModalProbabilityText.font({
            size: 16,
            weight: 500
        })
        this.stepModalProbabilityText.x(HTML_UI_Params.stepModalDimensions - 135)
        this.stepModalProbabilityText.y(HTML_UI_Params.stepModalDimensions - 30)

        this.stepModalVelocityText = this.stepModal.text('Velocity')
        this.stepModalVelocityText.fill('#545454')
        this.stepModalVelocityText.font({
            size: 16,
            weight: 500
        })
        this.stepModalVelocityText.transform({ rotate: 270 })
        this.stepModalVelocityText.x(120 - HTML_UI_Params.stepModalDimensions)
        this.stepModalVelocityText.y(0)

        this.stepModalThumb = this.stepModal.circle(HTML_UI_Params.stepModalThumbDiameter)
        this.stepModalThumb.fill(this.userColors[this.props.user.id])

        this.stepModal.hide()

        if (!_.isNil(this.highlightNewLayer)) {
            // this.onLayerClicked(this.highlightNewLayer)
            this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId: this.highlightNewLayer } })
            this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
            this.highlightNewLayer = null;
        }

        this.scheduleToneEvents()
        await this.renderPatternPresetsSequencer();
    }

    scheduleToneEvents() {
        this.disposeToneEvents()
        const _this = this
        this.toneParts = []
        for (const layer of this.round.layers) {
            const color = layer.isMuted ? '#FFFFFF' : this.userColors[layer.createdBy]
            const notes = this.convertStepsToNotes(layer.steps, color)
            for (let note of notes) {
                note.time += 'i';
            }
            let part = new Tone.Part(function (time, note) {
                Tone.Draw.schedule(function () {
                    const stepGraphic = _.find(_this.stepGraphics, { id: note.id })
                    if (!_.isNil(stepGraphic)) {
                        stepGraphic.stroke({ color: '#FFFFFF', opacity: layer.isMuted ? 0.1 : 1 })
                        stepGraphic.animate().stroke({ color: note.color, opacity: layer.isMuted ? 0.1 : 1 })
                    }
                }, time)
            }, notes)
            part.loop = true
            part.loopEnd = '1:0:0'
            part.start(0)
            _this.toneParts.push(part)
        }
    }

    disposeToneEvents() {
        if (!_.isNil(this.toneParts)) {
            for (let part of this.toneParts) {
                if (!_.isNil(part) && !_.isNil(part._events)) {
                    part.dispose()
                }
            }
        }
    }

    convertStepsToNotes(steps, userColor) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        const ticksPerStep = Math.round(totalTicks / steps.length)
        let notes = []
        for (let i = 0; i < steps.length; i++) {
            let step = steps[i]
            const note = {
                time: i * ticksPerStep,
                id: step.id,
                isOn: step.isOn,
                color: userColor
            }
            notes.push(note)
        }
        return notes
    }

    startSequence(userPatterns) {
        const PPQ = Tone.Transport.PPQ
        const ticksPerBar = PPQ * 4
        const notes = []
        const _this = this
        let numberOfBars = 0

        for (let i = 0; i < userPatterns.sequence.length; i++) {
            let id = userPatterns.sequence[i]
            if (id !== false) {

                let note = {
                    time: ((i * ticksPerBar) - 32),
                    id,
                    order: i
                }
                notes.push(note)
                numberOfBars++
            }
        }
        for (let note of notes) {
            if (note.time < 0) {
                note.time += ticksPerBar * numberOfBars
            }
            note.time += 'i'
        }
        let part = new Tone.Part(function (time, note) {
            _this.loadPatternPriority(userPatterns.id, note.id, note.order)
            //  if (shouldUpdateGraphics) {
            Tone.Draw.schedule(function () {
                _this.loadPattern(userPatterns.id, note.id, note.order)
            })
            // }
        }, notes)
        part.loop = true
        part.loopEnd = numberOfBars + ':0:0'
        part.start(0)
        this.sequencerParts[userPatterns.id] = part
    }

    stopSequence(id) {
        if (!_.isNil(this.sequencerParts[id])) {
            this.sequencerParts[id].stop()
        }
    }

    async loadPatternPriority(userId, id, order) {
        //this.props.dispatch({ type: SET_CURRENT_SEQUENCE_PATTERN, payload: { value: order } })
        const pattern = _.find(this.props.round.userPatterns[userId].patterns, { id })
        if (!_.isEmpty(pattern.state)) {
            // check if we have layers in the round not referenced in the pattern then set all steps in that layer to off
            for (const existingLayer of this.props.round.layers) {
                if (_.isNil(_.find(pattern.state.layers, { id: existingLayer.id })) && existingLayer.createdBy === userId) {
                    let existingLayerClone = _.cloneDeep(existingLayer)
                    for (const step of existingLayerClone.steps) {
                        step.isOn = false
                    }
                    pattern.state.layers.push(existingLayerClone)
                }
            }

            // check we haven't deleted the layer that is referenced in the pattern
            let layersToDelete = []
            for (const layer of pattern.state.layers) {
                const layerExists = _.find(this.props.round.layers, { id: layer.id })
                if (_.isNil(layerExists)) {
                    layersToDelete.push(layer)
                }
            }

            _.remove(pattern.state.layers, function (n) {
                return layersToDelete.indexOf(n) > -1
            })
            //this.props.updateLayers(pattern.state.layers)

            for (let layer of this.round.layers) {
                let patternLayer = _.find(pattern.state.layers, { id: layer.id })
                if (!_.isNil(patternLayer)) {
                    layer.steps = patternLayer.steps
                }
            }

            AudioEngine.recalculateParts(this.round)
        }
    }

    loadPattern(userId, id, order) {
        this.props.dispatch({ type: UPDATE_LAYERS, payload: { layers: this.round.layers } })
        this.props.dispatch({ type: SET_CURRENT_SEQUENCE_PATTERN, payload: { value: order } })
        this.clear()
        this.draw(false)
    }

    clear() {
        this.removeAllStepEventListeners()
        this.removeAllLayerEventListeners()
        if (!_.isNil(this.layerGrahpics)) {
            for (let layerGrahpic of this.layerGrahpics) {
                layerGrahpic.clear()
            }
        }

        if (!_.isNil(this.stepGraphics)) {
            for (let stepGraphic of this.stepGraphics) {
                stepGraphic.clear()
            }
        }
        this.stepGraphics = []
        if (!_.isNil(this.container)) {
            this.container.clear()
        }
        if (!_.isNil(this.playbackToggle)) {
            this.playbackToggle.click(null)
        }
    }

    reclaculateIndicatorAnimation() {
        /* if (!_.isNil(this.positionLineAnimation)) {
             this.positionLineAnimation.unschedule()
         }
         const positionLineTime = (60 / this.round.bpm) * 4000
         this.positionLineAnimation = this.positionLine.animate({ duration: positionLineTime }).ease('-').transform({ rotate: 360, relative: true, origin: 'bottom center' }).loop()
         if (!this.isOn) {
             this.positionLine.timeline().pause()
         } else {
             this.positionLine.timeline().seek(AudioEngine.getPositionMilliseconds())
         }*/
    }

    addLayer(layer, order, shouldAnimate = true) {
        const dim = this.isRecordingSequence
        // let animateTime = shouldAnimate ? 600 : 0
        const createdByThisUser = layer.createdBy === this.props.user.id;
        //const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (order + 1))
        const layerDiameter = this.getLayerDiameter(order)
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        let layerStrokeSize = HTML_UI_Params.layerStrokeMax / HTML_UI_Params.otherUserLayerSizeDivisor
        if (layer.createdBy === this.props.user.id) {
            layerStrokeSize = HTML_UI_Params.layerStrokeMax
        }

        const layerGraphic =
            this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' })
                .stroke({ color: this.userColors[layer.createdBy], width: layerStrokeSize + 'px' })
                .opacity(dim ? 0.1 : !createdByThisUser ? 0.5 : 1)
        layer.isMuted && layerGraphic.stroke({ color: 'rgba(255,255,255,0.1)' })
        layerGraphic.x(xOffset)
        layerGraphic.y(yOffset)
        layerGraphic.id = layer.id
        layerGraphic.order = order
        layerGraphic.isAllowedInteraction = layer.createdBy === this.props.user.id
        if (layer.id === this.selectedLayerId) {
            // layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
            layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
        } else {
            //layerGraphic.animate(animateTime).stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
            layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
        }
        if (layerGraphic.isAllowedInteraction) {
            layerGraphic.addClass(this.props.classes.button)
        }
        this.addLayerEventListeners(layerGraphic)
        this.layerGraphics.push(layerGraphic)



        // draw steps
        const stepSize = (2 * Math.PI) / layer.steps.length;
        let stepDiameter = HTML_UI_Params.stepDiameter / HTML_UI_Params.otherUserLayerSizeDivisor
        let stepStrokeWidth = HTML_UI_Params.stepStrokeWidth / HTML_UI_Params.otherUserLayerSizeDivisor
        if (layer.createdBy === this.props.user.id) {
            stepDiameter = HTML_UI_Params.stepDiameter
            stepStrokeWidth = HTML_UI_Params.stepStrokeWidth
        }
        const radius = layerDiameter / 2;
        let angle = Math.PI / -2; // start at -90 degrees so first step is at top
        const anglePercentOffset = this.ticksToRadians(this.ticksPerStep(layer.steps.length) * (layer.percentOffset / 100))
        const angleTimeOffset = this.ticksToRadians(this.msToTicks(layer.timeOffset))
        //const angleOffset = (((Math.PI * 2) / layer.steps.length) * (layer.timeOffset / 100))
        angle += anglePercentOffset
        angle += angleTimeOffset
        let layerLabelString = Instruments.getInstrumentLabel(layer.instrument.sampler)
        if (layerLabelString.length > 5) {
            layerLabelString = layerLabelString.substring(0, 5) + '...'
        }
        if (layer.createdBy !== this.props.user.id) {
            layerLabelString = ""
        }
        layerGraphic.layerLabel = this.container.plain(layerLabelString)
        layerGraphic.firstStep = null;
        for (let step of layer.steps) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - stepDiameter / 2) + yOffset;
            const stepGraphic = this.container.circle(stepDiameter)
            stepGraphic.stroke({
                color: layer.isMuted ? 'rgba(255,255,255, 0.1)' : this.userColors[layer.createdBy],
                width: stepStrokeWidth + 'px'
            }).opacity(dim ? 0.1 : !createdByThisUser ? 0.5 : 1)
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.layerId = layer.id
            stepGraphic.id = step.id
            stepGraphic.isAllowedInteraction = !dim && layer.createdBy === this.props.user.id
            stepGraphic.userColor = this.userColors[layer.createdBy]
            if (layer.createdBy === this.props.user.id) {
                stepGraphic.addClass(this.props.classes.button)
            }
            this.stepGraphics.push(stepGraphic)
            this.updateStep(step)
            this.addStepEventListeners(stepGraphic)
            if (_.isNil(layerGraphic.firstStep)) {
                layerGraphic.firstStep = stepGraphic
            }
        }
        layerGraphic.labelYOffset = 32 * (anglePercentOffset + angleTimeOffset)
        this.updateLayerLabel(layerGraphic)
    }

    getLayerDiameter(order) {
        let diameter = HTML_UI_Params.addNewLayerButtonDiameter + (HTML_UI_Params.initialLayerPadding * 1.5)
        for (let i = 0; i < order; i++) {
            let layer = this.round.layers[i]
            if (layer.createdBy === this.props.user.id) {
                diameter += HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter
            } else {
                diameter += ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) / HTML_UI_Params.otherUserLayerSizeDivisor)
            }
        }
        return diameter
    }

    updateLayerLabel(layerGraphic) {
        layerGraphic.layerLabel?.x(layerGraphic.firstStep?.x() + HTML_UI_Params.stepDiameter + 8)
        layerGraphic.layerLabel?.y(layerGraphic.firstStep?.y() + ((HTML_UI_Params.stepDiameter / 2) - 6) + layerGraphic.labelYOffset)
    }

    updateLayerLabelText(layerId, text) {
        if (text.length > 5) {
            text = text.substring(0, 5) + '...'
        }
        let layerGraphic = _.find(this.layerGraphics, { id: layerId })
        layerGraphic.layerLabel.text(text)
        this.updateLayerLabel(layerGraphic)
    }

    updateStep(step, showActivityIndicator = false) {
        if (!_.isEmpty(this.stepGraphics) && !_.isNil(step)) {
            const layer = this.stepLayerDictionary[step.id]
            const stepGraphic = _.find(this.stepGraphics, { id: step.id })
            const _this = this
            if (showActivityIndicator) {
                // add delay so that graphic updates after activity indicator hits it
                _.delay(() => {
                    if (step.isOn) {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({
                            fill: layer.isMuted ? 'rgba(255,255,255, 0.1)' : _this.userColors[layer.createdBy],
                            stroke: layer.isMuted ? 'rgba(255,255,255, 0.1)' : _this.userColors[layer.createdBy],
                            'fill-opacity': step.probability
                        })
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).transform({
                            scale: numberRange(step.velocity, 0, 1, 0.5, 1)
                        })
                    } else {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: '#101114' })
                    }
                }, HTML_UI_Params.activityAnimationTime)
                this.animateActivityIndicator(layer.createdBy, stepGraphic.x() + (HTML_UI_Params.stepDiameter / 2), stepGraphic.y() + (HTML_UI_Params.stepDiameter / 2))
            } else {
                if (step.isOn) {
                    stepGraphic.attr({
                        fill: layer.isMuted ? 'rgba(255,255,255, 0.1)' : _this.userColors[layer.createdBy],
                        stroke: layer.isMuted ? 'rgba(255,255,255, 0.1)' : _this.userColors[layer.createdBy],
                        'fill-opacity': step.probability
                    })
                    stepGraphic.transform({
                        scale: numberRange(step.velocity, 0, 1, 0.5, 1)
                    })
                } else {
                    stepGraphic.attr({ fill: '#101114', 'fill-opacity': 1 })
                }
            }
        }
    }

    highlightLayer(layerGraphic, unhighlightExceptLayerId) {
        this.unhighlightAllLayers(unhighlightExceptLayerId)
        layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
    }

    unhighlightAllLayers(exceptLayerId) {
        for (const layerGraphic of this.layerGraphics) {
            if (layerGraphic.id !== exceptLayerId) {
                layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
            }
        }
    }

    cacheStepLayers() {
        this.stepLayerDictionary = {}
        for (let layer of this.props.round.layers) {
            for (let step of layer.steps) {
                this.stepLayerDictionary[step.id] = layer
            }
        }
    }

    adjustAllLayerOffsets() {
        let order = 0
        for (const layer of this.round.layers) {
            this.adjustLayerOffset(layer.id, layer.percentOffset, layer.timeOffset, order)
            order++
        }
    }

    adjustLayerOffset(id, percentOffset, timeOffset, order) {
        const layer = _.find(this.round.layers, { id })
        let stepGraphics = _.filter(this.stepGraphics, { layerId: id })
        const layerGraphic = _.find(this.layerGraphics, { id })
        const layerDiameter = this.getLayerDiameter(order)
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        const stepSize = (2 * Math.PI) / layer.steps.length;
        const radius = layerDiameter / 2;
        let angle = Math.PI / -2; // start at -90 degrees so first step is at top
        // const angleOffset = (((Math.PI * 2) / layer.steps.length) * (percent / 100))
        const anglePercentOffset = this.ticksToRadians(this.ticksPerStep(layer.steps.length) * (percentOffset / 100))
        const angleTimeOffset = this.ticksToRadians(this.msToTicks(timeOffset))
        angle += anglePercentOffset
        angle += angleTimeOffset
        layerGraphic.firstStep = null
        for (let stepGraphic of stepGraphics) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - HTML_UI_Params.stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - HTML_UI_Params.stepDiameter / 2) + yOffset;
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            if (_.isNil(layerGraphic.firstStep)) {
                layerGraphic.firstStep = stepGraphic
            }
        }
        layerGraphic.labelYOffset = 32 * (anglePercentOffset + angleTimeOffset)
        this.updateLayerLabel(layerGraphic)
    }

    ticksPerStep(numberOfSteps) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        return Math.round(totalTicks / numberOfSteps)
    }

    ticksToRadians(ticks) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        return ((Math.PI * 2) / totalTicks) * ticks
    }

    msToTicks(ms) {
        const BPM = Tone.Transport.bpm.value
        const PPQ = Tone.Transport.PPQ
        const msPerBeat = 60000 / BPM
        const msPerTick = msPerBeat / PPQ
        return Math.round(ms / msPerTick)
    }

    drawAvatars() {
        if (!_.isNil(this.props.collaboration)) {
            this.avatarGraphics = []
            const numberOfContributors = Object.entries(this.props.collaboration.contributors).length
            const totalAvatarHeight = (HTML_UI_Params.avatarDiameter * numberOfContributors) + (HTML_UI_Params.avatarPadding * (numberOfContributors - 1))
            const offsetY = (this.containerHeight / 2) - (totalAvatarHeight / 2)
            let x = (this.containerWidth / 2) + (HTML_UI_Params.addNewLayerButtonDiameter / 2) + (HTML_UI_Params.initialLayerPadding / 2) + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding) * (this.round.layers.length)) + HTML_UI_Params.avatarRoundPadding
            let y = 0
            for (let [id, contributor] of Object.entries(this.props.collaboration.contributors)) {
                let avatarGraphic = this.container.circle(HTML_UI_Params.avatarDiameter).attr({ fill: contributor.color })
                avatarGraphic.x(x)
                avatarGraphic.y(y + offsetY)
                avatarGraphic.id = id
                this.avatarGraphics.push(avatarGraphic)
                y += HTML_UI_Params.avatarDiameter + HTML_UI_Params.avatarPadding
            }
        }
    }

    updateAvatarPositions(numberOfLayers) {
        if (!_.isEmpty(this.avatarGraphics)) {
            let x = (this.containerWidth / 2) + (HTML_UI_Params.addNewLayerButtonDiameter / 2) + (HTML_UI_Params.initialLayerPadding / 2) + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding) * numberOfLayers) + HTML_UI_Params.avatarRoundPadding
            for (let avatarGraphic of this.avatarGraphics) {
                avatarGraphic.x(x)
            }
        }
    }

    animateActivityIndicator(userId, toX, toY) {
        const avatarGraphic = _.find(this.avatarGraphics, { id: userId })
        if (!_.isNil(this.activityIndicator) && !_.isNil(avatarGraphic)) {
            this.activityIndicator.fill({ color: this.userColors[userId], opacity: 1 })
            const fromX = avatarGraphic.x() + (HTML_UI_Params.avatarDiameter / 2)
            const fromY = avatarGraphic.y() + (HTML_UI_Params.avatarDiameter / 2)
            toX -= HTML_UI_Params.activityIndicatorDiameter / 2
            toY -= HTML_UI_Params.activityIndicatorDiameter / 2
            this.activityIndicator.move(fromX, fromY)
            const animation = this.activityIndicator.animate(HTML_UI_Params.activityAnimationTime).move(toX, toY)//.animate(HTML_UI_Params.activityAnimationTime * 1.3).fill({ opacity: 0 })
            animation.after(() => {
                this.activityIndicator.animate().fill({ opacity: 0 })
            })
        }
    }

    addLayerEventListeners(layerGraphic) {
        const _this = this
        if (layerGraphic.isAllowedInteraction) {
            layerGraphic.click(function (e) {
                e.stopPropagation()
                //_this.onLayerClicked(layerGraphic.id)
            })
            layerGraphic.on('mousedown', function (e) {
                e.stopPropagation()
                _this.onLayerClicked(layerGraphic.id)
            })
            layerGraphic.on('mouseover', function (e) {
                e.stopPropagation()
                _this.onLayerOver(layerGraphic)
            })
            layerGraphic.on('mouseout', function (e) {
                e.stopPropagation()
                _this.onLayerOut(layerGraphic)
            })
            layerGraphic.on('touchstart', (e) => {
                _this.onLayerTouchStart(layerGraphic, e)
            })
            layerGraphic.on('touchend', (e) => {
                _this.onLayerTouchEnd(layerGraphic, e)
            })
            layerGraphic.on('dblclick', e => {
                // should be a layer to mute toggle
                this.onMuteToggle(this.props)
            })
        }
    }
    onLayerTouchStart(layerGraphic, e) {
        e.preventDefault()
        const _this = this
        this.layerTouchTimer = setTimeout(() => {
            _this.onLayerClicked(layerGraphic.id)
        }, 500)
    }
    onLayerTouchEnd(layerGraphic) {
        if (this.layerTouchTimer) {
            clearTimeout(this.layerTouchTimer)
        }
    }
    onLayerClicked(layerId) {
        this.selectedLayerId = layerId
        this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId } })
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
        this.highlightLayer(_.find(this.layerGraphics, { id: layerId }))
    }
    onLayerOver(layerGraphic) {
        if (!this.swipeToggleActive) {
            this.highlightLayer(layerGraphic, this.selectedLayerId)
        }
    }
    onLayerOut(layerGraphic) {
        this.unhighlightAllLayers(this.selectedLayerId)
    }

    orderAndReturnLayers = async (layers) => {
        let newLayers = _.sortBy(layers, 'createdAt')
        let myLayers = _.filter(newLayers, { createdBy: this.props.user.id })
        myLayers = _.sortBy(myLayers, 'createdAt')
        myLayers.reverse()
        let collaboratorLayers = _.filter(newLayers, (layer) => {
            return layer.createdBy !== this.props.user.id
        })
        collaboratorLayers = _.sortBy(collaboratorLayers, ['createdBy', 'createdAt'])
        return [...myLayers, ...collaboratorLayers]
    }

    orderLayers() {
        // order layers
        this.round.layers = _.sortBy(this.round.layers, 'createdAt')
        let myLayers = _.filter(this.round.layers, { createdBy: this.props.user.id })
        myLayers = _.sortBy(myLayers, 'createdAt')
        myLayers.reverse()
        let collaboratorLayers = _.filter(this.round.layers, (layer) => {
            return layer.createdBy !== this.props.user.id
        })
        collaboratorLayers = _.sortBy(collaboratorLayers, ['createdBy', 'createdAt'])
        this.round.layers = [...myLayers, ...collaboratorLayers]
    }

    orderSteps() {
        for (const layer of this.round.layers) {
            layer.steps = _.orderBy(layer.steps, 'order')
        }
    }

    addStepEventListeners(stepGraphic) {
        this.removeStepEventListeners(stepGraphic)
        const _this = this
        if (stepGraphic.isAllowedInteraction) {

            stepGraphic.on('mouseout', async (e) => {
                if (!_.isNil(_this.stepMoveTimer)) {
                    // we've swiped / dragged out of the step, toggle this step and listen for mouseovers on all other steps
                    // add listener to layergraphic to cancel swiping
                    _this.addStepSwipeListeners(stepGraphic)
                    _this.swipeToggleActive = true
                    _this.touchStartStepGraphic = stepGraphic
                    _this.onStepClick(stepGraphic)
                }
            })

            stepGraphic.on('mousedown', (e) => {
                e.stopPropagation()
                e.preventDefault()
                _this.swipeToggleActive = false
                _this.startStepMoveTimer(stepGraphic, e.pageX, e.pageY)

                _this.container.on('mouseup', (e) => {
                    e.stopPropagation()
                    _this.removeStepSwipeListeners()
                    _this.container.off('mousemove')
                    _this.container.off('mouseup')

                    _this.hideStepModal()
                    if (!_.isNil(_this.stepMoveTimer)) {
                        // timer has not expired, so interpret as a click
                        _this.clearShowStepModalTimer()
                        if (!_this.swipeToggleActive) {
                            _this.onStepClick(stepGraphic)
                        }
                    } else {
                        _this.onStepDragEnd(stepGraphic)
                    }
                    this.swipeToggleActive = false
                })
            })

            stepGraphic.on('touchstart', (e) => {
                e.stopPropagation()
                e.preventDefault()
                _this.swipeToggleActive = false
                _this.startStepMoveTimer(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
                _this.touchStartStepGraphic = stepGraphic
                _this.isCurrentlyOverStepGraphic = stepGraphic
                stepGraphic.on('touchmove', (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    this.isScrolling = true;
                    if (_.isNil(_this.stepMoveTimer) && !_this.swipeToggleActive) {
                        _this.onStepDragMove(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
                    } else {
                        _this.touchStartStepGraphic = stepGraphic
                        _this.isOverStep(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
                    }
                })
                stepGraphic.on('touchend', (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    _this.hideStepModal()
                    if (!_.isNil(_this.stepMoveTimer)) {
                        // timer has not expired, so interpret as a click
                        _this.clearShowStepModalTimer()
                        if (!_this.swipeToggleActive) {
                            _this.onStepClick(stepGraphic)
                        }
                    } else {
                        _this.onStepDragEnd(stepGraphic)
                    }
                    stepGraphic.off('touchmove')
                    stepGraphic.off('touchend')
                    _this.touchStartStepGraphic = null
                    _this.isScrolling = false
                    clearInterval()
                })
            })
        }
    }
    removeStepEventListeners(stepGraphic) {
        stepGraphic.off('mousedown')
        stepGraphic.off('touchstart')
    }
    startStepMoveTimer(stepGraphic, x, y) {
        const _this = this
        this.clearShowStepModalTimer()
        this.stepMoveTimer = setTimeout(function () {
            const step = _this.getStep(stepGraphic.id)
            if (step.isOn && !_this.swipeToggleActive) {
                _this.showStepModal(stepGraphic, x, y)
            }
        }, 500)
    }

    showStepModal(stepGraphic, pageX, pageY) {
        this.clearShowStepModalTimer()
        this.stepModal.show()
        stepGraphic.startX = pageX
        stepGraphic.startY = pageY
        const step = this.getStep(stepGraphic.id)
        stepGraphic.isOn = step.isOn
        stepGraphic.probabilityPanStart = stepGraphic.probability = step.probability;
        stepGraphic.velocityPanStart = stepGraphic.velocity = step.velocity;
        this.updateStepModal(stepGraphic)
        const _this = this
        this.container.on('mousemove', (e) => {
            e.preventDefault()
            _this.onStepDragMove(stepGraphic, e.pageX, e.pageY)
        })

    }

    hideStepModal() {
        this.stepModal.hide()
        this.container.off('mousemove')
    }

    clearShowStepModalTimer() {
        clearTimeout(this.stepMoveTimer)
        this.stepMoveTimer = null
    }

    addStepSwipeListeners(originalStepGraphic) {
        this.removeStepSwipeListeners()
        const _this = this
        for (const stepGraphic of this.stepGraphics) {
            if (stepGraphic.layerId === originalStepGraphic.layerId) {
                stepGraphic.on('mouseover', (e) => {
                    _this.onStepClick(stepGraphic)
                })
            }
        }
    }

    removeStepSwipeListeners() {
        for (const stepGraphic of this.stepGraphics) {
            stepGraphic.off('mouseout')
            stepGraphic.off('mouseover')
        }
    }

    addStepSwipeCancelListener(stepGraphic) {
        const layerGraphic = _.find(this.layerGraphics, { id: stepGraphic.layerId })
        const _this = this
        layerGraphic.on('mouseout', (e) => {
            _this.swipeToggleActive = false
            _this.removeStepSwipeListeners()
            layerGraphic.off('mouseout')
        })
    }

    onStepDragMove(stepGraphic, x, y) {
        let deltaX = x - stepGraphic.startX
        let deltaY = y - stepGraphic.startY
        if (!this.isZooming && stepGraphic.isOn) {
            if (deltaX < -100) {
                deltaX = -100
            }
            deltaX = deltaX / 100
            stepGraphic.probability = stepGraphic.probabilityPanStart + deltaX
            if (stepGraphic.probability < 0) {
                stepGraphic.probability = 0
            } else if (stepGraphic.probability > 1) {
                stepGraphic.probability = 1
            }

            if (deltaY < -100) {
                deltaY = -100
            }
            deltaY = deltaY / -100
            stepGraphic.velocity = stepGraphic.velocityPanStart + deltaY;
            if (stepGraphic.velocity < 0) {
                stepGraphic.velocity = 0
            } else if (stepGraphic.velocity > 1) {
                stepGraphic.velocity = 1
            }

            stepGraphic.transform({
                scale: numberRange(stepGraphic.velocity, 0, 1, 0.5, 1)
            })
            stepGraphic.fill({ opacity: stepGraphic.probability })
            this.updateStepModal(stepGraphic)

            // throttle updates to step
            this.stepModalStepUpdateThrottled(stepGraphic)
        }
    }

    stepModalStepUpdate(stepGraphic) {
        let step = this.getStep(stepGraphic.id)
        step.probability = _.round(stepGraphic.probability, 1)
        step.velocity = _.round(stepGraphic.velocity, 1)
        this.saveLayer(stepGraphic.layerId)
        AudioEngine.recalculateParts(this.props.round)
    }

    onStepDragEnd(stepGraphic) {
        if (stepGraphic.isOn) {
            const step = this.getStep(stepGraphic.id)
            step.probability = _.round(stepGraphic.probability, 1)
            step.velocity = _.round(stepGraphic.velocity, 1)
            this.props.dispatch({ type: UPDATE_STEP, payload: { step: step, layerId: stepGraphic.layerId } })
            this.saveLayer(stepGraphic.layerId)
        }
        AudioEngine.recalculateParts(this.props.round)
    }

    highlightStep(stepGraphic) {
        const layer = _.find(this.props.round.layers, { id: stepGraphic.layerId })
        if (!_.isNil(layer)) {
            stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: this.userColors[layer.createdBy], 'fill-opacity': 1 })
        }
    }
    unhighlightStep(stepGraphic) {
        const step = this.getStep(stepGraphic.id)
        if (!step.isOn) {
            stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: '#101114', 'fill-opacity': 1 })
        }
    }

    async saveLayer(id, round) {
        const currentRound = round || this.props.round
        await this.context.updateLayer(this.round.id, id, _.find(currentRound.layers, { id }))
    }

    removeAllStepEventListeners() {
        for (let stepGraphic of this.stepGraphics) {
            stepGraphic.click(null)
            if (!_.isNil(stepGraphic.hammertime)) {
                stepGraphic.hammertime.off('pan')
                stepGraphic.hammertime.off('panstart')
                stepGraphic.hammertime.off('panend')
            }
        }
    }

    removeAllLayerEventListeners() {
        for (let layerGraphic of this.layerGraphics) {
            layerGraphic.click(null)
        }
    }

    updateStepModal(stepGraphic) {
        this.stepModal.x(stepGraphic.x() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModal.y(stepGraphic.y() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModalThumb.x(stepGraphic.probability * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
        this.stepModalThumb.y((1 - stepGraphic.velocity) * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
    }

    async onStepClick(stepGraphic) {
        //const { user } = this.props
        let step = this.getStep(stepGraphic.id)
        // update internal round so that it doesn't trigger another update when we receive a change after the dispatch
        step.isOn = !step.isOn
        this.updateStep(step, false)
        this.props.dispatch({ type: TOGGLE_STEP, payload: { layerId: stepGraphic.layerId, stepId: stepGraphic.id, lastUpdated: new Date().getTime(), isOn: step.isOn, user: null } })
        AudioEngine.recalculateParts(this.round)
        await this.saveLayer(stepGraphic.layerId)
        if (this.activePatternId) {
            await this.onSavePattern(this.activePatternId)
        }
        this.draw()
    }

    async onAddLayerClick() {
        const newLayer = await getDefaultLayerData(this.props.user.id);
        newLayer.name = 'Layer ' + (this.props.round.layers.length + 1)
        this.props.dispatch({ type: ADD_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
        this.highlightNewLayer = newLayer.id
        this.selectedLayerId = newLayer.id
        this.context.createLayer(this.round.id, newLayer)
    }

    addBackgroundEventListeners() {
        const element = document.getElementById('round')
        element && element.addEventListener('click', this.onOutsideClick)
    }
    removeBackgroundEventListeners() {
        const element = document.getElementById('round')
        element && element.removeEventListener('click', this.onOutsideClick)
    }
    onOutsideClick() {
        this.unhighlightAllLayers()
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
        this.selectedLayerId = null
    }
    getUserColors() {
        let userColors = {};
        for (const user of this.props.users) {
            userColors[user.id] = user.color
        }
        return userColors
    }

    onWindowResize(e) {
        const _this = this
        // some devices report incorrect orientation strightaway, however after around 500ms it seems to be correct.
        setTimeout(() => {
            const orientation = _this.getOrientation()
            if (orientation === 'portrait') {
                _this.showOrientationDialog()
            } else {
                _this.hideOrientationDialog()
            }
            if (!_.isNil(_this.container)) {
                let width = window.innerWidth
                let height = window.innerHeight
                _this.containerWidth = width
                _this.containerheight = height
                const roundElement = document.getElementById('round')
                roundElement.style.width = width + 'px'
                roundElement.style.height = height + 'px'

                let currentViewBox = _this.container.viewbox()
                _this.container.size(width, height)
                _this.container.viewbox(
                    0,
                    currentViewBox.y,
                    width,
                    height
                )
                _this.draw()
            }
        }, 500);
    }

    getOrientation() {
        let orientation;
        if (window.orientation === 0 || window.orientation === 180) {
            orientation = 'portrait'
        } else {
            orientation = 'landscape'
        }
        return orientation
    }

    checkOrientation() {
        const _this = this
        _.delay(() => {
            if (_this.getOrientation() === 'portrait') {
                _this.showOrientationDialog()
            } else {
                _this.hideOrientationDialog()
            }
        }, 500)
    }

    onKeypress(e) {
    }

    showOrientationDialog() {
        this.props.dispatch({ type: SET_IS_SHOWING_ORIENTATION_DIALOG, payload: { value: true } })
    }

    hideOrientationDialog() {
        this.props.dispatch({ type: SET_IS_SHOWING_ORIENTATION_DIALOG, payload: { value: false } })
    }
    onPlaybackToggle = () => {
        const { isPlaying, setIsPlaying } = this.props;
        if (isPlaying) {
            AudioEngine.stop()
            setIsPlaying(false)
        } else {
            AudioEngine.play()
            setIsPlaying(true)
        }
        this.draw()
    }

    isOverStep(initialStepGraphic, x, y) {
        const _this = this
        let isOver = false
        for (const stepGraphic of this.stepGraphics) {
            if (stepGraphic.layerId === _this.touchStartStepGraphic.layerId) {
                const step = this.getStep(stepGraphic.id);
                const rect = stepGraphic.node.getBoundingClientRect()
                if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                    isOver = true
                    const now = new Date().getTime()
                    const difference = step.lastUpdated ? (now - step.lastUpdated) : 0
                    const secondsDifference = difference / 1000
                    if (!_.isEqual(_this.isCurrentlyOverStepGraphic, stepGraphic) &&
                        (secondsDifference === 0 || secondsDifference > 0.5)) {
                        _this.isCurrentlyOverStepGraphic = stepGraphic
                        _this.onStepClick(stepGraphic)
                    }
                }
            }
        }
        if (!isOver) {
            if (!_.isNil(this.isCurrentlyOverStepGraphic) && this.isCurrentlyOverStepGraphic === initialStepGraphic && !_.isNil(_this.stepMoveTimer)) {
                // just swiped off initial step
                _this.onStepClick(initialStepGraphic)
            }
            // we've swiped off the step so cancel the modal timer
            this.clearShowStepModalTimer()
            this.isCurrentlyOverStepGraphic = null
            _this.swipeToggleActive = true
        }
    }

    renderPatternPresetsSequencer = async () => {
        const { user, round } = this.props
        this.clearPresetPatternsSequencer()
        const userHasLayer = round.layers.find(layer => layer.createdBy === user.id)
        const layerDiameter = !userHasLayer ? HTML_UI_Params.initialLayerDiameter : this.getLayerDiameter(1)
        const patternsContainerDiameter = layerDiameter - HTML_UI_Params.patternsContainerDiameterOffset

        const xOffset = (this.containerWidth / HTML_UI_Params.patternsMainContainerDivisor) - (layerDiameter / HTML_UI_Params.patternsLayerDiameterDivisor)
        const yOffset = (this.containerHeight / HTML_UI_Params.patternsMainContainerDivisor) - (layerDiameter / HTML_UI_Params.patternsLayerDiameterDivisor)
        if (!_.isNil(round) && !_.isNil(round.userPatterns) && !_.isNil(round.userPatterns[user.id])) {

            this.renderPresetPatterns({ patternsContainerDiameter, xOffset, yOffset })
            this.renderSequences();
            const tempoButton = this.container.nested().rect(HTML_UI_Params.tempoButtonWidth, HTML_UI_Params.tempoButtonHeight).radius(HTML_UI_Params.tempoButtonRadius)
            const tempoIcon = this.container.nested()

            tempoIcon.svg(`<svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.53014 4.05693L8.2715 1.8769C7.62095 0.750117 5.99458 0.750118 5.34403 1.8769L0.692891 9.93291C0.0423411 11.0597 0.855527 12.4682 2.15663 12.4682H11.4589C12.76 12.4682 13.5732 11.0597 12.9226 9.93291L12.171 8.63102V8.47966H12.0836L10.1534 5.13645L12.5612 0.966028L11.6263 0.42627L9.53014 4.05693ZM9.48765 6.28956L8.2232 8.47966H10.7521L9.48765 6.28956ZM8.86439 5.21004L6.97668 8.47966H2.86342L6.34265 2.45346C6.54937 2.09542 7.06616 2.09542 7.27288 2.45346L8.86439 5.21004ZM11.4179 9.63277H2.19767L1.69152 10.5095C1.4848 10.8675 1.74319 11.3151 2.15663 11.3151H11.4589C11.8723 11.3151 12.1307 10.8675 11.924 10.5095L11.4179 9.63277Z" fill="white" fill-opacity="0.9"/>
                </svg>`)

            const tempoButtonX = xOffset + HTML_UI_Params.tempoButtonXOffset
            const tempoButtonY = yOffset + HTML_UI_Params.tempoButtonYOffset

            const tempoIconX = xOffset + HTML_UI_Params.tempoIconXOffset
            const tempoIconY = yOffset + HTML_UI_Params.tempoIconYOffset

            const tempoButtonTextX = xOffset + HTML_UI_Params.tempoButtonTextXOffset
            const tempoButtonTextY = yOffset + HTML_UI_Params.tempoButtonTextYOffset

            tempoIcon.x(tempoIconX)
            tempoIcon.y(tempoIconY)
            tempoIcon.attr({ id: 'tempIcon' })

            tempoButton.x(tempoButtonX)
            tempoButton.y(tempoButtonY)

            tempoButton.fill('#fff').attr({ opacity: 0.1, id: 'tempo-button' })
            this.sequencerButtons.push(tempoButton)
            this.sequencerButtons.push(tempoIcon)
            const tempoButtonText = this.container.nested().plain(round.bpm)

            tempoButtonText.x(tempoButtonTextX)
            tempoButtonText.y(tempoButtonTextY)

            tempoButtonText.font({
                family: 'Arial',
                size: 11,
                weight: 900,
                opacity: 1,
            })
            tempoButtonText.fill('#fff')
            tempoButtonText.attr({ id: 'tempo-button-text' })

            this.renderPlayingSequenceIndicator({ x: xOffset, y: yOffset })
            this.renderRecordSequenceButton(xOffset, yOffset)
        }
    }

    onLoadPattern = async (id) => {
        if (!this.props.display.isRecordingSequence) {
            const pattern = _.find(this.props.round.userPatterns[this.props.user.id].patterns, { id })
            if (!_.isEmpty(pattern.state)) {
                this.setState({ selectedPattern: pattern.id })
                this.selectedPatternNeedsSaving = false

                // check if we have layers in the round not referenced in the pattern then set all steps in that layer to off
                for (const existingLayer of this.props.round.layers) {
                    if (_.isNil(_.find(pattern.state.layers, { id: existingLayer.id })) && existingLayer.createdBy === this.props.user.id) {
                        let existingLayerClone = _.cloneDeep(existingLayer)
                        for (const step of existingLayerClone.steps) {
                            step.isOn = false
                        }
                        pattern.state.layers.push(existingLayerClone)
                    }
                }

                // check we haven't deleted the layer that is referenced in the pattern
                let layersToDelete = []
                for (const layer of pattern.state.layers) {
                    const layerExists = _.find(this.props.round.layers, { id: layer.id })
                    if (_.isNil(layerExists)) {
                        layersToDelete.push(layer)
                    }
                }

                _.remove(pattern.state.layers, function (n) {
                    return layersToDelete.indexOf(n) > -1
                })

                await this.patternLayersToRound(pattern)
            }
        } else {
            let seq = _.cloneDeep(this.props.round.userPatterns[this.props.user.id].sequence)
            let firstAvailbleSlot = _.findIndex(seq, function (n) {
                return n === false
            })
            if (firstAvailbleSlot > -1) {
                seq[firstAvailbleSlot] = id
                this.props.setUserPatternSequence(this.props.user.id, seq)
                !this.isRecordingSequence && !this.isPlayingSequence && this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
            } else {
                this.props.setIsRecordingSequence(false)
            }
            if (firstAvailbleSlot === seq.length - 1) {
                this.onToggleRecordSequence()
                this.props.setIsRecordingSequence(false)
                this.props.setIsPlayingSequence(this.props.user.id, true)
            }
            /** set next available slot as current(highlighted) */
            this.props.setCurrentSequencePattern(firstAvailbleSlot)
        }
    }

    patternLayersToRound = async (pattern) => {
        // make sure layers are ordered the same
        let orderedLayers = []

        // this.props.updateLayers(pattern.state.layers)
        for (const layer of pattern.state.layers) {
            let index = _.findIndex(this.props.round.layers, { id: layer.id })
            orderedLayers[index] = layer
        }
        await this.props.updateLayers(orderedLayers)
        // now save to firebase
        for (const layer of pattern.state.layers) {
            // todo handle edge cases - eg layer been deleted
            const layerExists = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(layerExists)) {
                this.context.updateLayer(this.props.round.id, layer.id, layer)
            }
        }
    }

    onRecordSequenceClick = () => {
        if (!this.props.display.isRecordingSequence) {
            // start write
            this.props.setUserPatternSequence(this.props.user.id, getDefaultUserPatternSequence())
            this.isPlayingSequence = false
            this.props.setIsPlayingSequence(this.props.user.id, false)
            this.props.setCurrentSequencePattern(0)
        } else {
            // finish write
            const { round, setIsPlayingSequence, setCurrentSequencePattern, user } = this.props
            setCurrentSequencePattern(0)
            const isPlayingSequence = true
            this.isPlayingSequence = isPlayingSequence
            setIsPlayingSequence(user.id, isPlayingSequence)
            const newRound = { ...round }
            newRound.userPatterns[user.id].isPlayingSequence = isPlayingSequence
            this.context.saveUserPatterns(round.id, user.id, newRound.userPatterns[user.id])
            this.props.setIsPlayingSequence(this.props.user.id, true)
        }
        this.props.setIsRecordingSequence(!this.props.display.isRecordingSequence)
    }

    onSavePattern = async (id) => {
        this.setState({ selectedPattern: id })
        this.selectedPatternNeedsSaving = false
        const state = this.getCurrentState(this.props.user.id)
        this.props.saveUserPattern(this.props.user.id, id, state)
        await this.context.saveUserPatterns(this.props.round.id, this.props.user.id, this.props.round.userPatterns[this.props.user.id])
    }

    getCurrentState = (userId) => {
        /** Limit current state to current user layers **/
        const userLayers = _.filter(this.props.round.layers, { createdBy: userId })

        //const layers = this.props.round.layers
        let state = {}
        state.layers = []
        for (const layer of userLayers) {
            let stateLayer = {
                id: layer.id,
                createdBy: layer.createdBy,
                createdAt: layer.createdAt,
                steps: layer.steps,
                gain: layer.gain,
                isMuted: layer.isMuted,
                timeOffset: layer.timeOffset,
                percentOffset: layer.percentOffset
            }
            state.layers.push(stateLayer)
        }
        return state
    }

    renderPlayingSequenceIndicator = ({ x, y }) => {
        const { user } = this.props
        const sequenceSwitch = this.container.nested().rect(HTML_UI_Params.sequenceSwitchWidth, HTML_UI_Params.sequenceSwitchHeight).radius(HTML_UI_Params.sequenceButtonRadius)
        const switchLabelSubContainer = this.container.nested().circle(15)
        const switchLabel = this.container.nested().plain('A')
        const clickableSwitch = this.container.nested().rect(HTML_UI_Params.sequenceSwitchWidth, HTML_UI_Params.sequenceSwitchHeight).radius(HTML_UI_Params.sequenceButtonRadius)
        const sequence = this.props.round.userPatterns[user.id].sequence
        let dotAngle = Math.PI / HTML_UI_Params.anglePIDivisor

        switchLabel.font({
            family: 'Arial',
            size: 11,
            weight: 900,
            opacity: 1
        })
        switchLabel.fill(user.color)
        switchLabel.attr({ id: 'switch-letter' })
        this.microLayerGraphics.push(switchLabel)

        const sSwitchX = x + HTML_UI_Params.sequenceSwitchXOffset
        const sSwitchY = y + HTML_UI_Params.sequenceSwitchYOffset

        for (let i = 0; i < HTML_UI_Params.sequenceButtonDots; i++) {
            const dotSize = (2 * Math.PI) / sequence.length
            let dotDiameter = HTML_UI_Params.dotDiameter - HTML_UI_Params.sequenceSwitchDotOffset
            dotAngle += dotSize
            const switchDotsDiameter = HTML_UI_Params.sequenceButtonDiameter - HTML_UI_Params.sequenceSwitchDotsDiameterOffset
            const radius = switchDotsDiameter / 2;

            const bSX = (Math.round(radius + (radius * Math.cos(dotAngle)) - dotDiameter / 2) + sSwitchX) + HTML_UI_Params.sequenceSwitchDotsXOffset
            const bSY = (Math.round(radius + (radius * Math.sin(dotAngle)) - dotDiameter / 2) + sSwitchY) + HTML_UI_Params.sequenceSwitchDotsYOffset

            const sequenceSwitchDot = this.container.nested().circle(dotDiameter)
            sequenceSwitchDot.attr({ id: `${i}_sequence_dot`, fill: 'rgba(0,0,0,0.1)', opacity: 1 })
            sequenceSwitchDot.stroke({ color: user.color, width: 1 })
            sequenceSwitchDot.x(bSX)
            sequenceSwitchDot.y(bSY)
            this.microLayerGraphics.push(sequenceSwitchDot)
        }

        sequenceSwitch.stroke({ width: 0.3, color: user.color })
        sequenceSwitch.fill({
            color: '#000',
            opacity: 0.001
        })
        sequenceSwitch.attr({
            id: 'sequence-switch',
            cursor: 'pointer'
        })
        sequenceSwitch.x(sSwitchX)
        sequenceSwitch.y(sSwitchY)
        this.setIsPlayingSequenceGraphic({ x, y })
        switchLabelSubContainer.attr({
            id: 'switch-letter-subcontainer'
        })
        switchLabelSubContainer.fill('none')
        switchLabelSubContainer.stroke({ color: user.color, width: 0.5 })
        const switchLabelSubContainerX = x + HTML_UI_Params.sequenceSwitchLabelSubContainerXOffset
        const switchLabelSubContainerY = y + HTML_UI_Params.sequenceSwitchLabelSubContainerYOffset
        const switchLabelX = x + HTML_UI_Params.sequenceSwitchLabelXOffset
        const switchLabelY = y + HTML_UI_Params.sequenceSwitchLabelYOffset
        switchLabelSubContainer.x(switchLabelSubContainerX)
        switchLabelSubContainer.y(switchLabelSubContainerY)
        switchLabel.x(switchLabelX)
        switchLabel.y(switchLabelY)

        /** clickable button */
        clickableSwitch.fill({
            color: '#000',
            opacity: 0.001
        })
        clickableSwitch.attr({
            id: 'clickable-switch',
            cursor: 'pointer'
        })
        clickableSwitch.on('click', this.toggleIsPlayingSequence)
        clickableSwitch.x(sSwitchX)
        clickableSwitch.y(sSwitchY)
        this.microLayerGraphics.push(sequenceSwitch)
        this.microLayerGraphics.push(clickableSwitch)
        this.microLayerGraphics.push(switchLabel)
        this.microLayerGraphics.push(switchLabelSubContainer)
    }

    toggleIsPlayingSequence = () => {
        const { round, setIsPlayingSequence, setCurrentSequencePattern, user } = this.props
        setCurrentSequencePattern(0)
        const isPlayingSequence = !this.isPlayingSequence
        setIsPlayingSequence(user.id, isPlayingSequence)
        const newRound = { ...round }
        newRound.userPatterns[user.id].isPlayingSequence = isPlayingSequence
        this.context.saveUserPatterns(round.id, user.id, newRound.userPatterns[user.id])
        this.isPlayingSequence = isPlayingSequence
    }

    setIsPlayingSequenceGraphic = ({ x, y }) => {
        const { user, round } = this.props
        const isPlayingSequence = round.userPatterns[this.props.user.id].isPlayingSequence
        const switchLabelContainer = this.container.nested().circle(HTML_UI_Params.sequenceSwitchLabelContainerSize)
        let switchLabelContainerX = x + HTML_UI_Params.sequenceSwitchLabelContainerOffXOffset
        let switchLabelContainerY = y + HTML_UI_Params.sequenceSwitchLabelContainerYOffset

        if (isPlayingSequence) {
            switchLabelContainerX = x + HTML_UI_Params.sequenceSwitchLabelContainerONXOffset
        }

        switchLabelContainer.x(switchLabelContainerX)
        switchLabelContainer.y(switchLabelContainerY)
        switchLabelContainer.fill(user.color)
        switchLabelContainer.attr({
            id: 'switch-letter-container',
            opacity: 0.2
        })
    }

    renderPresetPatterns = async ({ patternsContainerDiameter, xOffset, yOffset }) => {
        const { round, user } = this.props
        const patterns = round.userPatterns[user.id].patterns
        let angle = Math.PI / HTML_UI_Params.anglePIDivisor
        let i = 0
        for (const pattern of patterns) {
            const { state: { layers }, id } = pattern
            const patternSize = (2 * Math.PI) / patterns.length
            let patternDiameter = HTML_UI_Params.stepDiameter
            const isSelected = id === this.activePatternId
            const opacity = isSelected ? 1 : 0.2
            angle += patternSize
            const letter = PRESET_LETTERS[pattern.order]
            const radius = patternsContainerDiameter / 2;

            const x = (Math.round(patternsContainerDiameter / 2 + radius * Math.cos(angle) - patternDiameter / 2) + xOffset)
            const y = (Math.round(patternsContainerDiameter / 2 + radius * Math.sin(angle) - patternDiameter / 2) + yOffset)

            const currentPatternGraphic = this.container.nested().circle(patternDiameter)
            const label = this.container.nested().plain(letter).attr({ cursor: 'pointer' })
            label.font({
                family: 'Arial',
                size: 25,
                weight: 900,
                opacity: isSelected ? 1 : 0.6
            })
            const labelX = x + HTML_UI_Params.presetLabelXOffset
            const labelY = y + HTML_UI_Params.presetLabelYOffset
            label.fill({ color: user.color })
            label.attr({ id: `${i}_pattern_label` })
            label.x(labelX)
            label.y(labelY)

            currentPatternGraphic.attr({ id: `${i}_pattern`, fill: 'none', opacity: isSelected ? 0.3 : 0.15, cursor: 'pointer' })
            currentPatternGraphic.stroke({ color: user.color, width: 18 })
            currentPatternGraphic.fill('none')
            currentPatternGraphic.x(x)
            currentPatternGraphic.y(y)
            this.microPatternGraphics.push(currentPatternGraphic)
            this.microLayerGraphics.push(label)

            if (isSelected) {
                const patternOutline = this.container.nested().circle(patternDiameter + HTML_UI_Params.presetPatternOulineDiameterOffset)
                patternOutline.stroke({
                    color: user.color, width: 2
                }).fill('none').opacity(1)
                const patternOutlineX = x - HTML_UI_Params.presetPatternOutlineXOffset
                const PatternOutlineY = y - HTML_UI_Params.presetPatternOutlineYOffset
                patternOutline.x(patternOutlineX)
                patternOutline.y(PatternOutlineY)
                patternOutline.attr({ id: `${i}-pattern-outline` })
                this.microLayerGraphics.push(patternOutline)
            }
            if (layers && layers.length > 0) {
                this.renderMicroRound({ x: x + 1.5, y: y + 1.5, pattern: currentPatternGraphic, isFilled: isSelected, layers, opacity })
            }
            const clickableButtonDiameter = patternDiameter + HTML_UI_Params.presetClickableButtonDiameterOffset
            const clickableButton = this.container.nested().circle(clickableButtonDiameter)
            clickableButton.fill({ color: '#000', opacity: 0.001 })
            clickableButton.attr({ cursor: 'pointer', id: `${i}_pattern_clickable_button` })
            const clickableButtonX = x - HTML_UI_Params.presetClickableButtonXOffset
            const clickableButtonY = y - HTML_UI_Params.presetClickableButtonYoffset
            clickableButton.x(clickableButtonX)
            clickableButton.y(clickableButtonY)
            this.microLayerGraphics.push(clickableButton)
            clickableButton.on('click', async () => {
                const { round, isPlaying } = this.props
                const patterns = round.userPatterns[user.id].patterns
                if (this.isPlayingSequence && isPlaying) return
                if (!this.isRecordingSequence) {
                    this.activePatternId = id
                    const pattern = _.find(patterns, { id })
                    const patternLayers = pattern.state.layers
                    if (!patternLayers) {
                        pattern.state.layers = []
                        /** clear out steps from existing layers */
                        for (const existingLayer of round.layers) {
                            let existingLayerClone = _.cloneDeep(existingLayer)
                            for (const step of existingLayerClone.steps) {
                                step.isOn = false
                            }
                            pattern.state.layers.push(existingLayerClone)
                        }
                        this.props.dispatch({ type: UPDATE_LAYERS, payload: { layers: pattern.state.layers } })
                        await this.onSavePattern(id)
                    }

                    if (patternLayers) {
                        this.onLoadPattern(id)
                    }
                    AudioEngine.recalculateParts(this.props.round)
                    this.draw()
                }
                if (layers && layers.length > 0 && this.isRecordingSequence) {
                    this.activePatternId = id
                    this.onLoadPattern(id)
                    this.draw()
                }
            })
            i++
        }
    }

    renderSequences = async () => {
        const { round, user } = this.props
        const sequence = round.userPatterns[this.props.user.id].sequence
        const userHasLayer = round.layers.find(layer => layer.createdBy === user.id)
        const layerDiameter = !userHasLayer ? HTML_UI_Params.initialLayerDiameter : this.getLayerDiameter(1)
        const sequenceContainerDiameter = layerDiameter - HTML_UI_Params.sequenceContainerDiameterOffset
        const xOffset = (this.containerWidth / 2) - (layerDiameter / HTML_UI_Params.patternsLayerDiameterDivisor)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / HTML_UI_Params.patternsLayerDiameterDivisor)

        let sAngle = Math.PI / HTML_UI_Params.anglePIDivisor
        let i = 0
        for (const id of sequence) {
            const isFilled = id
            const patterns = round.userPatterns[this.props.user.id].patterns
            const pattern = patterns.find(pattern => pattern.id === id);
            const isHighlighted = i === this.props.display.currentSequencePattern
            const opacity = isHighlighted ? 1 : 0.2

            const sequenceSize = (2 * Math.PI) / sequence.length
            let sequenceDiameter = HTML_UI_Params.stepDiameter - HTML_UI_Params.sequenceDiameterOffset
            sAngle += sequenceSize
            const radius = sequenceContainerDiameter / 2;

            const sX = (Math.round(radius + (radius * Math.cos(sAngle)) - sequenceDiameter / HTML_UI_Params.patternsMainContainerDivisor) + xOffset) + HTML_UI_Params.sequencePatternXOffset
            const sY = (Math.round(radius + (radius * Math.sin(sAngle)) - sequenceDiameter / HTML_UI_Params.patternsMainContainerDivisor) + yOffset) + HTML_UI_Params.sequencePatternYOffset

            const sequencePattern = this.container.nested().circle(sequenceDiameter)

            if (pattern) {
                const letter = PRESET_LETTERS[pattern.order]
                const label = this.container.nested().plain(letter).attr({ cursor: 'pointer' })
                label.font({
                    family: 'Arial',
                    size: 10,
                    weight: 900,
                    opacity: 1
                })
                const labelX = sX + HTML_UI_Params.sequenceLabelXOffset
                const labelY = sY + HTML_UI_Params.sequenceLabelYOffset
                label.fill({ color: user.color })
                label.x(labelX)
                label.y(labelY)
            }

            if (isFilled) {
                const sequenceBackgroundDiameter = sequenceDiameter - HTML_UI_Params.sequenceBackgroundDiameterOffset
                const sequenceBackground = this.container.nested().circle(sequenceBackgroundDiameter)
                sequenceBackground.attr({ id: `${i}_sequence_bg` })
                sequenceBackground.stroke({ color: user.color, width: HTML_UI_Params.sequenceBackgroundWidth, opacity: isHighlighted && pattern ? 0.3 : 0.1 })
                sequenceBackground.fill({
                    color: 'rgba(0,0,0,0.01)'
                })
                const sequencBackgroundX = sX + HTML_UI_Params.sequenceBackgroundXOffset
                const sequencBackgroundY = sY + HTML_UI_Params.sequenceBackgroundYOffset
                sequenceBackground.x(sequencBackgroundX)
                sequenceBackground.y(sequencBackgroundY)
            }
            sequencePattern.attr({ id: `${i}_sequence_pattern` })
            sequencePattern.stroke({ color: user.color, width: 1, opacity: isHighlighted || this.isRecordingSequence ? 1 : 0.2 })
            sequencePattern.fill('none')
            sequencePattern.x(sX)
            sequencePattern.y(sY)
            const layers = pattern && pattern.state && [...pattern.state.layers]

            if (layers) {
                this.renderMicroRound({
                    x: sX + HTML_UI_Params.patternsLayerDiameterDivisor,
                    y: sY + HTML_UI_Params.patternsLayerDiameterDivisor,
                    pattern: sequencePattern,
                    layers,
                    opacity,
                    isFilled: isHighlighted,
                    diameter: sequenceDiameter
                })
            }
            this.sequenceGraphics.push(sequencePattern)
            i++
        }
    }

    renderRecordSequenceButton = (xOffset, yOffset) => {
        const { round, user } = this.props
        const sequence = round.userPatterns[user.id].sequence
        let dotAngle = Math.PI / HTML_UI_Params.anglePIDivisor

        const sButtonX = xOffset + HTML_UI_Params.sequenceButtonXOffset
        const sButtonY = yOffset + HTML_UI_Params.sequenceButtonYOffset

        if (!this.isRecordingSequence) {
            const sequenceButton = this.container.nested().rect(HTML_UI_Params.sequenceButtonWidth, HTML_UI_Params.sequenceButtonHeight).radius(HTML_UI_Params.sequenceButtonRadius)
            sequenceButton.attr({ id: 'sequence-button', fill: user.color, opacity: 0.2 })
            sequenceButton.x(sButtonX)
            sequenceButton.y(sButtonY)
            for (let i = 0; i < HTML_UI_Params.sequenceButtonDots; i++) {
                const dotSize = (2 * Math.PI) / sequence.length
                let dotDiameter = HTML_UI_Params.dotDiameter
                dotAngle += dotSize
                const radius = HTML_UI_Params.sequenceButtonDiameter / 2;

                const bSX = (Math.round(radius + (radius * Math.cos(dotAngle)) - dotDiameter / 2) + sButtonX) + HTML_UI_Params.dotXOffset
                const bSY = (Math.round(radius + (radius * Math.sin(dotAngle)) - dotDiameter / 2) + sButtonY) + HTML_UI_Params.dotYOffset

                const sequenceButtonDots = this.container.nested().circle(dotDiameter)
                sequenceButtonDots.attr({ id: `${i}-sbuttonDot`, fill: 'rgba(0,0,0,0.1)', opacity: 1 })
                sequenceButtonDots.stroke({ color: user.color, width: 1 })
                sequenceButtonDots.x(bSX)
                sequenceButtonDots.y(bSY)
                this.microLayerGraphics.push(sequenceButtonDots)
            }
            const sequenceText = this.container.nested().plain('Sequence').font({
                family: 'Arial',
                size: 11,
                weight: 900,
                opacity: 1
            })
            sequenceText.attr({ id: 'sequence-text', cursor: 'pointer' })
            sequenceText.fill(user.color)
            const sTextX = xOffset + HTML_UI_Params.sequenceTextXOffset
            const sTextY = yOffset + HTML_UI_Params.sequenceTextYOffset
            sequenceText.x(sTextX)
            sequenceText.y(sTextY)
            const clickableSequenceButton = this.container.nested().rect(HTML_UI_Params.sequenceButtonWidth, HTML_UI_Params.sequenceButtonHeight).radius(HTML_UI_Params.sequenceButtonRadius)
            clickableSequenceButton.on('click', this.onToggleRecordSequence)
            clickableSequenceButton.attr({ id: 'sequence-cickable-button', fill: '#000', opacity: 0.00001, cursor: 'pointer' })
            clickableSequenceButton.x(sButtonX)
            clickableSequenceButton.y(sButtonY)
            this.microLayerGraphics.push(sequenceButton)
            this.microLayerGraphics.push(sequenceText)
            this.microLayerGraphics.push(clickableSequenceButton)
        }

        if (this.isRecordingSequence) {
            const sStopIconX = xOffset + HTML_UI_Params.stopSequenceIconXOffset
            const sStopIconY = yOffset + HTML_UI_Params.stopSequenceIconYOffset
            const sStopButtonX = xOffset + HTML_UI_Params.stopSequenceButtonXOffset
            const sStopButtonY = yOffset + HTML_UI_Params.stopSequenceButtonYOffset
            const sequenceButton = this.container.nested().rect(HTML_UI_Params.stopSequenceButtonWidth, HTML_UI_Params.stopSequenceButtonHeight).radius(HTML_UI_Params.sequenceButtonRadius)
            sequenceButton.attr({ id: 'sequence-button', fill: user.color, opacity: 0.2 })
            sequenceButton.x(sStopButtonX)
            sequenceButton.y(sStopButtonY)
            const sequenceStop = this.container.nested().svg(`<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" transform="scale(2)">
                                                                <path d="M2.05155 0.35199C1.58223 -0.11733 0.82131 -0.11733 0.35199 0.35199C-0.11733 0.82131 -0.117329 1.58223 0.351991 2.05155L6.30044 8L0.35199 13.9485C-0.11733 14.4178 -0.11733 15.1787 0.35199 15.648C0.82131 16.1173 1.58223 16.1173 2.05155 15.648L8 9.69956L13.9485 15.648C14.4178 16.1173 15.1787 16.1173 15.648 15.648C16.1173 15.1787 16.1173 14.4178 15.648 13.9485L9.69956 8L15.648 2.05155C16.1173 1.58223 16.1173 0.82131 15.648 0.35199C15.1787 -0.11733 14.4178 -0.11733 13.9485 0.351991L8 6.30044L2.05155 0.35199Z" />
                                                            </svg>`)
            sequenceStop.attr({ id: 'sequence-stop', fill: user.color, opacity: 1 })
            sequenceStop.stroke({ color: user.color, width: 1 })
            sequenceStop.x(sStopIconX)
            sequenceStop.y(sStopIconY)
            const sequenceText = this.container.nested().plain('Stop').font({
                family: 'Arial',
                size: 11,
                weight: 900,
                opacity: 1
            })
            sequenceText.attr({ id: 'sequence-text', cursor: 'pointer' })
            sequenceText.fill(user.color)
            const sTextX = xOffset + HTML_UI_Params.stopSequenceTextXOffset
            const sTextY = yOffset + HTML_UI_Params.stopSequenceTextYOffset
            sequenceText.x(sTextX)
            sequenceText.y(sTextY)
            const clickableSequenceButton = this.container.nested().rect(HTML_UI_Params.stopSequenceButtonWidth, HTML_UI_Params.stopSequenceButtonHeight).radius(HTML_UI_Params.sequenceButtonRadius)
            clickableSequenceButton.on('click', this.onToggleRecordSequence)
            clickableSequenceButton.attr({ id: 'sequence-button', fill: '#000', opacity: 0.00001, cursor: 'pointer' })
            clickableSequenceButton.x(sStopButtonX)
            clickableSequenceButton.y(sStopButtonY)
            this.microLayerGraphics.push(sequenceText)
            this.microLayerGraphics.push(sequenceButton)
            this.microLayerGraphics.push(sequenceStop)
            this.microLayerGraphics.push(clickableSequenceButton)
        }
    }

    onToggleRecordSequence = () => {
        const { isPlaying } = this.props
        if (isPlaying)
            this.onPlaybackToggle()
        this.isRecordingSequence = !this.isRecordingSequence
        this.onRecordSequenceClick()
        this.renderPatternPresetsSequencer()
    }

    clearPresetPatternsSequencer = () => {
        for (let graphic of this.microPatternGraphics) {
            graphic.clear()
        }
        for (let graphic of this.sequenceGraphics) {
            graphic.clear()
        }
        this.clearPresetGraphics()
    }

    clearPresetGraphics = () => {
        for (let graphic of this.microStepGraphics) {
            graphic.clear()
        }
        for (let graphic of this.microLayerGraphics) {
            graphic.clear()
        }
        for (let graphic of this.sequencerButtons) {
            graphic.clear()
        }
    }

    getMicroLayerDiameter(order, dm) {
        let diameter = dm ? 3 + (HTML_UI_Params.initialMicro2LayerPadding * 1.4) : 5 + (HTML_UI_Params.initialMicroLayerPadding * 1.4)
        const stepDiameter = dm ? HTML_UI_Params.micro2StepDiameter : HTML_UI_Params.microStepDiameter
        for (let i = 0; i < order; i++) {
            diameter += stepDiameter + HTML_UI_Params.microLayerPadding
        }
        return diameter
    }

    addMicroLayer = async (layer, order, { containerXOffset, containerYOffset, diameter, isFilled }) => {
        const { user } = this.props
        const layerDiameter = this.getMicroLayerDiameter(order, diameter)
        const xOffset = containerXOffset + 6 - (order * (diameter ? HTML_UI_Params.micro2LayerOffsetMultiplier : HTML_UI_Params.microLayerOffsetMultiplier))
        const yOffset = containerYOffset + 6 - (order * (diameter ? HTML_UI_Params.micro2LayerOffsetMultiplier : HTML_UI_Params.microLayerOffsetMultiplier))
        const layerStrokeSize = diameter ? HTML_UI_Params.micro2LayerStrokeMax : HTML_UI_Params.microLayerStrokeMax
        const layerGraphic =
            this.container.circle(layerDiameter).fill('none')
                .stroke({ color: user.color, width: layerStrokeSize, opacity: 0.00001 })
        layerGraphic.x(xOffset)
        layerGraphic.y(yOffset)
        layerGraphic.id = layer.id
        layerGraphic.order = order
        layerGraphic.isAllowedInteraction = false
        this.microLayerGraphics.push(layerGraphic)

        // draw steps
        const stepSize = (2 * Math.PI) / layer.steps.length;
        let stepDiameter = HTML_UI_Params.microStepDiameter / HTML_UI_Params.otherUserLayerSizeDivisor
        const radius = layerDiameter / 2
        let angle = Math.PI / -2
        const anglePercentOffset = this.ticksToRadians(this.ticksPerStep(layer.steps.length) * (layer.percentOffset / 100))
        const angleTimeOffset = this.ticksToRadians(this.msToTicks(layer.timeOffset))
        angle += anglePercentOffset
        angle += angleTimeOffset
        layerGraphic.firstStep = null
        await layer.steps.map((step, i) => {
            const { id } = step
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - stepDiameter / 2) + yOffset;
            const stepGraphic = this.container.circle(stepDiameter)
            stepGraphic.stroke('none')
            stepGraphic.fill({ color: step.isOn ? user.color : 'rgba(0,0,0,0)', opacity: isFilled ? 1 : 0.5 })
            stepGraphic.attr({ id: `micro-step-${id}` })
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.layerId = layer.id
            stepGraphic.id = step.id
            stepGraphic.isAllowedInteraction = false
            stepGraphic.userColor = user.color
            this.microStepGraphics.push(stepGraphic)
            if (_.isNil(layerGraphic.firstStep)) {
                layerGraphic.firstStep = stepGraphic
            }
            return null
        })
        layerGraphic.labelYOffset = 32 * (anglePercentOffset + angleTimeOffset)
    }

    renderMicroRound = async ({ x, y, pattern, layers, isFilled, diameter }) => {
        if (this.activePattern === pattern) return
        const sortedLayers = await this.orderAndReturnLayers(layers)
        sortedLayers && sortedLayers.map(async (layer, i) => {
            return await this.addMicroLayer(layer, i++, { containerXOffset: x, containerYOffset: y, diameter, isFilled })
        })
        this.activePattern = pattern
    }

    render() {
        return (
            <div className="round" id="round"></div>
        )
    }
}
PlayUI.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId) && !_.isNil(state.round) && !_.isNil(state.round.layers)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        users: state.users,
        display: state.display,
        selectedLayer,
        isPlaying: !_.isNil(state.round) && state.round.isPlaying ? true : false,
        selectedLayerId: state.display.selectedLayerId,
        disableKeyListener: state.display.disableKeyListener
    };
}

const mapDispatchToProps = dispatch => ({
    setIsPlaying: val => dispatch(setIsPlaying(val)),
    setIsRecordingSequence: val => dispatch(setIsRecordingSequence(val)),
    setUserPatternSequence: (userId, data) => dispatch(setUserPatternSequence(userId, data)),
    updateLayers: (layers) => dispatch(updateLayers(layers)),
    setIsPlayingSequence: (userId, val) => dispatch(setIsPlayingSequence(userId, val)),
    saveUserPattern: (userId, patternId, data) => dispatch(saveUserPattern(userId, patternId, data)),
    setCurrentSequencePattern: val => dispatch(setCurrentSequencePattern(val)),
    dispatch
})


export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(PlayUI));
