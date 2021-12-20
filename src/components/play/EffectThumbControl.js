import React, { Component } from 'react'
import { SVG } from '@svgdotjs/svg.js'
//import { LockOpen, Lock } from '@material-ui/icons';
import FX from '../../audio-engine/FX'
import { Box } from '@material-ui/core';
import OpenLock from './layer-settings/resources/svg/openLock.svg';
import Lock from './layer-settings/resources/svg/lock.svg';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';

const styles = theme => ({
    button: {
        cursor: 'pointer',
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '96px',
        height: '48px',
        borderRadius: '24px',
        position: 'relative',
        margin: '0.2rem',
        border: '1px solid rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    open: {
        color: '#474747',
        position: 'absolute',
        left: '10px',
        top: '12px',
        zIndex: 1
    },
    locked: {
        color: '#474747',
        position: 'absolute',
        right: '10px',
        top: '12px',
        zIndex: 1
    },
    iconDark: {
        color: '#474747'
    }
})

const thumbWidth = 32;
const thumbHeight = 32;
const containerWidth = thumbWidth + 45

class EffectThumbControl extends Component {
    constructor(props) {
        super(props);
        this.thumbControlRef = React.createRef();
        this.isOn = this.props.isOn;
        this.isOverride = this.props.isOverride;
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
    }
    componentDidMount() {
        const element = this.thumbControlRef.current;
        this.container = SVG()
            .addTo(element)
            .size(thumbWidth + 45, thumbHeight)
        this.background = this.container.rect(thumbWidth + 45, thumbHeight).fill('none').radius(24)
        this.thumb = this.container.nested()
        this.thumb.x(containerWidth - thumbWidth)
        this.thumb.addClass(this.props.classes.button)
        this.thumbBackground = this.thumb.rect(thumbWidth, thumbHeight).fill('#575757').radius(24)
        this.labelContainer = this.thumb.nested()
        this.label = this.labelContainer.svg(FX.getIcon(this.props.name))
        this.label.x((thumbWidth / 2) - (this.label.node.getBBox().width / 2))
        this.label.y((thumbHeight / 2) - (this.label.node.getBBox().height / 2))
        this.addEventListeners();
        if (this.isOn && this.isOverride)
            this.setSwitchIsOn();
    }
    addEventListeners() {
        this.thumb.on('touchstart', (e) => {
            e.preventDefault()
            this.switchOn()
            this.touchIndex = e.touches.length - 1
            this.dragStart = e.touches[this.touchIndex].pageX
            this.thumbBackground.fill('#EAEAEA')
        })
        this.thumb.on('touchmove', (e) => {
            e.preventDefault()
            let x = e.touches[this.touchIndex].pageX - this.dragStart
            if (!this.isOn) {
                x = (containerWidth - thumbWidth) + e.touches[this.touchIndex].pageX - this.dragStart
            }
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
            if (x > threshold) {
                x = containerWidth - thumbWidth
                this.isOn = false
                this.thumbBackground.fill('#575757')
                this.label.removeClass(this.props.classes.iconDark)
                this.switchOff()
            } else {
                x = 0
                this.isOn = true
                this.thumbBackground.fill('#474747')
                this.label.addClass(this.props.classes.iconDark)
            }
            this.thumb.x(x)
        })
        this.thumb.on('mousedown', (e) => {
            e.preventDefault()
            this.switchOn()
            this.dragStart = e.pageX
            this.thumbBackground.fill('#575757')
            this.label.addClass(this.props.classes.iconDark)
            document.addEventListener('mousemove', this.onMouseMove)
            document.addEventListener('mouseup', this.onMouseUp)
        })
    }
    onMouseMove(e) {
        e.preventDefault()
        let x = e.pageX - this.dragStart
        if (!this.isOn) {
            x = (containerWidth - thumbWidth) + e.pageX - this.dragStart
        }
        if (x > containerWidth - thumbWidth) {
            x = containerWidth - thumbWidth
        } else if (x < 0) {
            x = 0
        }
        this.thumb.x(x)
    }
    setSwitchIsOn = () => {
        this.thumb.x(0);
        this.thumbBackground.fill('#474747')
        this.switchOn();
    }
    onMouseUp(e) {
        e.preventDefault()
        document.removeEventListener('mouseup', this.onMouseUp)
        document.removeEventListener('mousemove', this.onMouseMove)

        const threshold = (containerWidth - thumbWidth) / 2
        let x = this.thumb.x()
        if (x > threshold) {
            x = containerWidth - thumbWidth
            this.isOn = false;
            this.switchOff()
            this.thumbBackground.fill('#474747')
            this.label.removeClass(this.props.classes.iconDark)
        } else {
            x = 0
            this.isOn = true
            this.label.addClass(this.props.classes.iconDark)
        }
        this.thumb.x(x)
    }
    switchOn() {
        this.props.switchOn(this.props.fxId)
    }
    switchOff() {
        this.props.switchOff(this.props.fxId)
    }
    render() {
        const { classes } = this.props;
        console.log('this is on', this.isOn)
        return (
            <Box className={classes.container}>
                <img alt='open lock' src={OpenLock} className={classes.open} />
                <Box style={{ zIndex: 2, position: 'absolute' }}>
                    <Box ref={this.thumbControlRef} style={{ display: 'flex', zIndex: 2 }}></Box>
                </Box>
                <img alt='locked' src={Lock} className={classes.locked} />
            </Box >
        )
    }
}
EffectThumbControl.propTypes = {
    classes: PropTypes.object.isRequired,
};
export default (withStyles(styles)(EffectThumbControl))