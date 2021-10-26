import React, { Component } from 'react';
import _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import { HTML_UI_Params, PRESET_LETTERS } from '../../utils/constants'
import { connect } from "react-redux";
import AudioEngine from '../../audio-engine/AudioEngine'
import { getDefaultLayerData } from '../../utils/defaultData';
import { SET_LAYER_MUTE, TOGGLE_STEP, ADD_LAYER, SET_SELECTED_LAYER_ID, SET_IS_SHOWING_LAYER_SETTINGS, SET_IS_PLAYING, UPDATE_STEP, SET_IS_SHOWING_ORIENTATION_DIALOG, UPDATE_LAYERS, SET_CURRENT_SEQUENCE_PATTERN } from '../../redux/actionTypes'
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
        // register this component with parent so we can do some instant updates bypassing redux for speed
        this.props.childRef(this)
        this.isPlayingSequence = round.userPatterns[user.id].isPlayingSequence
        window.addEventListener('click', this.interfaceClicked)
        window.addEventListener('resize', this.onWindowResizeThrottled)
        window.addEventListener('keypress', this.onKeypress)
        window.addEventListener('dblclick', () => this.onMuteToggle(this.props))
        this.addBackgroundEventListeners()
        this.checkOrientation()
        // load sequence if enabled
        const patterns = round.userPatterns
        this.loadSequence(patterns)
        this.setDefaultPattern()
        await this.createRound()
    }

    async componentWillUnmount() {
        window.removeEventListener('resize', this.onWindowResizeThrottled)
        window.removeEventListener('keypress', this.onKeypress)
        window.removeEventListener('dblclick', this.onMuteToggle)
        this.removeBackgroundEventListeners()
        this.clear()
        this.disposeToneEvents()
    }

    createRound() {
        //  console.log('createRound()');
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

    async componentDidUpdate() {
        console.log('componentDidUpdate()', this.round, this.props.round)
        console.time('componentDidUpdate')

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

        // add layer
        if (!_.isNil(diff.added.layers)) {
            for (let [, layer] of Object.entries(diff.added.layers)) {
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

    onMuteToggle(props) {
        const isMuted = !props.selectedLayer.isMuted
        AudioEngine.tracksById[props.selectedLayer.id].setMute(isMuted)
        props.dispatch({ type: SET_LAYER_MUTE, payload: { id: props.selectedLayer.id, value: isMuted, user: props.user.id } })
        this.context.updateLayer(props.round.id, props.selectedLayer.id, { isMuted })
    }

    getStep(id) {
        let steps = []
        for (let layer of this.round.layers) {
            steps.push(...layer.steps)
        }
        return _.find(steps, { id })
    }

    draw(shouldAnimate) {
        // console.log('draw()', this.containerWidth, this.containerheight);
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
        console.log('calculating seq', userPatterns);
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

    loadPatternPriority(userId, id, order) {
        // console.log('load pattern', id);
        // console.time('loadPatternPriority')
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
        // console.log('load pattern', id);
        // console.time('loadPattern')
        // this.props.dispatch({ type: SET_CURRENT_SEQUENCE_PATTERN, payload: { value: order } })
        // const pattern = _.find(this.props.round.userPatterns[userId].patterns, { id })
        /*if (!_.isEmpty(pattern.state)) {
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
            //this.props.updateLayers(pattern.state.layers)

            //    console.log('loadPattern updating internal layers', this.round.layers, pattern.state.layers);

            // for (let layer of this.round.layers) {
            //   layer.steps = _.find(pattern.state.layers, { id: layer.id }).steps
            // }

            //AudioEngine.recalculateParts(this.round)
            // console.timeEnd('loadPattern')

            this.props.dispatch({ type: UPDATE_LAYERS, payload: { layers: pattern.state.layers } })
            this.props.dispatch({ type: SET_CURRENT_SEQUENCE_PATTERN, payload: { value: order } })
        }*/


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
        // console.log('addLayer', layer);
        // let animateTime = shouldAnimate ? 600 : 0

        //const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (order + 1))
        const layerDiameter = this.getLayerDiameter(order)
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        let layerStrokeSize = HTML_UI_Params.layerStrokeMax / HTML_UI_Params.otherUserLayerSizeDivisor
        if (layer.createdBy === this.props.user.id) {
            layerStrokeSize = HTML_UI_Params.layerStrokeMax
        }
        const layerGraphic = this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' }).stroke({ color: layer.isMuted ? 'rgba(255,255,255,0.2)' : this.userColors[layer.createdBy], width: layerStrokeSize + 'px', opacity: 0 })
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
            stepGraphic.stroke({ color: this.userColors[layer.createdBy], width: stepStrokeWidth + 'px', opacity: 0 })
            //stepGraphic.animate(animateTime).stroke({ opacity: 1 })
            stepGraphic.stroke({ opacity: 1 })
            layer.isMuted && stepGraphic.stroke({ color: 'rgba(255,255,255,0.1)' })
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
        console.log('this.props.round.layers', this.props.round.layers);
        let diameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding
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
        //  console.log('updateStep', step);
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
        for (const layer of this.round.layers) {
            this.adjustLayerOffset(layer.id, layer.percentOffset, layer.timeOffset, order)
            order++
        }
    }

    adjustLayerOffset(id, percentOffset, timeOffset) {
        // console.log('adjustLayerTimeOffset', layer., percent, this.stepGraphics);
        const layer = _.find(this.round.layers, { id })
        let stepGraphics = _.filter(this.stepGraphics, { layerId: id })
        const layerGraphic = _.find(this.layerGraphics, { id })
        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (layerGraphic.order))
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
        // console.log('addStepEventListeners');
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
        //console.log('removeStepEventListeners()');
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
        // console.log('hideStepModal()');
        this.stepModal.hide()
        this.container.off('mousemove')
    }

    clearShowStepModalTimer() {
        // console.log('clearShowStepModalTimer', this.stepMoveTimer);
        clearTimeout(this.stepMoveTimer)
        this.stepMoveTimer = null
    }

    addStepSwipeListeners(originalStepGraphic) {
        // console.log('addStepSwipeListeners', this);
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

    saveLayer(id) {
        this.context.updateLayer(this.round.id, id, _.find(this.round.layers, { id }))
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
        //  console.log('updateStepModal', stepGraphic.probability, stepGraphic.velocity);
        //this.stepModalText.text('Velocity: ' + _.round(stepGraphic.velocity, 1) + '\nProbability: ' + _.round(stepGraphic.probability, 1))
        this.stepModal.x(stepGraphic.x() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModal.y(stepGraphic.y() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModalThumb.x(stepGraphic.probability * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
        this.stepModalThumb.y((1 - stepGraphic.velocity) * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
    }

    onStepClick(stepGraphic) {
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

    onAddLayerClick() {
        const newLayer = getDefaultLayerData(this.props.user.id);
        newLayer.name = 'Layer ' + (this.props.round.layers.length + 1)
        this.props.dispatch({ type: ADD_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
        this.highlightNewLayer = newLayer.id
        this.selectedLayerId = newLayer.id
        this.context.createLayer(this.round.id, newLayer)
    }

    addEventListeners() {
        //const element = document.getElementById('round')
        //const hammertime = new Hammer(element, {});
        //hammertime.get('pinch').set({ enable: true });
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
        if (e.key === KEY_MAPPINGS.playToggle && !this.props.disableKeyListener) {
            if (this.props.round.isPlaying) {
                AudioEngine.stop()
                this.context.updateRound(this.round.id, { isPlaying: false })
                this.props.dispatch({ type: SET_IS_PLAYING, payload: { value: false } })
            } else {
                AudioEngine.play()
                this.context.updateRound(this.round.id, { isPlaying: true })
                this.props.dispatch({ type: SET_IS_PLAYING, payload: { value: true } })
            }
        }
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
        //  console.log('checking is over step', x, y);
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

    render() {
        //console.log('HTML UI render()');
        return (
            <div className="round" id="round"></div>
        )
    }
}
PlayUI.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId) && !_.isNil(state.round) && !_.isNil(state.round.layers)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        users: state.users,
        selectedLayer,
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
