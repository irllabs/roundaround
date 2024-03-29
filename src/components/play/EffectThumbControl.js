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
    lockContainer: {
        display: 'flex',
        flexDirection: 'row',
        position: 'absolute',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
    },
    open: {
        display: 'flex',
        color: '#474747',
        zIndex: 1
    },
    locked: {
        display: 'flex',
        color: '#474747',
        zIndex: 1
    },
    iconDark: {
        color: '#474747'
    }
})

const thumbWidth = 32;
const thumbHeight = 32;
const containerWidth = thumbWidth + 46

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
        const isOn = this.props.isOn && this.props.isOverride;
        this.container = SVG()
            .addTo(element)
            .size(thumbWidth + 46, thumbHeight)
        this.background = this.container.rect(thumbWidth + 46, thumbHeight).fill('none').radius(24)
        this.thumb = this.container.nested()
        this.thumb.x(containerWidth - thumbWidth)
        this.thumb.addClass(this.props.classes.button)
        this.thumbBackground = this.thumb.rect(thumbWidth, thumbHeight).fill('#686868').radius(24)
        this.labelContainer = this.thumb.nested()
        this.label = this.labelContainer.svg(FX.getIcon(this.props.name))
        this.label.x((thumbWidth / 2) - (this.label.node.getBBox().width / 2))
        this.label.y((thumbHeight / 2) - (this.label.node.getBBox().height / 2))
        this.addEventListeners()

        if (isOn)
            this.setSwitchIsOn()
        else this.setSwitchIsOff()
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
                this.setSwitchIsOff()
            } else {
                x = 0
                this.isOn = true
                this.setSwitchIsOn()
            }
            this.thumb.x(x)
        })
        this.thumb.on('mousedown', (e) => {
            e.preventDefault()
            this.switchOn()
            this.dragStart = e.pageX
            this.thumbBackground.fill('#EAEAEA')
            document.addEventListener('mousemove', this.onMouseMove)
            document.addEventListener('mouseup', this.onMouseUp)
        })
    }
    onMouseMove(e) {
        e.preventDefault()
        let x = e.pageX - this.dragStart
        // stop minute difference from being used as moves
        if (x > 3 || x < -3) {
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
    }
    setSwitchIsOn = () => {
        this.thumb.x(0)
        this.thumbBackground.fill('#686868')
        this.switchOn()
    }
    setSwitchIsOff = () => {
        const x = containerWidth - thumbWidth
        this.thumb.x(x)
        this.thumbBackground.fill('#555555')
        this.switchOff();
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
            this.setSwitchIsOff()
        } else {
            x = 0
            this.isOn = true
            this.setSwitchIsOn()
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
        return (
            <Box className={classes.container}>
                <Box className={classes.lockContainer} style={{ left: 16 }}>
                    <img alt='open lock' src={OpenLock} className={classes.open} />
                </Box>
                <Box style={{ zIndex: 2, position: 'absolute' }}>
                    <Box ref={this.thumbControlRef} style={{ display: 'flex', zIndex: 2 }}></Box>
                </Box>
                <Box className={classes.lockContainer} style={{ right: 16 }}>
                    <img alt='locked' src={Lock} className={classes.locked} />
                </Box>
            </Box>
        )
    }
}
EffectThumbControl.propTypes = {
    classes: PropTypes.object.isRequired,
};
export default (withStyles(styles)(EffectThumbControl))