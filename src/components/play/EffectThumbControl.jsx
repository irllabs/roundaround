import React, { Component } from 'react'
import { SVG } from '@svgdotjs/svg.js'
import FX from '../../audio-engine/FX'
import OpenLock from './layer-settings/resources/svg/openLock.svg';
import Lock from './layer-settings/resources/svg/lock.svg';

const thumbWidth = 32;
const thumbHeight = 32;
const containerWidth = thumbWidth + 46

class EffectThumbControl extends Component {
    constructor(props) {
        super(props);
        this.thumbControlRef = React.createRef();
        this.switchRef = React.createRef();
        this.isOn = this.props.isOn;
        this.isOverride = this.props.isOverride;
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.onKeyDown = this.onKeyDown.bind(this)
    }
    componentDidMount() {
        const element = this.thumbControlRef.current;
        const isOn = this.props.isOn && this.props.isOverride;
        this.isOn = isOn
        this.container = SVG()
            .addTo(element)
            .size(thumbWidth + 46, thumbHeight)
        this.background = this.container.rect(thumbWidth + 46, thumbHeight).fill('none').radius(24)
        this.thumb = this.container.nested()
        this.thumb.x(containerWidth - thumbWidth)
        // SVG.js only ever needed the string; this used to come from JSS as classes.button.
        this.thumb.addClass('cursor-pointer')
        this.thumbBackground = this.thumb.rect(thumbWidth, thumbHeight).fill('#686868').radius(24)
        this.labelContainer = this.thumb.nested()
        this.label = this.labelContainer.svg(FX.getIcon(this.props.name))
        this.label.x((thumbWidth / 2) - (this.label.node.getBBox().width / 2))
        this.label.y((thumbHeight / 2) - (this.label.node.getBBox().height / 2))
        this.addEventListeners()

        // Show the saved state without reporting it back: mounting used to call the switch
        // handlers, which wrote every effect's state to Firestore on each round load.
        this.renderSwitchState(isOn)
    }

    componentDidUpdate(prevProps) {
        const wasOn = prevProps.isOn && prevProps.isOverride
        const isOn = this.props.isOn && this.props.isOverride
        if (wasOn !== isOn && !this.isDragging) {
            this.isOn = isOn
            this.renderSwitchState(isOn)
        }
    }

    componentWillUnmount() {
        document.removeEventListener('mousemove', this.onMouseMove)
        document.removeEventListener('mouseup', this.onMouseUp)
    }

    /**
     * Positions and colours the thumb for a state, and says the same thing to anyone not looking at
     * it: the switch carries `aria-checked` for a screen reader and `data-on` for a test. No side
     * effects -- reporting the change to the round is the callers' job.
     */
    renderSwitchState(isOn) {
        if (!this.thumb) {
            return
        }
        this.thumb.x(isOn ? 0 : containerWidth - thumbWidth)
        this.thumbBackground.fill(isOn ? '#686868' : '#555555')
        const node = this.switchRef.current
        if (node) {
            node.setAttribute('aria-checked', String(isOn === true))
            node.setAttribute('data-on', String(isOn === true))
        }
    }

    /**
     * The switch is dragged with a pointer, which a keyboard cannot do: Enter and Space toggle it
     * instead, as they do on any switch. Without this the effects are the one control on the round
     * that cannot be reached without a mouse or a finger.
     */
    onKeyDown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') {
            return
        }
        e.preventDefault()
        // PlayUI listens for keydown on `window` and starts the round on Space for any target that
        // is not an input, textarea, select or contenteditable (KEY_MAPPINGS.playToggle). React
        // delegates to the root container, inside window, so without this switching an effect from
        // the keyboard would also start playback -- the same guard EffectsSidebar's minimize has.
        e.stopPropagation()
        if (this.isOn) {
            this.isOn = false
            this.setSwitchIsOff()
        } else {
            this.isOn = true
            this.setSwitchIsOn()
        }
    }

    addEventListeners() {
        this.thumb.on('touchstart', (e) => {
            e.preventDefault()
            this.isDragging = true
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
            this.isDragging = false
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
            this.isDragging = true
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
    // User gestures end here: show the state and report it once.
    setSwitchIsOn = () => {
        this.renderSwitchState(true)
        this.switchOn()
    }
    setSwitchIsOff = () => {
        this.renderSwitchState(false)
        this.switchOff();
    }
    onMouseUp(e) {
        e.preventDefault()
        this.isDragging = false
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
        // The thumb inside is drawn with SVG.js and dragged, so the switch itself is this element:
        // it carries the name, the state and the keyboard. `data-effect` names which effect it is,
        // since a round has six of them side by side.
        const isOn = this.props.isOn && this.props.isOverride
        return (
            <div
                data-test="effect-switch"
                data-effect={this.props.name}
                className="relative m-[0.2rem] flex h-12 w-24 flex-col items-center justify-center rounded-[24px] border border-white/10"
            >
                <div className="absolute left-4 flex h-full flex-row items-center justify-center">
                    <img alt='open lock' src={OpenLock} className="z-[1] flex h-4 w-3" />
                </div>
                <div className="absolute z-[2]">
                    <div
                        ref={this.switchRef}
                        role="switch"
                        aria-checked={isOn}
                        aria-label={this.props.label}
                        tabIndex={0}
                        onKeyDown={this.onKeyDown}
                        data-on={String(isOn)}
                        className="z-[2] flex rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    >
                        <div ref={this.thumbControlRef} className="z-[2] flex"></div>
                    </div>
                </div>
                <div className="absolute right-4 flex h-full flex-row items-center justify-center">
                    <img alt='locked' src={Lock} className="z-[1] flex h-4 w-3" />
                </div>
            </div>
        )
    }
}
export default EffectThumbControl