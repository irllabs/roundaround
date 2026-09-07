import React, { Component } from 'react'
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import CallIcon from '@material-ui/icons/Call';
import CallEndIcon from '@material-ui/icons/CallEnd';

const styles = theme => ({
    root: {
        position: 'absolute',
        top: 0,
        left: -600
    },
    micButton: {
        backgroundColor: theme.palette.secondary.main,
        marginRight: '1rem'
    },
    micButtonOn: {
        color: theme.palette.secondary.main,
        backgroundColor: theme.palette.primary.main,
        marginRight: '1rem',
        '&:hover': {
            backgroundColor: theme.palette.primary.dark,
        }
    }
})

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
        const { classes } = this.props;
        return (
            <>
                {
                    !this.state.isEnabled &&
                    <IconButton className={classes.micButton} onClick={this.join}>
                        <CallIcon />
                    </IconButton>

                }
                {
                    (this.state.isEnabled && this.state.isConnecting) &&
                    <IconButton className={classes.micButton}>
                        <CircularProgress size={24} />
                    </IconButton>
                }
                {
                    (this.state.isEnabled && !this.state.isConnecting) &&
                    <IconButton className={classes.micButtonOn} onClick={this.leave}>
                        <CallEndIcon />
                    </IconButton>
                }
                {
                    this.state.micIsEnabled &&
                    <IconButton className={classes.micButton} onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicIcon />
                    </IconButton>

                }
                {
                    !this.state.micIsEnabled &&
                    <IconButton className={classes.micButton} onClick={this.onMicClick} disabled={!this.state.isEnabled}>
                        <MicOffIcon />
                    </IconButton>

                }
                <div className={classes.root}>
                    <div id="jaas-container" style={{ height: "100%" }}></div>
                </div >
            </>
        )
    }
}

JitsiComponent.propTypes = {
    classes: PropTypes.object.isRequired,
};

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
)(withStyles(styles)(JitsiComponent));
