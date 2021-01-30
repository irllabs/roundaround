import React, { Component } from 'react'
import { connect } from "react-redux";
import Button from '@material-ui/core/Button';
import Close from '@material-ui/icons/Close';
import { IconButton } from '@material-ui/core';
import {
    setIsShowingVideoWindow
} from "../../redux/actions";
import styles from './JitsiComponent.scss'
import axios from 'axios';
import { FirebaseContext } from '../../firebase';
import _ from 'lodash'

class JitsiComponent extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props);
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
    }

    componentDidMount () {
        this.initVideo()
    }

    async componentDidUpdate () {
        console.log('jitsi component updated', this.props.display.isShowingVideoWindow);
        /*  if (!_.isNil(this.api)) {
              let isVideoMuted = await this.api.isVideoMuted()
              if (this.props.display.isShowingVideoWindow !== isVideoMuted) {
                  this.api.executeCommand('toggleVideo');
              }
          }*/
    }

    async initVideo () {
        const roomName = this.props.roomName
        const tokenResult = await this.context.getJitsiToken(this.props.user.id, '', '', '')
        const jwt = tokenResult.data.token;

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
            }
        })
    }
    onMinimizeClick () {
        console.log('minimize');
        // move jitsi window off screen (needs to still be in the dom)
        this.props.setIsShowingVideoWindow(false)

    }
    render () {
        let videoWindowStyles = styles.videoWindow + ' ' + (this.props.display.isShowingVideoWindow ? styles.videoWindowOpen : styles.videoWindowClosed)
        //let videoWindowStyles = styles.videoWindow + ' ' + (true ? styles.videoWindowOpen : styles.videoWindowClosed)

        return (
            <div className={videoWindowStyles}>

                <div id="jaas-container" style={{ height: "100%" }}></div>
            </div >
        )
    }
}

const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    return {
        collaboration: state.collaboration,
        display: state.display,
        user: state.user
    };
};


export default connect(
    mapStateToProps, {
    setIsShowingVideoWindow
}
)(JitsiComponent);
