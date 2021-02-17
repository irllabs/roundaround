import React, { Component } from 'react';
import * as _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import { HTML_UI_Params, KEY_MAPPINGS } from '../../utils/constants'
import { connect } from "react-redux";
import AudioEngine from '../../audio-engine/AudioEngine'
import Instruments from '../../audio-engine/Instruments'
import FX from '../../audio-engine/FX'
import { getDefaultLayerData } from '../../utils/defaultData';
import { TOGGLE_STEP, ADD_LAYER, SET_SELECTED_LAYER_ID, SET_IS_SHOWING_LAYER_SETTINGS, SET_IS_PLAYING, UPDATE_STEP, SET_IS_SHOWING_ORIENTATION_DIALOG } from '../../redux/actionTypes'
import { FirebaseContext } from '../../firebase/'
import * as Tone from 'tone';
import { withStyles } from '@material-ui/styles';
import PropTypes from 'prop-types';
import { numberRange } from '../../utils/index'

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
    constructor (props) {
        super(props)
        this.isZooming = false
        this.isPanning = false
        this.stepGraphics = []
        this.layerGraphics = []
        this.round = null; // local copy of round, prevent mutating store.
        this.isOn = false
        this.editAllLayers = false
        this.userColors = {};
        this.onWindowResizeThrottled = _.throttle(this.onWindowResize.bind(this), 1000)
        this.selectedLayerId = null;
        this.onKeypress = this.onKeypress.bind(this)
        this.onOutsideClick = this.onOutsideClick.bind(this)
    }

    async componentDidMount () {
        // register this component with parent so we can do some instant updates bypassing redux for speed
        this.props.childRef(this)

        this.createRound()
        window.addEventListener('resize', this.onWindowResizeThrottled)
        window.addEventListener('keypress', this.onKeypress)
        this.addBackgroundEventListeners()
        if (this.getOrientation() === 'portrait') {
            this.showOrientationDialog()
        } else {
            this.hideOrientationDialog()
        }
    }

    async componentWillUnmount () {
        window.removeEventListener('resize', this.onWindowResizeThrottled)
        window.removeEventListener('keypress', this.onKeypress)
        this.removeBackgroundEventListeners()
        this.clear()
        this.disposeToneEvents()
    }

    createRound () {
        //console.log('createRound()');
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

    async componentDidUpdate () {
        console.log('componentDidUpdate()', this.props.round)

        // Calculate what's changed so we only redraw if necessary
        let redraw = false
        const _this = this

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

        //if (this.round.layers.length < this.props.round.layers.length) {
        // check for one or more layers added
        this.cacheStepLayers()
        for (let layer of this.props.round.layers) {
            let oldLayer = _.find(this.round.layers, { id: layer.id })
            if (_.isNil(oldLayer)) {
                await AudioEngine.createTrack(layer)
                redraw = true
            }
        }
        // } else if (this.round.layers.length > this.props.round.layers.length) {
        // check for one or more layers removed
        // this.cacheStepLayers()
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (_.isNil(newLayer)) {
                AudioEngine.removeTrack(layer.id)
                redraw = true
            }
        }
        //    }

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
        for (let previousStep of previousSteps) {
            let newStep = _.find(newSteps, { id: previousStep.id })
            if (!_.isNil(newStep)) {
                if (!_.isEqual(previousStep, newStep)) {
                    //   console.log('found changed step', previousStep, newStep);
                    this.updateStep(newStep, true)
                    AudioEngine.recalculateParts(this.props.round)
                }
            }
        }

        // Check for layer type or instrument changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.instrument, newLayer.instrument)) {
                // instrument has changed
                AudioEngine.tracksById[newLayer.id].setInstrument(newLayer.instrument)
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
                console.log('gain has changed', newLayer.gain)
                AudioEngine.tracksById[newLayer.id].setVolume(newLayer.gain)
            }
        }

        // Check for mute changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.isMuted, newLayer.isMuted)) {
                console.log('mute has changed', newLayer.isMuted)
                AudioEngine.tracksById[newLayer.id].setMute(newLayer.isMuted)
            }
        }

        // Check for layer time offset changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.timeOffset, newLayer.timeOffset)) {
                console.log('timeOffset has changed')
                AudioEngine.recalculateParts(this.props.round)
                this.adjustLayerOffset(newLayer.id, newLayer.percentOffset, newLayer.timeOffset)
            }
            if (!_.isNil(newLayer) && !_.isEqual(layer.percentOffset, newLayer.percentOffset)) {
                console.log('percentOffset has changed')
                AudioEngine.recalculateParts(this.props.round)
                this.adjustLayerOffset(newLayer.id, newLayer.percentOffset, newLayer.timeOffset)
            }
        }

        if (redraw) {
            this.clear()
            this.round = _.cloneDeep(this.props.round)
            _this.draw(false)
        } else {
            this.round = _.cloneDeep(this.props.round)
        }
    }

    getStep (id) {
        let steps = []
        for (let layer of this.round.layers) {
            steps.push(...layer.steps)
        }
        return _.find(steps, { id })
    }

    draw (shouldAnimate) {
        console.log('draw()', this.containerWidth, this.containerheight);
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
        this.stepGrahpics = []
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
        this.addLayerButton.click(() => {
            _this.onAddLayerClick()
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

    scheduleToneEvents () {
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
            part.start(0)
            _this.toneParts.push(part)
        }
    }

    disposeToneEvents () {
        if (!_.isNil(this.toneParts)) {
            for (let part of this.toneParts) {
                if (!_.isNil(part) && !_.isNil(part._events)) {
                    part.dispose()
                }
            }
        }
    }

    convertStepsToNotes (steps, userColor) {
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

    clear () {
        this.removeAllStepEventListeners()
        this.removeAllLayerEventListeners()
        if (!_.isNil(this.layerGrahpics)) {
            for (let layerGrahpic of this.layerGrahpics) {
                layerGrahpic.clear()
            }
        }

        if (!_.isNil(this.stepGrahpics)) {
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

    reclaculateIndicatorAnimation () {
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

    addLayer (layer, order, shouldAnimate = true) {
        // console.log('addLayer', layer);
        let animateTime = shouldAnimate ? 600 : 0

        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (order + 1))
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        const layerGraphic = this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' }).stroke({ color: this.userColors[layer.createdBy], width: HTML_UI_Params.layerStrokeMax + 'px', opacity: 0 })
        layerGraphic.x(xOffset)
        layerGraphic.y(yOffset)
        layerGraphic.id = layer.id
        layerGraphic.order = order
        layerGraphic.isAllowedInteraction = layer.createdBy === this.props.user.id
        if (layer.id === this.selectedLayerId) {
            layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
        } else {
            layerGraphic.animate(animateTime).stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
        }
        if (layerGraphic.isAllowedInteraction) {
            layerGraphic.addClass(this.props.classes.button)
        }
        this.addLayerEventListeners(layerGraphic)
        this.layerGraphics.push(layerGraphic)

        // draw steps
        const stepSize = (2 * Math.PI) / layer.steps.length;
        const radius = layerDiameter / 2;
        let angle = Math.PI / -2; // start at -90 degrees so first step is at top
        const anglePercentOffset = this.ticksToRadians(this.ticksPerStep(layer.steps.length) * (layer.percentOffset / 100))
        const angleTimeOffset = this.ticksToRadians(this.msToTicks(layer.timeOffset))
        //const angleOffset = (((Math.PI * 2) / layer.steps.length) * (layer.timeOffset / 100))
        angle += anglePercentOffset
        angle += angleTimeOffset
        for (let step of layer.steps) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - HTML_UI_Params.stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - HTML_UI_Params.stepDiameter / 2) + yOffset;
            const stepGraphic = this.container.circle(HTML_UI_Params.stepDiameter)
            stepGraphic.stroke({ color: this.userColors[layer.createdBy], width: HTML_UI_Params.stepStrokeWidth + 'px', opacity: 0 })
            stepGraphic.animate(animateTime).stroke({ opacity: 1 })
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
        }

    }

    updateStep (step, showActivityIndicator = false) {
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

    highlightLayer (layerGraphic, unhighlightExceptLayerId) {
        this.unhighlightAllLayers(unhighlightExceptLayerId)
        // layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
        layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
    }

    unhighlightAllLayers (exceptLayerId) {
        for (const layerGraphic of this.layerGraphics) {
            if (layerGraphic.id !== exceptLayerId) {
                layerGraphic.stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
            }
        }
    }

    cacheStepLayers () {
        this.stepLayerDictionary = {}
        for (let layer of this.props.round.layers) {
            for (let step of layer.steps) {
                this.stepLayerDictionary[step.id] = layer
            }
        }
    }

    adjustAllLayerOffsets () {
        for (const layer of this.round.layers) {
            this.adjustLayerOffset(layer.id, layer.percentOffset, layer.timeOffset)
        }
    }

    adjustLayerOffset (id, percentOffset, timeOffset) {
        // console.log('adjustLayerTimeOffset', layer., percent, this.stepGraphics);
        const layer = _.find(this.round.layers, { id })
        let stepGraphics = _.filter(this.stepGraphics, { layerId: id })
        const layerGraphic = _.find(this.layerGraphics, { id })
        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (layerGraphic.order + 1))
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
        for (let stepGraphic of stepGraphics) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - HTML_UI_Params.stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - HTML_UI_Params.stepDiameter / 2) + yOffset;
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
        }
    }

    ticksPerStep (numberOfSteps) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        return Math.round(totalTicks / numberOfSteps)
    }

    ticksToRadians (ticks) {
        const PPQ = Tone.Transport.PPQ
        const totalTicks = PPQ * 4
        return ((Math.PI * 2) / totalTicks) * ticks
    }

    msToTicks (ms) {
        const BPM = Tone.Transport.bpm.value
        const PPQ = Tone.Transport.PPQ
        const msPerBeat = 60000 / BPM
        const msPerTick = msPerBeat / PPQ
        return Math.round(ms / msPerTick)
    }

    drawAvatars () {
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

    updateAvatarPositions (numberOfLayers) {
        if (!_.isEmpty(this.avatarGraphics)) {
            let x = (this.containerWidth / 2) + (HTML_UI_Params.addNewLayerButtonDiameter / 2) + (HTML_UI_Params.initialLayerPadding / 2) + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding) * numberOfLayers) + HTML_UI_Params.avatarRoundPadding
            for (let avatarGraphic of this.avatarGraphics) {
                avatarGraphic.x(x)
            }
        }
    }

    animateActivityIndicator (userId, toX, toY) {
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

    addLayerEventListeners (layerGraphic) {
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
        }
    }
    onLayerTouchStart (layerGraphic, e) {
        e.preventDefault()
        const _this = this
        this.layerTouchTimer = setTimeout(() => {
            _this.onLayerClicked(layerGraphic.id)
        }, 500)
    }
    onLayerTouchEnd (layerGraphic) {
        if (this.layerTouchTimer) {
            clearTimeout(this.layerTouchTimer)
        }
    }
    onLayerClicked (layerId) {
        this.selectedLayerId = layerId
        this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId } })
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
        this.highlightLayer(_.find(this.layerGraphics, { id: layerId }))
    }
    onLayerOver (layerGraphic) {
        this.highlightLayer(layerGraphic, this.selectedLayerId)
    }
    onLayerOut (layerGraphic) {
        this.unhighlightAllLayers(this.selectedLayerId)
    }

    orderLayers () {
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

    orderSteps () {
        for (const layer of this.round.layers) {
            layer.steps = _.orderBy(layer.steps, 'order')
        }
    }

    addStepEventListeners (stepGraphic) {
        const _this = this
        if (stepGraphic.isAllowedInteraction) {
            stepGraphic.on('mousedown', (e) => {
                e.stopPropagation()
                e.preventDefault()
                _this.startStepMoveTimer(stepGraphic, e.pageX, e.pageY)

                _this.container.on('mouseup', (e) => {
                    e.stopPropagation()
                    _this.container.off('mousemove')
                    _this.container.off('mouseup')
                    _this.hideStepModal()
                    if (!_.isNil(_this.stepMoveTimer)) {
                        // timer has not expired, so interpret as a click
                        _this.clearShowStepModalTimer()
                        _this.onStepClick(stepGraphic)
                    } else {
                        _this.onStepDragEnd(stepGraphic)
                    }
                })
            })
            stepGraphic.on('touchstart', (e) => {
                e.stopPropagation()
                e.preventDefault()
                _this.startStepMoveTimer(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
            })

            stepGraphic.on('touchend', (e) => {
                _this.hideStepModal()
                if (!_.isNil(_this.stepMoveTimer)) {
                    // timer has not expired, so interpret as a click
                    _this.clearShowStepModalTimer()
                    _this.onStepClick(stepGraphic)
                } else {
                    _this.onStepDragEnd(stepGraphic)
                }
            })
            stepGraphic.on('touchmove', (e) => {
                _this.onStepDragMove(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
            })

        }
    }
    startStepMoveTimer (stepGraphic, x, y) {
        const _this = this
        this.clearShowStepModalTimer()
        this.stepMoveTimer = setTimeout(function () {
            const step = _this.getStep(stepGraphic.id)
            if (step.isOn) {
                _this.showStepModal(stepGraphic, x, y)
            }
        }, 500)
    }

    showStepModal (stepGraphic, pageX, pageY) {
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

    hideStepModal () {
        this.stepModal.hide()
    }

    clearShowStepModalTimer () {
        // console.log('clearShowStepModalTimer', this.stepMoveTimer);
        clearTimeout(this.stepMoveTimer)
        this.stepMoveTimer = null
    }

    onStepDragMove (stepGraphic, x, y) {
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
        }
    }

    onStepDragEnd (stepGraphic) {
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


    /*addStepEventListeners (stepGraphic) {
        const _this = this
        if (stepGraphic.isAllowedInteraction) {
            stepGraphic.on('mousedown', (e) => {
                e.stopPropagation()
                e.preventDefault()
                _this.startStepMoveTimer(stepGraphic, e.pageX, e.pageY)

                _this.container.on('mousemove', (e) => {
                    e.preventDefault()
                    if (!this.stepIsPanning) {
                        _this.onStepDragStart(stepGraphic, e.pageX, e.pageY)
                    }
                    _this.onStepDragMove(stepGraphic, e.pageX, e.pageY)
                })
                _this.container.on('mouseup', (e) => {
                    e.stopPropagation()
                    _this.container.off('mousemove')
                    _this.container.off('mouseup')
                    clearTimeout(_this.stepMoveTimer)
                    console.log('mouseup', this.stepIsPanning);
                    if (this.stepIsPanning) {
                        _this.onStepDragEnd(stepGraphic)
                    } else {
                        _this.onStepClick(stepGraphic)
                    }
                })
            })

            stepGraphic.on('mouseover', (e) => {
                _this.highlightStep(stepGraphic)
            })
            stepGraphic.on('mouseout', (e) => {
                _this.unhighlightStep(stepGraphic)
            })
            stepGraphic.on('touchstart', (e) => {
                _this.onStepDragStart(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
            })

            stepGraphic.on('touchend', (e) => {
                _this.onStepDragEnd(stepGraphic)
            })
            stepGraphic.on('touchmove', (e) => {
                _this.onStepDragMove(stepGraphic, e.touches[0].pageX, e.touches[0].pageY)
            })
        }
    }

    startStepMoveTimer (stepGraphic, x, y) {
        const _this = this
        this.stepMoveTimer = setTimeout(function () {
            _this.onStepDragStart(stepGraphic, x, y)
        }, 1000)
    }

    onStepDragStart (stepGraphic, x, y) {
        console.log('onStepDragStart', stepGraphic, x, y,);
        clearTimeout(this.stepMoveTimer)
        this.stepIsPanning = true
        stepGraphic.startX = x
        stepGraphic.startY = y
        const step = this.getStep(stepGraphic.id)
        stepGraphic.isOn = step.isOn
        stepGraphic.probabilityPanStart = stepGraphic.probability = step.probability;
        stepGraphic.velocityPanStart = stepGraphic.velocity = step.velocity;
        if (stepGraphic.isOn) {
            this.stepModal.show()
            this.updateStepModal(stepGraphic)
        }
    }
    onStepDragMove (stepGraphic, x, y) {
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
        }
    }
    onStepDragEnd (stepGraphic) {
        if (stepGraphic.isOn) {
            const step = this.getStep(stepGraphic.id)
            step.probability = stepGraphic.probability
            step.velocity = stepGraphic.velocity
            this.props.dispatch({ type: SET_STEP_PROBABILITY, payload: { probability: stepGraphic.probability, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
            this.props.dispatch({ type: SET_STEP_VELOCITY, payload: { velocity: stepGraphic.velocity, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
            this.saveLayer(stepGraphic.layerId)
            this.stepIsPanning = false
            //this.context.updateStep(this.round.id, stepGraphic.layerId, stepGraphic.id, step)
        }
        AudioEngine.recalculateParts(this.props.round)
        this.stepIsPanning = false
        this.stepModal.hide()
        setTimeout(() => {
            this.isPanning = false
        }, 100)
    }*/

    highlightStep (stepGraphic) {
        const layer = _.find(this.props.round.layers, { id: stepGraphic.layerId })
        if (!_.isNil(layer)) {
            stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: this.userColors[layer.createdBy], 'fill-opacity': 1 })
        }
    }
    unhighlightStep (stepGraphic) {
        const step = this.getStep(stepGraphic.id)
        if (!step.isOn) {
            stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: '#101114', 'fill-opacity': 1 })
        }
    }

    saveLayer (id) {
        this.context.updateLayer(this.round.id, id, _.find(this.round.layers, { id }))
    }

    removeAllStepEventListeners () {
        for (let stepGraphic of this.stepGraphics) {
            stepGraphic.click(null)
            if (!_.isNil(stepGraphic.hammertime)) {
                stepGraphic.hammertime.off('pan')
                stepGraphic.hammertime.off('panstart')
                stepGraphic.hammertime.off('panend')
            }
        }
    }

    removeAllLayerEventListeners () {
        for (let layerGraphic of this.layerGraphics) {
            layerGraphic.click(null)
        }
    }

    updateStepModal (stepGraphic) {
        //  console.log('updateStepModal', stepGraphic.probability, stepGraphic.velocity);
        //this.stepModalText.text('Velocity: ' + _.round(stepGraphic.velocity, 1) + '\nProbability: ' + _.round(stepGraphic.probability, 1))
        this.stepModal.x(stepGraphic.x() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModal.y(stepGraphic.y() - ((HTML_UI_Params.stepModalDimensions / 2) - HTML_UI_Params.stepDiameter / 2))
        this.stepModalThumb.x(stepGraphic.probability * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
        this.stepModalThumb.y((1 - stepGraphic.velocity) * (HTML_UI_Params.stepModalDimensions - HTML_UI_Params.stepModalThumbDiameter))
    }

    onStepClick (stepGraphic) {
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

    onAddLayerClick () {
        const newLayer = getDefaultLayerData(this.props.user.id);
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

    addEventListeners () {
        //const element = document.getElementById('round')
        //const hammertime = new Hammer(element, {});
        //hammertime.get('pinch').set({ enable: true });
    }
    addBackgroundEventListeners () {
        const element = document.getElementById('round')
        element.addEventListener('click', this.onOutsideClick)
    }
    removeBackgroundEventListeners () {
        const element = document.getElementById('round')
        element.removeEventListener('click', this.onOutsideClick)
    }
    onOutsideClick () {
        this.unhighlightAllLayers()
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
        this.selectedLayerId = null
    }
    getUserColors () {
        let userColors = {};
        for (const user of this.props.users) {
            userColors[user.id] = user.color
        }
        return userColors
    }

    onWindowResize (e) {
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
                _this.containerWidth = Math.max(window.screen.width || 0, window.innerWidth || 0)
                _this.containerheight = Math.max(window.screen.height || 0, window.innerHeight || 0)

                const roundElement = document.getElementById('round')
                roundElement.style.width = _this.containerWidth + 'px'
                roundElement.style.height = _this.containerHeight + 'px'
                let currentViewBox = _this.container.viewbox()
                _this.container.size(this.containerWidth, this.containerHeight)
                _this.container.viewbox(
                    0,
                    currentViewBox.y,
                    _this.containerWidth,
                    _this.containerHeight
                )
                _this.draw()
            }
        }, 500);
    }

    getOrientation () {
        let orientation;
        if (window.orientation === 0 || window.orientation === 180) {
            orientation = 'portrait'
        } else {
            orientation = 'landscape'
        }
        // console.log('getOrientation', orientation);
        return orientation
    }

    onKeypress (e) {
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

    showOrientationDialog () {
        this.props.dispatch({ type: SET_IS_SHOWING_ORIENTATION_DIALOG, payload: { value: true } })
    }

    hideOrientationDialog () {
        this.props.dispatch({ type: SET_IS_SHOWING_ORIENTATION_DIALOG, payload: { value: false } })
    }

    render () {
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
    return {
        round: state.round,
        user: state.user,
        users: state.users,
        disableKeyListener: state.display.disableKeyListener
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(PlayUI));
