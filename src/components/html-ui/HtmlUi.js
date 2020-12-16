import React, { Component } from 'react';
import * as _ from 'lodash';
import Hammer from 'hammerjs'
import './HtmlUi.scss'
import { SVG } from '@svgdotjs/svg.js'
import { HTML_UI_Params } from './Constants.js'
import { connect } from "react-redux";

import { getDefaultLayerData } from '../../utils/dummyData';
import { TOGGLE_STEP, ADD_ROUND_LAYER, SET_STEP_PROBABILITY, SET_STEP_VELOCITY } from '../../redux/actionTypes'

class HtmlUi extends Component {
    constructor (props) {
        super(props)
        this.isZooming = false
        this.isPanning = false
        this.stepGraphics = []
        console.log('props', props);
        this.onScrollWheel = this.onScrollWheel.bind(this)
        this.round = null; // local copy of round, prevent mutating store.
    }

    componentDidMount () {
        this.createRound()
        this.addRoundEventListeners()
    }

    createRound () {
        console.log('createRound()');
        this.round = _.cloneDeep(this.props.round)
        // Create SVG container
        this.containerWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
        this.containerHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        const roundElement = document.getElementById('round')
        roundElement.style.width = this.containerWidth + 'px'
        roundElement.style.height = this.containerHeight + 'px'
        this.container = SVG()
            .addTo(roundElement)
            .size(this.containerWidth, this.containerHeight)
        this.container.viewbox(0, 0, this.containerWidth, this.containerHeight)

        this.stepLayerDictionary = {}
        for (let layer of this.props.round.layers) {
            for (let step of layer.steps) {
                this.stepLayerDictionary[step.id] = layer
            }
        }

        this.draw()
    }

    componentDidUpdate () {
        console.log('componentDidUpdate()', this.round, this.props.round)
        //this.clear()
        //this.draw()

        // Calculate what's changed so we only redraw what's necessary

        if (this.round.layers.length < this.props.round.layers.length) {
            // layer added
            console.log('layer added');
            for (let layer of this.props.round.layers) {
                let oldLayer = _.find(this.round.layers, { id: layer.id })
                if (_.isNil(oldLayer)) {
                    console.log('adding layer', layer);
                    layer.order = this.props.round.layers.length - 1
                    this.addLayer(layer)
                    this.updateAvatarPositions()
                }
            }
        } else if (this.round.layers.length > this.props.round.layers.length) {
            // layer removed
            for (let layer of this.round.layers) {
                let newLayer = _.find(this.props.round.layers, { id: layer.id })
                if (_.isNil(newLayer)) {
                    console.log('removing layer', layer);
                    this.removeLayer(layer)
                }
            }
        }

        let previousSteps = []
        for (let layer of this.round.layers) {
            previousSteps.push(...layer.steps)
        }
        let newSteps = []
        this.stepLayerDictionary = {}
        for (let layer of this.props.round.layers) {
            for (let newStep of layer.steps) {
                newSteps.push(newStep)
                this.stepLayerDictionary[newStep.id] = layer
            }

        }
        for (let previousStep of previousSteps) {
            let newStep = _.find(newSteps, { id: previousStep.id })
            if (!_.isNil(newStep)) {
                if (!_.isEqual(previousStep, newStep)) {
                    console.log('found changed step', previousStep, newStep);
                    this.updateStep(newStep, true)
                }

            }
        }
        this.round = _.cloneDeep(this.props.round)
    }

    getStep (id) {
        let steps = []
        for (let layer of this.round.layers) {
            steps.push(...layer.steps)
        }
        return _.find(steps, { id })
    }

