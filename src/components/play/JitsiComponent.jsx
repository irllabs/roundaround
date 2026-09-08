import React, { Component } from 'react'
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import _ from 'lodash';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CallIcon, CallEndIcon, MicIcon, MicOffIcon } from '@/components/icons';

class JitsiComponent extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props);
        this.state = {
            isEnabled: false,
            isConnecting: false
        }
        this.join = this.join.bind(this)
        this.leave = this.leave.bind(this)
        this.onMicClick = this.onMicClick.bind(this)
    }

    async join () {
        this.setState({
            isEnabled: true,
            isConnecting: true,
            micIsEnabled: true
        })

        if (typeof window.JitsiMeetExternalAPI === 'undefined' || _.isNil(this.props.round)) {
            this.setState({ isEnabled: false, isConnecting: false })
            return
        }
        let tokenResult
        try {
            // The backend decides the tenant and the room; the client only says which round it is in.
            tokenResult = await this.context.getJitsiToken(this.props.round.id)
        } catch (e) {
            console.error('Could not get a voice chat token', e)
            this.setState({ isEnabled: false, isConnecting: false })
            return
        }
        const { token: jwt, appId, room } = tokenResult

        this.api = new window.JitsiMeetExternalAPI("8x8.vc", {
            roomName: appId + "/" + room,
            width: 600,
            height: 400,
            userInfo: {
                displayName: this.props.user && this.props.user.displayName ? this.props.user.displayName : 'Guest'
            },
            configOverwrite: {
                prejoinPageEnabled: false,
                startVideoMuted: true,
                disableInviteFunctions: true
            },
            parentNode: document.querySelector('#jaas-container'),
            jwt
        });
        const _this = this
        this.api.on('videoConferenceJoined', async (e) => {
            let isVideoMuted = await _this.api.isVideoMuted()
            if (!isVideoMuted) {
                _this.api.executeCommand('toggleVideo');

                _this.setState({
                    isConnecting: false
                })

            }
        })
    }

    leave () {
        this.setState({
            isEnabled: false,
            isConnecting: false
        })
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose()
            this.api = null
        }
    }

    componentWillUnmount () {
        if (this.api) {
            this.api.dispose()
            this.api = null
        }
    }

    async onMicClick () {
        if (!this.api) return
        let audioIsMuted = await this.api.isAudioMuted()
        this.api.executeCommand('toggleAudio');
        audioIsMuted = !audioIsMuted
        this.setState({
            micIsEnabled: !audioIsMuted
        })
    }


    render () {
        // `border-0` on every one of these, the way the header's share button carries it: the
        // generated Button's base is `border border-transparent bg-clip-padding`, so a filled
        // 48px IconButton paints its circle 46px across and 1px in from the box it lays out.
        // `disabled:opacity-100 disabled:text-white/30` is MUI's `action.disabled`, which changes
        // the glyph's colour and nothing else, against the base's `disabled:opacity-50`.
        return (
            <>
                {!this.state.isEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Start voice chat" className="mr-4 border-0 bg-secondary hover:bg-secondary" onClick={this.join}>
                        <CallIcon />
                    </Button>
                }
                {(this.state.isEnabled && this.state.isConnecting) &&
                    <Button type="button" variant="plain" size="icon-round" disabled aria-label="Connecting to voice chat" className="mr-4 border-0 bg-secondary hover:bg-secondary disabled:opacity-100">
                        <Spinner className="size-6 text-primary" />
                    </Button>
                }
                {(this.state.isEnabled && !this.state.isConnecting) &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Leave voice chat" className="mr-4 border-0 bg-primary text-secondary hover:bg-[#AAAAAA]" onClick={this.leave}>
                        <CallEndIcon />
                    </Button>
                }
                {this.state.micIsEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Mute the microphone" className="mr-4 border-0 bg-secondary hover:bg-secondary disabled:opacity-100 disabled:text-white/30" onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicIcon />
                    </Button>
                }
                {!this.state.micIsEnabled &&
                    <Button type="button" variant="plain" size="icon-round" aria-label="Unmute the microphone" className="mr-4 border-0 bg-secondary hover:bg-secondary disabled:opacity-100 disabled:text-white/30" onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicOffIcon />
                    </Button>
                }
                <div className="absolute left-[-600px] top-0" data-test="voice-chat">
                    <div id="jaas-container" className="h-full"></div>
                </div>
            </>
        )
    }
}

const mapStateToProps = state => {
    return {
        round: state.round,
        display: state.display,
        user: state.user
    };
};


export default connect(
    mapStateToProps, {

}
)(JitsiComponent);
