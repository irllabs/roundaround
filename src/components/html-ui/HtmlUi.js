import React, { Component } from 'react';
import * as _ from 'lodash';
import Hammer from 'hammerjs'
import './HtmlUi.scss'
import { SVG } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.panzoom.js'
import { HTML_UI_Params } from '../../constants'
import { connect } from "react-redux";
import AudioEngine from '../../audio-engine/AudioEngine'
import Instruments from '../../audio-engine/Instruments'

import { getDefaultLayerData } from '../../utils/dummyData';
import { TOGGLE_STEP, ADD_ROUND_LAYER, SET_STEP_PROBABILITY, SET_STEP_VELOCITY, SET_SELECTED_LAYER_ID, SET_IS_SHOWING_LAYER_SETTINGS } from '../../redux/actionTypes'

class HtmlUi extends Component {
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
    }

    componentDidMount () {
        this.createRound()
        AudioEngine.init()
        Instruments.init()
        AudioEngine.load(this.props.round)
        window.addEventListener('resize', this.onWindowResizeThrottled)
        this.addBackgroundEventListeners()
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
        //console.log('componentDidUpdate()', this.props.round)

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
                    console.log('layer', _.find(this.props.round.layers, { id: layerGraphic.id }));
                    layerGraphic.isAllowedInteraction = _.find(this.props.round.layers, { id: layerGraphic.id }).creator === this.props.user.id
                }
                this.addLayerEventListeners(layerGraphic)
            }
            for (let stepGraphic of this.stepGraphics) {
                if (this.editAllLayers) {
                    stepGraphic.isAllowedInteraction = true
                } else {
                    stepGraphic.isAllowedInteraction = this.stepLayerDictionary[stepGraphic.id].creator === this.props.user.id
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
                    //    console.log('found changed step', previousStep, newStep);
                    this.updateStep(newStep, true)
                    AudioEngine.recalculateParts(this.props.round)
                }
            }
        }

        // Check for instrument changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.instrument, newLayer.instrument)) {
                // instrument has changed
                AudioEngine.tracksById[newLayer.id].setInstrument(newLayer.instrument)
            }
        }
        // Check for gain changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.gain, newLayer.gain)) {
                // gain has changed
                AudioEngine.tracksById[newLayer.id].setVolume(newLayer.gain)
            }
        }

        // Check for mute changes
        for (let layer of this.round.layers) {
            let newLayer = _.find(this.props.round.layers, { id: layer.id })
            if (!_.isNil(newLayer) && !_.isEqual(layer.isMuted, newLayer.isMuted)) {
                // mute has changed
                AudioEngine.tracksById[newLayer.id].setMute(newLayer.isMuted)
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
        console.log('draw()');
        this.clear()
        const _this = this

        this.orderLayers()
        this.cacheStepLayers()



        // position line
        const positionLineLength = (HTML_UI_Params.addNewLayerButtonDiameter / 2) + (HTML_UI_Params.initialLayerPadding / 2) + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding) * this.round.layers.length)

        const positionLineWidth = 16
        const positionLineTime = 2000
        this.positionLine = this.container.rect(positionLineWidth, positionLineLength).fill('#666666')
        this.positionLine.move((this.containerWidth / 2) - (positionLineWidth / 2), (this.containerHeight / 2) - positionLineLength)
        this.positionLine.animate({ duration: positionLineTime }).ease('-').transform({ rotate: 360, relative: true, origin: 'bottom center' }).loop()
        if (!this.isOn) {
            this.positionLine.timeline().pause()
        } else {
            this.positionLine.timeline().seek(AudioEngine.getPositionMilliseconds())
        }
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
        this.addLayerButton = this.container.circle(HTML_UI_Params.addNewLayerButtonDiameter).attr({ fill: '#fff' })
        this.addLayerButton.x((this.containerWidth / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.y((this.containerHeight / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.click(() => {
            _this.onAddLayerClick()
        })

        this.stepModal = this.container.nested()
        this.stepModalBackground = this.stepModal.rect(122, 52).fill({ color: '#000', opacity: 0.7 }).radius(4)
        this.stepModalText = this.stepModal.text('')
        this.stepModalText.fill('#fff')
        this.stepModalText.font({
            size: 16,
            weight: 500
        })
        this.stepModalText.x(8)
        this.stepModal.hide()

        if (!_.isNil(this.highlightNewLayer)) {
            // this.onLayerClicked(this.highlightNewLayer)
            this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId: this.highlightNewLayer } })
            this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
            this.highlightNewLayer = null;
        }
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

    addLayer (layer, order, shouldAnimate = true) {
        // console.log('addLayer', layer);
        let animateTime = shouldAnimate ? 600 : 0

        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (order + 1))
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        const layerGraphic = this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' }).stroke({ color: this.userColors[layer.creator], width: HTML_UI_Params.layerStrokeMax + 'px', opacity: 0 })
        layerGraphic.x(xOffset)
        layerGraphic.y(yOffset)
        layerGraphic.id = layer.id
        layerGraphic.isAllowedInteraction = layer.creator === this.props.user.id
        if (layer.id === this.selectedLayerId) {
            layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
        } else {
            layerGraphic.animate(animateTime).stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
        }
        this.addLayerEventListeners(layerGraphic)
        this.layerGraphics.push(layerGraphic)

        // draw steps
        const stepSize = (2 * Math.PI) / layer.steps.length;
        const radius = layerDiameter / 2;
        let angle = Math.PI / -2; // start at -90 degrees so first step is at top
        for (let step of layer.steps) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - HTML_UI_Params.stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - HTML_UI_Params.stepDiameter / 2) + yOffset;
            const stepGraphic = this.container.circle(HTML_UI_Params.stepDiameter)
            stepGraphic.stroke({ color: this.userColors[layer.creator], width: HTML_UI_Params.stepStrokeWidth + 'px', opacity: 0 })
            stepGraphic.animate(animateTime).stroke({ opacity: 1 })
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.layerId = layer.id
            stepGraphic.id = step.id
            stepGraphic.isAllowedInteraction = layer.creator === this.props.user.id
            stepGraphic.addClass('step')
            this.stepGraphics.push(stepGraphic)
            this.updateStep(step)
            this.addStepEventListeners(stepGraphic)
        }

    }

    updateStep (step, showActivityIndicator = false) {
        //console.log('updateStep', step);
        if (!_.isEmpty(this.stepGraphics) && !_.isNil(step)) {
            const layer = this.stepLayerDictionary[step.id]
            const stepGraphic = _.find(this.stepGraphics, { id: step.id })
            //console.log('updating step', stepGraphic, step.isOn, this.props.user.color);
            const _this = this
            if (showActivityIndicator) {
                // add delay so that graphic updates after activity indicator hits it
                _.delay(() => {
                    if (step.isOn) {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: _this.userColors[layer.creator], 'fill-opacity': step.probability })
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).transform({
                            scale: step.velocity
                        })
                    } else {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: '#282c34' })
                    }
                }, HTML_UI_Params.activityAnimationTime)
                this.animateActivityIndicator(layer.creator, stepGraphic.x() + (HTML_UI_Params.stepDiameter / 2), stepGraphic.y() + (HTML_UI_Params.stepDiameter / 2))
            } else {
                if (step.isOn) {
                    stepGraphic.attr({ fill: _this.userColors[layer.creator], 'fill-opacity': step.probability })
                    stepGraphic.transform({
                        scale: step.velocity
                    })
                } else {
                    stepGraphic.attr({ fill: '#282c34' })
                }
            }
        }
    }

    highlightLayer (layerGraphic) {
        this.unhighlightAllLayers()
        layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity * 2 })
    }

    unhighlightAllLayers () {
        this.layerGraphics.map((layerGraphic) => {
            layerGraphic.animate().stroke({ opacity: HTML_UI_Params.layerStrokeOpacity })
        })
    }

    cacheStepLayers () {
        this.stepLayerDictionary = {}
        for (let layer of this.props.round.layers) {
            for (let step of layer.steps) {
                this.stepLayerDictionary[step.id] = layer
            }
        }
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
                _this.onLayerClicked(layerGraphic.id)
            })
        }
    }
    onLayerClicked (layerId) {
        this.selectedLayerId = layerId
        this.props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId } })
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } })
        this.highlightLayer(_.find(this.layerGraphics, { id: layerId }))
    }

    orderLayers () {
        // order layers
        this.round.layers = _.sortBy(this.round.layers, 'createdAt')
    }

    addStepEventListeners (stepGraphic) {
        const _this = this
        if (stepGraphic.isAllowedInteraction) {
            stepGraphic.click(function (e) {
                e.stopPropagation()
                _this.onStepClick(stepGraphic)
            })
            stepGraphic.on('mousedown', (e) => {
                e.stopPropagation()
                _this.onStepDragStart(stepGraphic, e.pageX, e.pageY)
                _this.container.on('mousemove', (e) => {
                    _this.onStepDragMove(stepGraphic, e.pageX, e.pageY)
                })
                _this.container.on('mouseup', (e) => {
                    e.stopPropagation()
                    _this.container.off('mousemove')
                    _this.container.off('mouseup')
                    _this.onStepDragEnd(stepGraphic)
                })
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

    onStepDragStart (stepGraphic, x, y) {
        // console.log('onStepDragStart', x, y);
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
        const deltaX = x - stepGraphic.startX
        const deltaY = y - stepGraphic.startY
        //console.log('onStepDragMove', this.isZooming, stepGraphic.isOn, deltaX, deltaY, stepGraphic.isPanningX);
        if (!this.isZooming && stepGraphic.isOn) {
            if (stepGraphic.isPanningX) {
                let delta = deltaX
                if (delta < -100) {
                    delta = -100
                }
                delta = delta / 100
                delta += 1
                stepGraphic.probability = delta * stepGraphic.probabilityPanStart
                if (stepGraphic.probability < 0.3) {
                    stepGraphic.probability = 0.3
                } else if (stepGraphic.probability > 1) {
                    stepGraphic.probability = 1
                }

                stepGraphic.fill({ opacity: stepGraphic.probability })
                this.updateStepModal(stepGraphic)
            } else if (stepGraphic.isPanningY) {
                let delta = deltaY
                if (delta < -100) {
                    delta = -100
                }
                delta = delta / -100
                delta += 1
                stepGraphic.velocity = delta * stepGraphic.velocityPanStart;
                if (stepGraphic.velocity < 0.5) {
                    stepGraphic.velocity = 0.5
                } else if (stepGraphic.velocity > 1) {
                    stepGraphic.velocity = 1
                }
                stepGraphic.transform({
                    scale: stepGraphic.velocity
                })
                this.updateStepModal(stepGraphic)

            } else {
                // console.log('not panning yet', deltaX, deltaY);
                if (Math.abs(deltaY) > 20) {
                    stepGraphic.isPanningY = true
                    this.isPanning = true
                } else if (Math.abs(deltaX) > 20) {
                    stepGraphic.isPanningX = true
                    this.isPanning = true
                }
            }
        }
    }
    onStepDragEnd (stepGraphic) {
        if (stepGraphic.isPanningX && stepGraphic.isOn) {
            const step = this.getStep(stepGraphic.id)
            step.probability = stepGraphic.probability
            this.props.dispatch({ type: SET_STEP_PROBABILITY, payload: { probability: stepGraphic.probability, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
        } else if (stepGraphic.isPanningY && stepGraphic.isOn) {
            const step = this.getStep(stepGraphic.id)
            step.velocity = stepGraphic.velocity
            this.props.dispatch({ type: SET_STEP_VELOCITY, payload: { velocity: stepGraphic.velocity, layerId: stepGraphic.layerId, stepId: stepGraphic.id, user: this.props.user.id } })
        }
        AudioEngine.recalculateParts(this.props.round)
        stepGraphic.isPanningX = false;
        stepGraphic.isPanningY = false;
        this.stepIsPanning = false
        this.stepModal.hide()
        setTimeout(() => {
            this.isPanning = false
        }, 100)
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
        this.stepModalText.text('Velocity: ' + _.round(stepGraphic.velocity, 1) + '\nProbability: ' + _.round(stepGraphic.probability, 1))
        this.stepModal.x(stepGraphic.x())
        this.stepModal.y(stepGraphic.y() - 100)
    }

    onStepClick (stepGraphic) {
        let step = this.getStep(stepGraphic.id)
        if (!this.isPanning) {
            // update internal round so that it doesn't trigger another update when we receive a change after the dispatch
            step.isOn = !step.isOn
            this.updateStep(step, false)
            AudioEngine.recalculateParts(this.round)
            this.props.dispatch({ type: TOGGLE_STEP, payload: { layerId: stepGraphic.layerId, stepId: stepGraphic.id, isOn: step.isOn, user: null } })
        }
    }

    onAddLayerClick () {
        const newLayer = getDefaultLayerData(this.props.user.id);
        newLayer.name = 'Layer ' + (this.props.round.layers.length + 1)
        this.props.dispatch({ type: ADD_ROUND_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
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
        const _this = this
        /* this.background.on('click', () => {
             _this.unhighlightAllLayers()
         })*/
        const element = document.getElementById('round')
        element.addEventListener('click', () => {
            //console.log('click outside');
            _this.unhighlightAllLayers()
            this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
        })
    }
    getUserColors () {
        let userColors = {}
        if (!_.isNil(this.props.collaboration)) {
            for (const [id, contributor] of Object.entries(this.props.collaboration.contributors)) {
                userColors[id] = contributor.color
            }
        } else {
            userColors[this.props.user.id] = this.props.user.color
        }
        return userColors
    }

    onWindowResize (e) {
        if (!_.isNil(this.container)) {
            this.containerWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
            this.containerHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
            const roundElement = document.getElementById('round')
            roundElement.style.width = this.containerWidth + 'px'
            roundElement.style.height = this.containerHeight + 'px'
            let currentViewBox = this.container.viewbox()
            this.container.size(this.containerWidth, this.containerHeight)
            this.container.viewbox(
                0,
                currentViewBox.y,
                this.containerWidth,
                this.containerHeight
            )
            this.draw()
        }
    }

    render () {
        //console.log('HTML UI render()');
        return (
            <div className="round" id="round" ></div>
        )
    }
}

const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        editAllLayers: state.editAllLayers
    };
};


export default connect(
    mapStateToProps
)(HtmlUi);