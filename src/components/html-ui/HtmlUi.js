import React, { Component } from 'react';
import * as _ from 'lodash';
import Hammer from 'hammerjs'
import './HtmlUi.scss'
import { SVG } from '@svgdotjs/svg.js'
import { HTML_UI_Params } from './Constants.js'
import { connect } from "react-redux";

import { getDefaultLayerData } from '../../utils/dummyData';
import { TOGGLE_STEP } from '../../redux/actionTypes'
import { ADD_ROUND_LAYER } from '../../redux/actionTypes'

class HtmlUi extends Component {
    constructor (props) {
        super(props)
        this.isZooming = false
        this.isPanning = false
        this.stepGraphics = []
        console.log('props', props);
        this.onScrollWheel = this.onScrollWheel.bind(this)
    }

    componentDidMount () {
        this.createRound()
        this.addRoundEventListeners()
    }

    createRound () {
        console.log('createRound()');
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
        this.draw()
    }

    componentDidUpdate () {
        this.clear()
        this.draw()
    }

    draw () {
        console.log('draw()');
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
        for (const layer of this.props.round.layers) {
            // add order parameter so we can calculate offsets (todo: add this when we create a layer?)
            layer.order = i++
            this.drawLayer(layer)
        }
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

    drawLayer (layer) {
        const layerDiameter = HTML_UI_Params.addNewLayerButtonDiameter + HTML_UI_Params.initialLayerPadding + ((HTML_UI_Params.stepDiameter + HTML_UI_Params.layerPadding + HTML_UI_Params.layerPadding + HTML_UI_Params.stepDiameter) * (layer.order + 1))
        const xOffset = (this.containerWidth / 2) - (layerDiameter / 2)
        const yOffset = (this.containerHeight / 2) - (layerDiameter / 2)
        const layerGraphic = this.container.circle(layerDiameter, layerDiameter).attr({ fill: 'none' }).stroke({ color: this.props.user.color, width: '6px' })
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
            stepGraphic.stroke({ color: this.props.user.color, width: '6px' })
            stepGraphic.x(x)
            stepGraphic.y(y)
            angle += stepSize
            stepGraphic.stepIndex = index++
            stepGraphic.layerIndex = layer.order
            stepGraphic.addClass('step')
            this.stepGrahpics.push(stepGraphic)
            this.updateStep(stepGraphic, step)
            this.addStepEventListeners(stepGraphic, step)
        }
    }

    updateStep (stepGraphic, step) {
        if (step.isOn) {
            stepGraphic.attr({ fill: this.props.user.color, 'fill-opacity': step.probability })
            stepGraphic.transform({
                scale: step.velocity
            })
        } else {
            stepGraphic.attr({ fill: '#282c34' })
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

    addStepEventListeners (stepGraphic, step) {
        const _this = this
        stepGraphic.click(function () {
            _this.onStepClick(stepGraphic, step)
        })

        stepGraphic.hammertime = new Hammer(stepGraphic.node, {});
        stepGraphic.hammertime.get('pan').set({ enable: true });
        stepGraphic.hammertime.on('panstart', function (e) {
            stepGraphic.probabilityPanStart = step.probability;
            stepGraphic.velocityPanStart = step.velocity;
            //console.log('step.velocity', step.velocity);
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
                    step.probability = delta * stepGraphic.probabilityPanStart;
                    if (step.probability < 0.3) {
                        step.probability = 0.3
                    } else if (step.probability > 1) {
                        step.probability = 1
                    }
                    _this.updateStep(stepGraphic, step)
                } else if (stepGraphic.isPanningY) {
                    let delta = e.deltaY
                    if (delta < -100) {
                        delta = -100
                    }
                    delta = delta / -100
                    delta += 1
                    //console.log('delta', delta);
                    console.log('stepGraphic.isPanningY', e.deltaY, delta, delta * stepGraphic.velocityPanStart);
                    step.velocity = delta * stepGraphic.velocityPanStart;
                    if (step.velocity < 0.5) {
                        step.velocity = 0.5
                    } else if (step.velocity > 1) {
                        step.velocity = 1
                    }
                    _this.updateStep(stepGraphic, step)
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
            console.log('');
            stepGraphic.isPanningX = false;
            stepGraphic.isPanningY = false;
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

    onStepClick (stepGraphic, step) {
        if (!this.isPanning) {
            this.props.dispatch({ type: TOGGLE_STEP, payload: { layerIndex: stepGraphic.layerIndex, stepIndex: stepGraphic.stepIndex, isOn: !step.isOn, user: null } })
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

    render () {
        console.log('HTML UI render()');
        return (
            <div className="round" id="round" onWheel={this.onScrollWheel}></div>
        )
    }
}

const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration
    };
};


export default connect(
    mapStateToProps
)(HtmlUi);