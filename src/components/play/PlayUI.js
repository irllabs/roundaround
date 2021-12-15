import React, { Component } from 'react';
import _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import { HTML_UI_Params } from '../../utils/constants'
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
import { detailedDiff } from 'deep-object-diff';
const styles = theme => ({
    button: {
        cursor: 'pointer'
    },
    buttonIcon: {
        pointerEvents: 'none'
    }
})

class PlayUI extends Component {
    static contextType = FirebaseContext
    constructor(props) {
        super(props)
        this.isZooming = false
        this.isPanning = false
        this.stepGraphics = []
        this.layerGraphics = []
        this.round = null; // local copy of round, prevent mutating store.
        this.isOn = false
        this.editAllLayers = false
        this.swipeToggleActive = false
        this.userColors = {};
        this.isScrolling = false;
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
        await this.createRound()
        window.addEventListener('click', this.interfaceClicked)
        window.addEventListener('resize', this.onWindowResizeThrottled)
        window.addEventListener('keypress', this.onKeypress)
        window.addEventListener('dblclick', () => this.onMuteToggle(this.props))
        this.addBackgroundEventListeners()
        this.checkOrientation()
    }

    async componentWillUnmount() {
        window.removeEventListener('click', this.interfaceClicked)
        window.removeEventListener('resize', this.onWindowResizeThrottled)
        window.removeEventListener('keypress', this.onKeypress)
        window.removeEventListener('dblclick', this.onMuteToggle)
        this.removeBackgroundEventListeners()
        this.clear()
        this.disposeToneEvents()
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
            //  console.log('round panning');
            if (this.stepIsPanning) {
                e.preventDefault()
            }
        })
        this.container.viewbox(0, 0, this.containerWidth, this.containerHeight)
        this.draw()
    }

    async componentDidUpdate(prevProps) {

        if (this.props.round && this.props.selectedLayerId) {
            if (prevProps.selectedLayerId !== this.props.selectedLayerId) {
                this.onLayerClicked(this.props.selectedLayerId)
            }
        }
        // whole round has changed
        if (this.round.id !== this.props.round.id) {
            this.round = _.cloneDeep(this.props.round)
            AudioEngine.load(this.props.round)
            this.draw()
            return
        }

        let diff = detailedDiff(this.round, this.props.round)

        let redraw = false
        let shouldRecalculateParts = false
        const _this = this

        // remove layer
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (_.isNil(newLayer)) {
                AudioEngine.removeTrack(layer.id)
                redraw = true
            }
        }

        // sequence update
        if (!_.isNil(diff.updated.userPatterns)) {
            for (let [userPatternsId, userPatterns] of Object.entries(diff.updated.userPatterns)) {
                if (!_.isNil(userPatterns.isPlayingSequence)) {
                    if (userPatterns.isPlayingSequence) {
                        console.log('isPlayingSequence turned on', userPatterns, this.props.round.userPatterns[userPatternsId]);
                        const newUserPatterns = this.props.round.userPatterns[userPatternsId]
                        this.startSequence(newUserPatterns)
                    } else {
                        console.log('isPlayingSequence turned off');
                        this.stopSequence(userPatternsId)
                    }
                }
            }
        }

        // step updates
        if (!_.isNil(diff.updated.layers)) {
            shouldRecalculateParts = true
            redraw = true
        }

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
                await AudioEngine.createTrack(layer)
                redraw = true
            }
        }

        // Check for layer type or instrument changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.instrument, newLayer.instrument)) {
                // instrument has changed
                // console.log('instrument has changed', newLayer.instrument);
                AudioEngine.tracksById[newLayer.id].setInstrument(newLayer.instrument)
                this.updateLayerLabelText(layer.id, newLayer.instrument.sampler)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.type, newLayer.type)) {
                // type has changed
                //console.log('layer type has changed');
                AudioEngine.tracksById[newLayer.id].setType(newLayer.type, newLayer.automationFxId)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.automationFxId, newLayer.automationFxId)) {
                // automation has changed
                //  console.log('layer automation fx id has changed');
                AudioEngine.tracksById[newLayer.id].setAutomatedFx(newLayer.automationFxId)
            }
        }
        // Check for gain changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.gain, newLayer.gain)) {
                //  console.log('gain has changed', newLayer.gain)
                AudioEngine.tracksById[newLayer.id].setVolume(newLayer.gain)
            }
        }

        // Check for mute changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.isMuted, newLayer.isMuted)) {
                //  console.log('mute has changed', newLayer.isMuted)
                AudioEngine.tracksById[newLayer.id].setMute(newLayer.isMuted)
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
        } else {
            this.round = _.cloneDeep(this.props.round)
        }

        console.timeEnd('componentDidUpdate')
        /*
    
            if (this.round.id !== this.props.round.id) {
                // whole round has changed
                this.round = _.cloneDeep(this.props.round)
                AudioEngine.load(this.props.round)
                this.draw()
                return
            }
    
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
    
            // Edit all interactions changed
            if (this.editAllLayers !== this.props.editAllLayers) {
                this.editAllLayers = this.props.editAllLayers
                this.removeAllStepEventListeners()
                for (let layerGraphic of this.layerGraphics) {
                    if (this.editAllLayers) {
                        layerGraphic.isAllowedInteraction = true
                    } else {
                        //  console.log('layer', _.find(this.props.round.layers, { id: layerGraphic.id }));
                        const layer = _.find(this.props.round.layers, { id: layerGraphic.id })
                        if (!_.isNil(layer)) {
                            layerGraphic.isAllowedInteraction = layer.createdBy === this.props.user.id
                        }
                    }
                    this.addLayerEventListeners(layerGraphic)
                }
                for (let stepGraphic of this.stepGraphics) {
                    if (this.editAllLayers) {
                        stepGraphic.isAllowedInteraction = true
                    } else {
                        stepGraphic.isAllowedInteraction = this.stepLayerDictionary[stepGraphic.id].createdBy === this.props.user.id
                    }
                    this.addStepEventListeners(stepGraphic)
                }
            }
    
            if (!this.isOn && this.props.isOn && !_.isNil(this.positionLine)) {
                //console.log('playing timeline');
                // adding 200ms delay to compensate for starting audio with delay to reduce audio glitches. Todo: sync this better with the transport
                _.delay(() => {
                    this.positionLine.timeline().play()
                    this.isOn = true
                }, 200)
            } else if (this.isOn && !this.props.isOn && !_.isNil(this.positionLine)) {
                //console.log('pausing timeline');
                _.delay(() => {
                    this.positionLine.timeline().stop()
                    this.isOn = false
                }, 200)
            }
    
            // check for one or more layers added
            this.cacheStepLayers()
            for (let layer of this.props.round.layers) {
                let oldLayer = _.find(this.round.layers, { id: layer.id })
                if (_.isNil(oldLayer)) {
                    await AudioEngine.createTrack(layer)
                    redraw = true
                }
            }
    
            for (let layer of this.round.layers) {
                let newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (_.isNil(newLayer)) {
                    AudioEngine.removeTrack(layer.id)
                    redraw = true
                }
            }
    
            // check for number of steps per layer changed
            let previousSteps = []
            for (let i = 0; i < this.round.layers.length; i++) {
                const layer = this.round.layers[i]
                previousSteps.push(...layer.steps)
                const newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(newLayer)) {
                    if (newLayer.steps.length !== layer.steps.length) {
                        // number of steps has changed
                        redraw = true
                        AudioEngine.recalculateParts(this.props.round)
                    }
                }
            }
    
            // Check if an individual step has changed
            let newSteps = []
            for (let layer of this.props.round.layers) {
                for (let newStep of layer.steps) {
                    newSteps.push(newStep)
                }
    
            }
            let shouldRecalculateParts = false
        //    console.timeEnd('componentDidUpdate B3 B')
            for (let previousStep of previousSteps) {
            //    console.time('componentDidUpdate B3 C')
                let newStep = _.find(newSteps, { id: previousStep.id })
            //    console.timeEnd('componentDidUpdate B3 C')
                if (!_.isNil(newStep)) {
                //    console.time('componentDidUpdate B3 D')
                    //const shouldUpdate = !_.isEqual(previousStep, newStep)
                    let shouldUpdate = false
                    if (previousStep.isOn != newStep.isOn) {
                        shouldUpdate = true
                    }
                //    console.timeEnd('componentDidUpdate B3 D')
                    if (shouldUpdate) {
                        //   console.log('found changed step', previousStep, newStep);
                    //    console.time('componentDidUpdate B3 E')
                        //this.updateStep(newStep, true)
                    //    console.timeEnd('componentDidUpdate B3 E')
                    //    console.time('componentDidUpdate B3 F')
                        shouldRecalculateParts = true
                        //AudioEngine.recalculateParts(this.props.round)
                    //    console.timeEnd('componentDidUpdate B3 F')
                    }
                }
            }
            
    
            // Check for layer type or instrument changes
            for (let layer of this.round.layers) {
                let newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(newLayer) && !_.isEqual(layer.instrument, newLayer.instrument)) {
                    // instrument has changed
                    // console.log('instrument has changed', newLayer.instrument);
                    AudioEngine.tracksById[newLayer.id].setInstrument(newLayer.instrument)
                    this.updateLayerLabelText(layer.id, newLayer.instrument.sampler)
                }
                if (!_.isNil(newLayer) && !_.isEqual(layer.type, newLayer.type)) {
                    // type has changed
                    //console.log('layer type has changed');
                    AudioEngine.tracksById[newLayer.id].setType(newLayer.type, newLayer.automationFxId)
                }
                if (!_.isNil(newLayer) && !_.isEqual(layer.automationFxId, newLayer.automationFxId)) {
                    // automation has changed
                    //  console.log('layer automation fx id has changed');
                    AudioEngine.tracksById[newLayer.id].setAutomatedFx(newLayer.automationFxId)
                }
            }
            // Check for gain changes
            for (let layer of this.round.layers) {
                let newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(newLayer) && !_.isEqual(layer.gain, newLayer.gain)) {
                    //  console.log('gain has changed', newLayer.gain)
                    AudioEngine.tracksById[newLayer.id].setVolume(newLayer.gain)
                }
            }
    
            // Check for mute changes
            for (let layer of this.round.layers) {
                let newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (!_.isNil(newLayer) && !_.isEqual(layer.isMuted, newLayer.isMuted)) {
                    //  console.log('mute has changed', newLayer.isMuted)
                    AudioEngine.tracksById[newLayer.id].setMute(newLayer.isMuted)
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
    
            // Check for sequence changes
            for (let [, userPatterns] of Object.entries(this.round.userPatterns)) {
                let newUserPatterns = _.find(this.props.round.userPatterns, { id: userPatterns.id })
                if (!userPatterns.isPlayingSequence && newUserPatterns.isPlayingSequence) {
                    //console.log('isPlayingSequence turned on');
                    AudioEngine.recalculateParts(this.props.round)
                    this.calculateSequence(newUserPatterns)
                } else {
                    // console.log('isPlayingSequence turned off');
                }
            }
            */
    }

    onMuteToggle(props) {
        const isMuted = props.selectedLayer?.isMuted
        if (props.selectedLayer) {
            AudioEngine.tracksById[props.selectedLayer.id].setMute(!isMuted)
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
        // console.log('draw()', this.containerWidth, this.containerheight);
        this.clear()
        const _this = this

        this.orderLayers()
        this.cacheStepLayers()



        // position line
        /*  this.isOn = this.props.isOn
          const positionLineLength = (HTML_UI_Params.addNewLayerButtonDiameter / 2) + (HTML_UI_Params.initialLayerPadding / 2) + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding) * this.round.layers.length)
  
          const positionLineWidth = 16
          const positionLineTime = (60 / this.round.bpm) * 4000
          this.positionLine = this.container.rect(positionLineWidth, positionLineLength).fill('#666666')
          this.positionLine.move((this.containerWidth / 2) - (positionLineWidth / 2), (this.containerHeight / 2) - positionLineLength)
          this.positionLineAnimation = this.positionLine.animate({ duration: positionLineTime }).ease('-').transform({ rotate: 360, relative: true, origin: 'bottom center' }).loop()
          if (!this.isOn) {
              this.positionLine.timeline().pause()
          } else {
              this.positionLine.timeline().seek(AudioEngine.getPositionMilliseconds())
          }*/
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
        this.addLayerButton = this.container.circle(HTML_UI_Params.addNewLayerButtonDiameter).attr({ fill: '#1B1B1B' }).stroke({ width: 1, color: this.userColors[this.props.user.id], dasharray: '5,5' })
        this.addLayerButton.x((this.containerWidth / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.y((this.containerHeight / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.click(async () => {
            await _this.onAddLayerClick()
        })
        this.addLayerButton.addClass(this.props.classes.button)
        //this.addLayerButton.svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="white"/><path fill="white" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>')
        this.addLayerButtonIcon = this.container.nested()
        this.addLayerButtonIcon.svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="' + this.userColors[this.props.user.id] + '" width="48px" height="48px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>')
        this.addLayerButtonIcon.x((this.containerWidth / 2) - 24)
        this.addLayerButtonIcon.y((this.containerHeight / 2) - 25)
        this.addLayerButtonIcon.addClass(this.props.classes.buttonIcon)

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
    }

    scheduleToneEvents() {
        this.disposeToneEvents()
        const _this = this
        this.toneParts = []
        for (const layer of this.round.layers) {
            const notes = this.convertStepsToNotes(layer.steps, this.userColors[layer.createdBy])
            for (let note of notes) {
                note.time += 'i';
            }
            let part = new Tone.Part(function (time, note) {
                Tone.Draw.schedule(function () {
                    const stepGraphic = _.find(_this.stepGraphics, { id: note.id })
                    if (!_.isNil(stepGraphic)) {
                        stepGraphic.stroke({ color: '#FFFFFF' })
                        stepGraphic.animate().stroke({ color: note.color })
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
        // console.log('loading seq part', notes);
        // const shouldUpdateGraphics = userPatterns.id === this.props.user.id
        let part = new Tone.Part(function (time, note) {
            //console.log('seq note', note);
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

            // console.log('loadPattern updating internal layers', this.round.layers, pattern.state.layers);

            for (let layer of this.round.layers) {
                let patternLayer = _.find(pattern.state.layers, { id: layer.id })
                if (!_.isNil(patternLayer)) {
                    layer.steps = patternLayer.steps
                }
            }

            AudioEngine.recalculateParts(this.round)
            // console.timeEnd('loadPattern')

            // this.props.dispatch({ type: UPDATE_LAYERS, payload: { layers: pattern.state.layers } })
            // this.props.dispatch({ type: SET_CURRENT_SEQUENCE_PATTERN, payload: { value: order } })
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
        if (!_.isNil(this.addLayerButton)) {
            this.addLayerButton.click(null)
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
                .opacity(!createdByThisUser ? 0.5 : 1)
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
            stepGraphic.stroke({ color: this.userColors[layer.createdBy], width: stepStrokeWidth + 'px' }).opacity(!createdByThisUser ? 0.5 : 1)
            stepGraphic.stroke({ opacity: 1 })
            layer.isMuted && stepGraphic.stroke({ color: 'rgba(255,255,255,0.1)' })
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.layerId = layer.id
            stepGraphic.id = step.id
            stepGraphic.isAllowedInteraction = layer.createdBy === this.props.user.id
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
                //diameter += HTML_UI_Params.stepDiameter + HTML_UI_Params.stepDiameter
            } else {
                diameter += ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) / HTML_UI_Params.otherUserLayerSizeDivisor)
                //diameter += ((HTML_UI_Params.stepDiameter + HTML_UI_Params.stepDiameter) / 2)
            }
        }
        console.log('getLayerDiameter(' + order + ')', diameter);
        return diameter
        //HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (order + 1))
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
            //console.log('updating step', stepGraphic, step.isOn, this.props.user.color);
            const _this = this
            if (showActivityIndicator) {
                // add delay so that graphic updates after activity indicator hits it
                _.delay(() => {
                    if (step.isOn) {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: _this.userColors[layer.createdBy], 'fill-opacity': step.probability })
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).transform({
                            scale: numberRange(step.velocity, 0, 1, 0.5, 1)
                        })
                    } else {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: '#101114' })
                    }
                }, HTML_UI_Params.activityAnimationTime)
                this.animateActivityIndicator(layer.createdBy, stepGraphic.x() + (HTML_UI_Params.stepDiameter / 2), stepGraphic.y() + (HTML_UI_Params.stepDiameter / 2))
            } else {
                //console.log('updateStep()', step.isOn);
                if (step.isOn) {
                    stepGraphic.attr({ fill: _this.userColors[layer.createdBy], 'fill-opacity': step.probability })
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
        // layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
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
            this.adjustLayerOffset(layer.id, layer.percentOffset, layer.timeOffset)
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
                //console.log('layer mouseover');
                e.stopPropagation()
                _this.onLayerOver(layerGraphic)
            })
            layerGraphic.on('mouseout', function (e) {
                //console.log('layer mouseout');
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

            stepGraphic.on('mouseout', (e) => {
                //console.log('mouseout');
                if (!_.isNil(_this.stepMoveTimer)) {
                    // we've swiped / dragged out of the step, toggle this step and listen for mouseovers on all other steps
                    // add listener to layergraphic to cancel swiping
                    _this.addStepSwipeListeners(stepGraphic)
                    _this.swipeToggleActive = true
                    _this.touchStartStepGraphic = stepGraphic
                    _this.onStepClick(stepGraphic)

                    // _this.addStepSwipeCancelListener(stepGraphic)
                }

            })

            stepGraphic.on('mousedown', (e) => {
                // console.log('mousedown');
                e.stopPropagation()
                e.preventDefault()
                _this.swipeToggleActive = false
                _this.startStepMoveTimer(stepGraphic, e.pageX, e.pageY)

                _this.container.on('mouseup', (e) => {
                    //console.log('_this.container.on(mouseup)');
                    e.stopPropagation()
                    _this.removeStepSwipeListeners()
                    _this.container.off('mousemove')
                    _this.container.off('mouseup')

                    _this.hideStepModal()
                    //  console.log('mouseup', '_this.stepMoveTimer', _this.stepMoveTimer, '_this.swipeToggleActive', _this.swipeToggleActive);
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
                //  console.log('touchstart');
                e.stopPropagation()
                e.preventDefault()
                const isIPad = /Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
                _this.swipeToggleActive = false
                _this.startStepMoveTimer(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
                _this.touchStartStepGraphic = stepGraphic
                _this.isCurrentlyOverStepGraphic = stepGraphic
                stepGraphic.on('touchmove', (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const X = isIPad ? e.touches[0].pageX + 1 : e.touches[0].pageX
                    const Y = isIPad ? e.touches[0].pageY + 1 : e.touches[0].pageY
                    this.isScrolling = true;
                    //  console.log('touchmove');
                    if (_.isNil(_this.stepMoveTimer) && !_this.swipeToggleActive) {
                        _this.onStepDragMove(stepGraphic, X, Y)
                    } else {
                        // console.log('touchmove', e, stepGraphic.id);
                        // _this.swipeToggleActive = stepGraphic
                        _this.touchStartStepGraphic = stepGraphic
                        _this.isOverStep(stepGraphic, X, Y)
                    }
                })
                stepGraphic.on('touchend', (e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    //   console.log('touchend');
                    _this.hideStepModal()
                    if (!_.isNil(_this.stepMoveTimer)) {
                        // timer has not expired, so interpret as a click
                        //  console.log('touchend interpreted as click', _this.swipeToggleActive);
                        _this.clearShowStepModalTimer()
                        if (!_this.swipeToggleActive) {
                            // console.log('acting on interpreted click');
                            _this.onStepClick(stepGraphic)
                        } else {
                            //  console.log('ignoring interpreted click');
                        }

                    } else {
                        _this.onStepDragEnd(stepGraphic)
                    }
                    stepGraphic.off('touchmove')
                    stepGraphic.off('touchend')
                    _this.touchStartStepGraphic = null
                    _this.isScrolling = false
                })
            })
            // console.log('adding touchmove event for stepgraphic', stepGraphic.id);
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
            //  console.log('_this.container.on(mousemove)');
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
                // console.log('adding mouseover');
                stepGraphic.on('mouseover', (e) => {
                    //  console.log('on stepGraphic mouseover');
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
            //console.log('layerGraphic mouseout');
            _this.swipeToggleActive = false
            _this.removeStepSwipeListeners()
            layerGraphic.off('mouseout')
        })
    }

    onStepDragMove(stepGraphic, x, y) {
        let deltaX = x - stepGraphic.startX
        let deltaY = y - stepGraphic.startY
        //console.log('onStepDragMove', this.isZooming, stepGraphic.isOn, deltaX, deltaY, stepGraphic.isPanningX);
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
            //delta += 1
            //stepGraphic.velocity = delta * stepGraphic.velocityPanStart;
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
            // this.props.dispatch({ type: SET_STEP_PROBABILITY, payload: { probability: step.probability, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
            step.velocity = _.round(stepGraphic.velocity, 1)
            // this.props.dispatch({ type: SET_STEP_VELOCITY, payload: { velocity: step.velocity, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
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
        // console.log('onStepClick', step);

        // update internal round so that it doesn't trigger another update when we receive a change after the dispatch
        step.isOn = !step.isOn
        this.updateStep(step, false)
        AudioEngine.recalculateParts(this.round)
        this.props.dispatch({ type: TOGGLE_STEP, payload: { layerId: stepGraphic.layerId, stepId: stepGraphic.id, isOn: step.isOn, user: null } })
        // console.log('this.context', this.context);
        this.saveLayer(stepGraphic.layerId)
        //this.context.updateStep(this.round.id, stepGraphic.layerId, stepGraphic.id, step)

    }

    async onAddLayerClick() {
        const newLayer = await getDefaultLayerData(this.props.user.id);
        newLayer.name = 'Layer ' + (this.props.round.layers.length + 1)
        this.props.dispatch({ type: ADD_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
        this.context.createLayer(this.round.id, newLayer)
        this.highlightNewLayer = newLayer.id
        this.selectedLayerId = newLayer.id
        /* const newLayer = _.cloneDeep(this.props.round.layers[this.props.round.layers.length - 1])
         newLayer.id = Math.round(Math.random() * 99999)
         newLayer.order++;
         for (const step of newLayer.steps) {
             step.id = Math.round(Math.random() * 99999)
             this.stepLayerDictionary[step.id] = newLayer
         }
         this.addLayer(newLayer, false)
         AudioEngine.createTrack(newLayer)*/
        // this.draw()
    }

    addEventListeners() {
        //const element = document.getElementById('round')
        //const hammertime = new Hammer(element, {});
        //hammertime.get('pinch').set({ enable: true });
    }
    addBackgroundEventListeners() {
        const element = document.getElementById('round')
        element.addEventListener('click', this.onOutsideClick)
    }
    removeBackgroundEventListeners() {
        const element = document.getElementById('round')
        element.removeEventListener('click', this.onOutsideClick)
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
                // _this.containerWidth = Math.max(window.screen.width || 0, window.innerWidth || 0)
                //_this.containerheight = Math.max(window.screen.height || 0, window.innerHeight || 0)
                _this.containerWidth = width
                _this.containerheight = height

                // console.log('onWindowResize', orientation, '_this.containerWidth', _this.containerWidth, '_this.containerheight', _this.containerheight);
                const roundElement = document.getElementById('round')
                roundElement.style.width = width + 'px'
                roundElement.style.height = height + 'px'
                //console.log('set round height to ', height + 'px', 'actual height', roundElement.style.height);

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
        // console.log('getOrientation', orientation);
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

    isOverStep(initialStepGraphic, x, y) {
        //  console.log('checking is over step', x, y);
        const _this = this
        let isOver = false
        for (const stepGraphic of this.stepGraphics) {
            if (stepGraphic.layerId === _this.touchStartStepGraphic.layerId) {
                //console.log(stepGraphic, stepGraphic.x(), stepGraphic.y(), stepGraphic.node.getBoundingClientRect());
                const rect = stepGraphic.node.getBoundingClientRect()
                if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
                    //console.log('is over step graphic');
                    isOver = true
                    if (!_.isEqual(_this.isCurrentlyOverStepGraphic, stepGraphic)) {
                        _this.isCurrentlyOverStepGraphic = stepGraphic
                        _this.onStepClick(stepGraphic)
                    }
                }
            }
        }
        if (!isOver) {
            if (!_.isNil(this.isCurrentlyOverStepGraphic) && this.isCurrentlyOverStepGraphic === initialStepGraphic && !_.isNil(_this.stepMoveTimer)) {
                // just swiped off initial step
                //  console.log('clicking initial step');
                _this.onStepClick(initialStepGraphic)
            }
            // we've swiped off the step so cancel the modal timer
            //  console.log('not over canceling timer');
            this.clearShowStepModalTimer()
            this.isCurrentlyOverStepGraphic = null
            _this.swipeToggleActive = true
        }
    }

    render() {
        //console.log('HTML UI render()');
        return (
            <div className="round" id="round" ></div>
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
        selectedLayerId: state.display.selectedLayerId,
        disableKeyListener: state.display.disableKeyListener
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(PlayUI));
