import React, { Component } from 'react'
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
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

        const roomName = this.props.roomName
        const tokenResult = await this.context.getJitsiToken(this.props.user.id, '', '', '')
        console.log('jitsi token', tokenResult);
        const jwt = tokenResult.data.token;

        // eslint-disable-next-line no-undef
        this.api = new JitsiMeetExternalAPI("8x8.vc", {
            roomName: "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71/" + roomName,
            width: 600,
            height: 400,
            userInfo: {
                email: 'john.doe@company.com',
                displayName: 'Qwe'
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
            console.log('videoConferenceJoined', e);
            let isVideoMuted = await _this.api.isVideoMuted()
            console.log('isVideoMuted', isVideoMuted);
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
        this.api.executeCommand('hangup');
        this.api.dispose()
    }

    async onMicClick () {
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
    //console.log('mapStateToProps', state);
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
