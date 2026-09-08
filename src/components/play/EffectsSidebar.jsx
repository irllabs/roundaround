import React, { Component } from 'react'
import { connect } from "react-redux"
import AudioEngine from "../../audio-engine/AudioEngine"
import { FirebaseContext } from '../../firebase'
import { setUserBusFxOverride } from "../../redux/actions"
import EffectThumbControl from './EffectThumbControl'
import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import _ from 'lodash'

const toTitleCase = (str) => {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}


class EffectsSidebar extends Component {
    static contextType = FirebaseContext;
    constructor(props) {
        super(props)
        this.state = {
            isMinimized: false
        }
        this.onSwitchOn = this.onSwitchOn.bind(this)
        this.onSwitchOff = this.onSwitchOff.bind(this)
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
        this.onMinimizeKeyDown = this.onMinimizeKeyDown.bind(this)
    }

    onSwitchOn(fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = true
        this.props.setUserBusFxOverride(this.props.user.id, fxId, true)
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = true
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onSwitchOff(fxId) {
        AudioEngine.busesByUser[this.props.user.id].fx[fxId].override = false
        this.props.setUserBusFxOverride(this.props.user.id, fxId, false)
        let userBus = _.cloneDeep(this.props.round.userBuses[this.props.user.id])
        let fx = _.find(userBus.fx, { id: fxId })
        fx.isOverride = false
        this.context.updateUserBus(this.props.round.id, this.props.user.id, userBus)
    }
    onMinimizeClick() {
        this.setState({ isMinimized: !this.state.isMinimized })
    }
    onMinimizeKeyDown(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        // PlayUI puts a keydown listener on `window` that toggles playback on Space for any
        // target that is not an input, textarea, select or contenteditable
        // (src/utils/constants.js: KEY_MAPPINGS.playToggle is ' '). React delegates to the root
        // container, which is inside window, so without this the sequencer would start playing
        // every time someone minimized the sidebar from the keyboard.
        event.stopPropagation()
        this.onMinimizeClick()
    }
    render() {
        let items = []
        if (!_.isNil(this.props.round) && !_.isNil(this.props.round.userBuses) && !_.isNil(this.props.round.userBuses[this.props.user.id])) {
            for (const fx of this.props.round.userBuses[this.props.user.id].fx) {
                let item = {
                    id: fx.id,
                    isOn: fx.isOn,
                    isOverride: fx.isOverride,
                    label: fx.name,
                    userId: this.props.user.id,
                    name: fx.name
                }
                items.push(item)
            }
        }
        return (
            <div className={cn('absolute top-16 flex h-[calc(100%-64px)] w-[120px] flex-col items-center justify-center border-t border-white/10 [transition:right_0.4s]',
                this.state.isMinimized ? '-right-[120px]' : 'right-0')}>
                <div id="effects-sidebar-effects" className="relative flex h-[352px] w-[120px] flex-col items-center justify-center rounded-l-lg bg-[rgba(47,47,47,0.9)]">
                    {/* A div, not a button: capture.py's CHEVRON finds this control as the only
                        32x32 div holding an svg on the right-hand edge. */}
                    <div
                        className={cn('absolute -left-10 top-3 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-[rgba(47,47,47,0.9)] [transition:transform_0.4s]',
                            this.state.isMinimized && '[transform:rotateY(180deg)]')}
                        role="button"
                        tabIndex={0}
                        aria-label={this.state.isMinimized ? 'Show the effects' : 'Hide the effects'}
                        aria-expanded={!this.state.isMinimized}
                        aria-controls="effects-sidebar-effects"
                        onClick={this.onMinimizeClick}
                        onKeyDown={this.onMinimizeKeyDown}
                    >
                        <ChevronRightIcon />
                    </div>
                    {items.map((fx) => (
                        <EffectThumbControl key={fx.id} isOn={fx.isOn} isOverride={fx.isOverride} label={toTitleCase(fx.label)} fxId={fx.id} userId={fx.userId} switchOn={this.onSwitchOn} switchOff={this.onSwitchOff} name={fx.name} />
                    ))}
                </div>
            </div>
        )
    }
}
const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        display: state.display
    }
}

export default connect(
    mapStateToProps, { setUserBusFxOverride }
)(EffectsSidebar)