    draw () {
        console.log('draw()');
        this.clear()
        const _this = this
        // add layer button
        this.addLayerButton = this.container.circle(HTML_UI_Params.addNewLayerButtonDiameter).attr({ fill: '#fff' })
        this.addLayerButton.x((this.containerWidth / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.y((this.containerHeight / 2) - (HTML_UI_Params.addNewLayerButtonDiameter / 2))
        this.addLayerButton.click(() => {
            _this.onAddLayerClick()
        })

        // draw layers
        this.stepGrahpics = []
        let i = 0
        for (const layer of this.round.layers) {
            // add order parameter so we can calculate offsets (todo: add this when we create a layer?)
            layer.order = i++
            this.addLayer(layer)
        }
        // Create activity line
        this.drawAvatars()
        this.activityIndicator = this.container.circle(HTML_UI_Params.activityIndicatorDiameter).fill({ color: '#fff', opacity: 0 })
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
    }

    clear () {
        this.removeAllStepEventListeners()
        if (!_.isNil(this.container)) {
            this.container.clear()
        }
        if (!_.isNil(this.addLayerButton)) {
            this.addLayerButton.click(null)
        }
    }

    addLayer (layer) {
        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (layer.order + 1))
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        const layerGraphic = this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' }).stroke({ color: this.getUserColor(layer.creator), width: '6px' })
        layerGraphic.x(xOffset)
        layerGraphic.y(yOffset)

        // draw steps
        const stepSize = (2 * Math.PI) / layer.steps.length;
        const radius = layerDiameter / 2;
        let angle = Math.PI / -2; // start at -90 degrees so first step is at top
        let index = 0 // todo: remove this, reducer should be using id instead of index
        for (let step of layer.steps) {
            const x = Math.round(layerDiameter / 2 + radius * Math.cos(angle) - HTML_UI_Params.stepDiameter / 2) + xOffset;
            const y = Math.round(layerDiameter / 2 + radius * Math.sin(angle) - HTML_UI_Params.stepDiameter / 2) + yOffset;
            const stepGraphic = this.container.circle(HTML_UI_Params.stepDiameter)
            stepGraphic.stroke({ color: this.getUserColor(layer.creator), width: '6px' })
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.stepIndex = index++
            stepGraphic.layerIndex = layer.order
            stepGraphic.id = step.id
            stepGraphic.addClass('step')
            this.stepGraphics.push(stepGraphic)
            this.updateStep(step)
            this.addStepEventListeners(stepGraphic, step)
        }

    }

    removeLayer (layer) {
        //_.remove(this.round.layers, layer)
        this.draw()
    }

    updateStep (step, showActivityIndicator = false) {
        console.log('updateStep', step);
        if (!_.isEmpty(this.stepGraphics) && !_.isNil(step)) {
            const layer = this.stepLayerDictionary[step.id]
            const stepGraphic = _.find(this.stepGraphics, { id: step.id })
            console.log('updating step', stepGraphic, step.isOn, this.props.user.color);
            const _this = this
            if (showActivityIndicator) {
                // add delay so that graphic updates after activity indicator hits it
                _.delay(() => {
                    if (step.isOn) {
                        stepGraphic.animate(HTML_UI_Params.stepAnimationUpdateTime).attr({ fill: _this.getUserColor(layer.creator), 'fill-opacity': step.probability })
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
                    stepGraphic.attr({ fill: _this.getUserColor(layer.creator), 'fill-opacity': step.probability })
                    stepGraphic.transform({
                        scale: step.velocity
                    })
                } else {
                    stepGraphic.attr({ fill: '#282c34' })
                }
            }


        }
    }

    drawAvatars () {
        if (!_.isNil(this.props.collaboration)) {
            this.avatarGraphics = []
            const numberOfContributors = Object.entries(this.props.collaboration.contributors).length
            const totalAvatarHeight = (HTML_UI_Params.avatarDiameter * numberOfContributors) + (HTML_UI_Params.avatarPadding * (numberOfContributors - 1))
            const offsetY = (this.containerHeight / 2) - (totalAvatarHeight / 2)
            let x = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (this.round.layers.length)) + HTML_UI_Params.avatarRoundPadding
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

    updateAvatarPositions () {
        let x = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (this.round.layers.length)) + HTML_UI_Params.avatarRoundPadding
        for (let avatarGraphic of this.avatarGraphics) {
            avatarGraphic.x(x)
        }
    }

    animateActivityIndicator (userId, toX, toY) {
        const avatarGraphic = _.find(this.avatarGraphics, { id: userId })
        if (!_.isNil(this.activityIndicator) && !_.isNil(avatarGraphic)) {
            this.activityIndicator.fill({ color: this.getUserColor(userId), opacity: 1 })
            const fromX = avatarGraphic.x() + (HTML_UI_Params.avatarDiameter / 2)
            const fromY = avatarGraphic.y() + (HTML_UI_Params.avatarDiameter / 2)
            toX -= HTML_UI_Params.activityIndicatorDiameter / 2
            toY -= HTML_UI_Params.activityIndicatorDiameter / 2
            this.activityIndicator.move(fromX, fromY)
            const animation = this.activityIndicator.animate(HTML_UI_Params.activityAnimationTime).move(toX, toY).animate(HTML_UI_Params.activityAnimationTime * 1.3).fill({ opacity: 0 })
            /*animation.after(() => {
                this.activityIndicator.animate().fill({ opacity: 0 })
            })*/
        }
    }

    addRoundEventListeners () {
        const element = document.getElementById('round')
        const hammertime = new Hammer(element, {});
        hammertime.get('pinch').set({ enable: true });
        const _this = this
        this.scale = 1;
        this.last_scale = 1;
        hammertime.on('pinch', function (e) {
            _this.isZooming = true
            _this.scale = _this.last_scale * e.scale
            const width = _this.containerWidth / _this.scale
            const height = _this.containerHeight / _this.scale
            let x = (_this.containerWidth / 2) - (width / 2)
            let y = (_this.containerHeight / 2) - (height / 2)
            _this.container.viewbox(x, y, width, height)
        })
        hammertime.on('pinchend', function (e) {
            // add a slight delay to ensure pinchend logic happens after all other touch events have fired
            setTimeout(() => {
                _this.isZooming = false

            }, 100);
            _this.last_scale = _this.scale;
        })

    }

    addStepEventListeners (stepGraphic) {
        const _this = this
        stepGraphic.click(function () {
            _this.onStepClick(stepGraphic)
        })

        stepGraphic.hammertime = new Hammer(stepGraphic.node, {});
        stepGraphic.hammertime.get('pan').set({ enable: true });
        stepGraphic.hammertime.on('panstart', function (e) {
            const step = _this.getStep(stepGraphic.id)
            stepGraphic.probabilityPanStart = stepGraphic.probability = step.probability;
            stepGraphic.velocityPanStart = stepGraphic.velocity = step.velocity;
            _this.stepModal.show()
            _this.updateStepModal(stepGraphic)
        })
        stepGraphic.hammertime.on('pan', function (e) {
            if (!_this.isZooming) {
                if (stepGraphic.isPanningX) {
                    let delta = e.deltaX
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
                    _this.updateStepModal(stepGraphic)
                } else if (stepGraphic.isPanningY) {
                    let delta = e.deltaY
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
                    requestAnimationFrame(() => {
                        stepGraphic.transform({
                            scale: stepGraphic.velocity
                        })
                        _this.updateStepModal(stepGraphic)
                    })
                } else {
                    //console.log('not panning yet', e.deltaY);
                    if (Math.abs(e.deltaY) > 20) {
                        stepGraphic.isPanningY = true
                        _this.isPanning = true
                    } else if (Math.abs(e.deltaX) > 20) {
                        stepGraphic.isPanningX = true
                        _this.isPanning = true
                    }
                }
            }
        })
        stepGraphic.hammertime.on('panend', function (e) {
            if (stepGraphic.isPanningX) {
                const step = _this.getStep(stepGraphic.id)
                step.probability = stepGraphic.probability
                _this.props.dispatch({ type: SET_STEP_PROBABILITY, payload: { probability: stepGraphic.probability, layerIndex: stepGraphic.layerIndex, stepIndex: stepGraphic.stepIndex, user: _this.props.user.id } })
            } else if (stepGraphic.isPanningY) {
                const step = _this.getStep(stepGraphic.id)
                step.velocity = stepGraphic.velocity
                _this.props.dispatch({ type: SET_STEP_VELOCITY, payload: { velocity: stepGraphic.velocity, layerIndex: stepGraphic.layerIndex, stepIndex: stepGraphic.stepIndex, user: _this.props.user.id } })
            }
            stepGraphic.isPanningX = false;
            stepGraphic.isPanningY = false;
            _this.stepModal.hide()
            setTimeout(() => {
                _this.isPanning = false
            }, 100)
        })
    }

    removeAllStepEventListeners () {
        for (let stepGraphic of this.stepGraphics) {
            stepGraphic.click(null)
            stepGraphic.hammertime.off('pan')
            stepGraphic.hammertime.off('panstart')
            stepGraphic.hammertime.off('panend')
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
            this.props.dispatch({ type: TOGGLE_STEP, payload: { layerIndex: stepGraphic.layerIndex, stepIndex: stepGraphic.stepIndex, isOn: step.isOn, user: null } })
        }
    }

    onAddLayerClick () {
        const newLayer = getDefaultLayerData(this.props.user.id);
        this.props.dispatch({ type: ADD_ROUND_LAYER, payload: { layer: newLayer, user: this.props.user.id } })
    }

    addEventListeners () {
        const element = document.getElementById('round')
        const hammertime = new Hammer(element, {});
        hammertime.get('pinch').set({ enable: true });
    }

    onScrollWheel (e) {
        let currentViewBox = this.container.viewbox()
        let width = currentViewBox.width
        let height = currentViewBox.height
        let horizontalZoomAmount = e.deltaY
        let verticalZoomAmount = e.deltaY
        if (width <= 0) {
            width = this.containerWidth
        }
        if (height <= 0) {
            height = this.containerHeight
        }
        width = width + horizontalZoomAmount
        height = height + verticalZoomAmount
        if (width < 400) {
            width = 400
        }
        if (height < 400) {
            height = 400
        }
        let x = (this.containerWidth / 2) - (width / 2)
        let y = (this.containerHeight / 2) - (height / 2)
        this.container.viewbox(x, y, width, height)
    }

    getUserColor (id) {
        if (!_.isNil(this.props.collaboration)) {
            return this.props.collaboration.contributors[id].color
        }
        return this.props.user.color
    }

    render () {
        console.log('HTML UI render()');
        return (
            <div className="round" id="round" onWheel={this.onScrollWheel}></div>
        )
    }
}

const mapStateToProps = state => {
    // console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration
    };
};


export default connect(
    mapStateToProps
)(HtmlUi);