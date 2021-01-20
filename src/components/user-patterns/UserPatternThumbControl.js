import React, { Component } from 'react'
import * as _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import { Save } from '@material-ui/icons';

const thumbWidth = 48;
const thumbHeight = 48;
const containerWidth = thumbWidth + 40

export default class EffectThumbControl extends Component {
    constructor (props) {
        super(props);
        this.thumbControlRef = React.createRef();
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
    }
    componentDidMount () {
        const element = this.thumbControlRef.current;
        this.container = SVG()
            .addTo(element)
            .size(thumbWidth + 40, thumbHeight)
        this.background = this.container.rect(thumbWidth + 40, thumbHeight).fill('none').radius(24)
        this.thumb = this.container.nested()
        this.thumbBackground = this.thumb.rect(thumbWidth, thumbHeight).radius(24)
        this.updateThumbFill()
        //this.lock = this.container.rect(36, 36).fill('#ffffff')
        //this.lock.svg('<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>')
        this.label = this.thumb.plain(this.props.label)
        this.label.font({
            family: 'Arial',
            size: 14,
            weight: 600
        })
        this.label.fill('#FFFFFF')
        this.label.x((thumbWidth / 2) - (this.label.node.getBBox().width / 2))
        this.label.y((thumbHeight / 2) - (this.label.node.getBBox().height / 2))
        this.addEventListeners()
    }
    updateThumbFill () {
        if (this.props.isFilled) {
            this.thumbBackground.fill('#555555')
            this.thumbBackground.stroke('none')
        } else {
            this.thumbBackground.fill('#000000')
            this.thumbBackground.stroke({ width: 1, color: '#555555', dasharray: '5,5' })
        }
    }
    addEventListeners () {
        const _this = this
        this.thumb.on('touchstart', (e) => {
            e.preventDefault()
            console.log('touchstart', e, e.touches.length - 1);
            this.switchOn()
            this.touchIndex = e.touches.length - 1
            this.dragStart = e.touches[this.touchIndex].pageX
            this.thumbBackground.fill('#FFFFFF')
            this.label.fill('#222222')
        })
        this.thumb.on('touchmove', (e) => {
            e.preventDefault()
            let x = e.touches[this.touchIndex].pageX - this.dragStart
            if (this.isOn) {
                x = (containerWidth - thumbWidth) + e.touches[this.touchIndex].pageX - this.dragStart
            }
            console.log('touchmove', this.touchIndex, e, 'x', x);
            if (x > containerWidth - thumbWidth) {
                x = containerWidth - thumbWidth
            } else if (x < 0) {
                x = 0
            }
            this.thumb.x(x)
        })
        this.thumb.on('touchend', (e) => {
            e.preventDefault()
            const threshold = (containerWidth - thumbWidth) / 2
            let x = this.thumb.x()
            if (x < threshold) {
                x = 0
                this.isOn = false
                this.thumbBackground.fill('#555555')
                this.label.fill('#FFFFFF')
                this.switchOff()
            } else {
                x = containerWidth - thumbWidth
                this.isOn = true
                //this.thumbBackground.fill('#555555')
                // this.label.fill('#FFFFFF')
            }
            this.thumb.x(x)
        })
        this.thumb.on('mousedown', (e) => {
            e.preventDefault()
            this.dragStart = e.pageX
            document.addEventListener('mousemove', this.onMouseMove)
            document.addEventListener('mouseup', this.onMouseUp)
        })
    }
    onMouseMove (e) {
        e.preventDefault()
        let x = e.pageX - this.dragStart
        if (x > containerWidth - thumbWidth) {
            x = containerWidth - thumbWidth
        } else if (x < 0) {
            x = 0
        }
        this.thumb.x(x)
    }
    onMouseUp (e) {
        e.preventDefault()
        document.removeEventListener('mouseup', this.onMouseUp)
        document.removeEventListener('mousemove', this.onMouseMove)

        const threshold = (containerWidth - thumbWidth) / 2
        let x = this.thumb.x()
        if (x < threshold) {
            x = 0
            // load this pattern
            this.load()
        } else {
            x = containerWidth - thumbWidth
            this.save()
        }
        this.thumb.x(x)
    }
    save () {
        this.thumb.animate().x(0)
        this.thumbBackground.animate().attr({
            fill: '#555555',
            stroke: 'none'
        })
        this.props.savePattern(this.props.id)
    }
    load () {
        this.props.loadPattern(this.props.id)
    }
    render () {
        return (
            <div style={{ width: '88px', height: '48px', backgroundColor: '#222222', borderRadius: '24px', position: 'relative', marginBottom: '0.5rem' }}>
                <Save fontSize="small" style={{ color: '#555555', position: 'absolute', right: '10px', top: '12px', zIndex: 1 }} />
                <div style={{ zIndex: 2, position: 'absolute' }}>
                    <div ref={this.thumbControlRef} style={{ display: 'flex', zIndex: 2 }}></div>
                </div>
            </div >

        )
    }
}
