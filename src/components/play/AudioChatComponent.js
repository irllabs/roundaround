import React, { Component } from 'react'
import { connect } from "react-redux";
import { FirebaseContext } from '../../firebase';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import IconButton from '@material-ui/core/IconButton';
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

class AudioChatComponent extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props);
        this.state = {
            isEnabled: false,
            micIsEnabled: true
        }
        this.join = this.join.bind(this)
        this.leave = this.leave.bind(this)
        this.onMicClick = this.onMicClick.bind(this)
        this.onConnected = this.onConnected.bind(this);

        document.body.addEventListener('connected', this.onConnected, false);
    }

    async join () {
        this.setState({
            isEnabled: true
        })
    }

    leave () {
        this.setState({
            isEnabled: false
        })
    }

    async onMicClick () {
        this.setState((prevState) => {
            window.NAF.connection.adapter.enableMicrophone(!prevState.micIsEnabled);

            return {
                ...prevState,
                micIsEnabled: !prevState.micIsEnabled
            }
        })
    }

    onConnected() {
        window.NAF.connection.adapter.enableMicrophone(this.state.micIsEnabled);
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
                    (this.state.isEnabled) &&
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

                {this.state.isEnabled &&
                <a-scene
                    embedded
                    networked-scene={`
                        serverURL: comms.simplevr.irl.studio;
                        app: Roundaround;
                        room: ${this.props.roomName};
                        audio: true;
                        adapter: easyrtc;
                        debug: true;
                        connectOnLoad: 'true';
                    `}
                >
                    <a-assets>
                        <template
                            id='avatar-template'
                            dangerouslySetInnerHTML={{
                                __html: '<a-entity networked-audio-source />'
                            }}
                        />
                    </a-assets>

                    <a-entity
                        id='audio-source-entity'
                        networked="template:#avatar-template;attachTemplateToLocal:false;"
                    >
                    </a-entity>

                    <a-camera
                        wasd-controls-enabled="false"
                        look-controls-enabled="true"
                        fov="65"
                        animation__zoom-in="
                            property: zoom;
                            from: 1;
                            startEvents: start-zoom-in;
                            to: 5;"
                        zoom="1"
                        near="1"
                    >
                        <a-cursor
                            id="cursor"
                            animation__scale-out="property: scale; from: 1 1 1; to: .2 .2 .2; startEvents: start-scale-out;"
                        />
                    </a-camera>
                </a-scene>}
            </>
        )
    }
}

AudioChatComponent.propTypes = {
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
)(withStyles(styles)(AudioChatComponent));
