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

class JitsiComponent extends Component {
    static contextType = FirebaseContext;
    constructor (props) {
        super(props);
        this.onMinimizeClick = this.onMinimizeClick.bind(this)
    }

    componentDidMount () {
        this.initVideo()
    }

    async initVideo () {
        const roomName = this.props.collaboration.id

        const tokenResult = await this.context.getJitsiToken(this.props.user.id, '', '', '')

        console.log('token', tokenResult);
        const jwt = tokenResult.data.token;

        // todo call firebase function to get jwt token for this user
        /*const tokenResult = await axios.get('http://localhost:5001/roundaround/us-central1/getJaasToken', {
            params: {
                userId: this.props.user.id,
                email: '',
                avatar: '',
                name: ''
            }
        })
        console.log('got token', tokenResult);*/

        this.api = new JitsiMeetExternalAPI("8x8.vc", {
            roomName: "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71/" + roomName,
            width: 400,
            height: 266,
            userInfo: {
                email: 'john.doe@company.com',
                displayName: 'Qwe'
            },
            configOverwrite: {
                prejoinPageEnabled: false
            },
            parentNode: document.querySelector('#jaas-container'),
            jwt
        });
    }
    onMinimizeClick () {
        console.log('minimize');
        // move jitsi window off screen (needs to still be in the dom)
        this.props.setIsShowingVideoWindow(false)
    }
    render () {
        let videoWindowStyles = styles.videoWindow + ' ' + (this.props.display.isShowingVideoWindow ? styles.videoWindowOpen : styles.videoWindowClosed)

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
