import React, { Component } from 'react'
import * as _ from 'lodash';
import { SVG } from '@svgdotjs/svg.js'
import { Save } from '@material-ui/icons';

const thumbWidth = 48;
const thumbHeight = 48;
const containerWidth = thumbWidth + 40

const styles = theme => ({
    root: {
        width: '120px',
        height: '100%',
        position: 'absolute',
        left: '0',
        top: '64px',
        borderTop: 'solid 1px rgba(255,255,255,0.1)'
    },
})

export default class EffectThumbControl extends Component {
    constructor (props) {
        super(props);
        this.thumbControlRef = React.createRef();
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.isOver = false
    }
    componentDidMount () {
        const element = this.thumbControlRef.current;
        this.container = SVG()
            .addTo(element)
            .size(thumbWidth + 40, thumbHeight)
        this.background = this.container.rect(thumbWidth + 40, thumbHeight).fill('none').radius(24)
        this.thumb = this.container.nested()
        this.thumbBackground = this.thumb.rect(thumbWidth, thumbHeight).radius(24)
        //this.thumbBackground.addClass(PatternThumb)
        this.updateThumbFill()
        //this.lock = this.container.rect(36, 36).fill('#ffffff')
        //this.lock.svg('<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>')
        this.label = this.thumb.plain(this.props.label)
        //this.label.addClass(styles.userPatternThumbText)
        this.label.font({
            family: 'Arial',
            size: 14,
            weight: 600
        })
        this.label.fill('#FFFFFF')
        this.label.x((thumbWidth / 2) - (this.label.node.getBBox().width / 2))
        this.label.y((thumbHeight / 2) - (this.label.node.getBBox().height / 2))
        this.arrowContainer = this.thumb.nested()
        this.arrowOverlay = this.arrowContainer.svg('<g><path d="M0 0h24v24H0z" fill="none"/><path fill="#ffffff" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></g>')
        this.arrowOverlay.x(12)
        this.arrowOverlay.y(12)
        this.arrowContainer.hide()
        this.saveContainer = this.thumb.nested()
        this.saveOverlay = this.saveContainer.svg('<g><path d="M0 0h24v24H0z" fill="none"/><path fill="#ffffff" d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></g>')
        this.saveOverlay.x(12)
        this.saveOverlay.y(12)
        this.saveContainer.hide()
        this.isAnimating = false
        this.addEventListeners()
    }
    componentDidUpdate () {
        // console.log('userPatternThumbControl::componentDidUpdate()', this.props.isSelected)
        this.updateThumbFill()
    }
    updateThumbFill () {
        //console.log('updateThumbFill() this.isAnimating', this.isAnimating);
        if (!this.isAnimating) {
            if (this.props.isFilled) {
                this.thumbBackground.stroke('none')
                if (this.props.isSelected || this.isOver) {
                    this.thumbBackground.fill('#999999')
                } else {
                    this.thumbBackground.fill('#555555')
                }
            } else {
                this.thumbBackground.fill('#000000')
                this.thumbBackground.stroke({ width: 1, color: '#555555', dasharray: '5,5' })
            }
        }
    }
    addEventListeners () {
        const _this = this
        this.thumb.on('touchstart', (e) => {
            e.preventDefault()
            this.dragStart = e.touches[0].pageX
        })
        this.thumb.on('touchmove', (e) => {
            e.preventDefault()
            let x = e.touches[0].pageX - this.dragStart

            if (x > containerWidth - thumbWidth) {
                x = containerWidth - thumbWidth
            } else if (x < 0) {
                x = 0
            }
            if (x > (containerWidth - thumbWidth) / 2) {
                this.saveContainer.show()
                this.label.hide()
            } else {
                this.saveContainer.hide()
                this.label.show()
            }
            this.thumb.x(x)
        })
        this.thumb.on('touchend', (e) => {
            e.preventDefault()
            const threshold = (containerWidth - thumbWidth) / 2
            let x = this.thumb.x()
            if (x < threshold) {
                x = 0
                this.load()
            } else {
                x = containerWidth - thumbWidth
                this.save()
            }
            this.thumb.x(x)
        })
        this.thumb.on('mousedown', (e) => {
            e.preventDefault()
            this.dragStart = e.pageX
            document.addEventListener('mousemove', this.onMouseMove)
            document.addEventListener('mouseup', this.onMouseUp)
        })
        this.thumb.on('mouseover', (e) => {
            this.isOver = true
            this.updateThumbFill()
            if (!this.props.isFilled) {
                this.arrowContainer.show()
                this.label.hide()
            }
        })
        this.thumb.on('mouseout', (e) => {
            this.isOver = false
            this.updateThumbFill()
            if (!this.props.isFilled) {
                this.arrowContainer.hide()
                this.label.show()
            }
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
        if (x > (containerWidth - thumbWidth) / 2) {
            this.saveContainer.show()
            this.label.hide()
            this.arrowContainer.hide()
        } else {
            this.saveContainer.hide()
            if (!this.props.isFilled) {
                this.arrowContainer.show()
            } else {
                this.label.show()
            }
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
        this.isAnimating = true
        this.thumb.animate().x(0)
        const _this = this

        this.props.savePattern(this.props.id)
        this.thumbBackground.animate({ delay: 500, duration: 400, when: 'now' }).attr({
            fill: '#ffffff'
        }).after(() => {
            this.arrowContainer.hide()
            this.saveContainer.hide()
            this.label.show()
        }).animate({ duration: 1000 }).attr({
            fill: '#999999'
        }).after(() => {
            console.log('finished save animation');
            _this.isAnimating = false
            _this.updateThumbFill()
        })
    }
    load () {
        this.props.loadPattern(this.props.id)
    }
    render () {
        let saveStyles = { color: '#555555', position: 'absolute', right: '10px', top: '12px', zIndex: 1 }
        if (this.props.needsSaving && this.props.isSelected) {
            saveStyles.color = '#ffffff'
        }
        return (
            <div style={{ width: '88px', height: '48px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '24px', position: 'relative', marginBottom: '0.5rem' }}>
                <Save fontSize="small" style={saveStyles} />
                <div style={{ zIndex: 2, position: 'absolute' }}>
                    <div ref={this.thumbControlRef} style={{ display: 'flex', zIndex: 2 }}></div>
                </div>
            </div >

        )
    }
}
