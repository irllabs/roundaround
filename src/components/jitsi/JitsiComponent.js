import React, { Component } from 'react'
import Button from '@material-ui/core/Button';
import VideocamIcon from '@material-ui/icons/Videocam';

export default class JitsiComponent extends Component {
    constructor (props) {
        super(props);
        this.state = {
            isOpen: true
        };
    }
    componentDidMount () {
        const roomName = "SimonsRoom"
        this.api = new JitsiMeetExternalAPI("8x8.vc", {
            roomName: "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71/" + roomName,
            width: 600,
            height: 400,
            userInfo: {
                email: 'qwe@qwe.com',
                displayName: 'Qwe'
            },
            configOverwrite: {
                prejoinPageEnabled: false
            },
            parentNode: document.querySelector('#jaas-container'),
            jwt: "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtZWQ4NDJhZDBmYmU4NDQ2ZmJmZWIxNGM3NTgwYTdmNzEvZGEzZDViLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImV4cCI6MTYxMDIxMzU3MCwibmJmIjoxNjEwMjA2MzY1LCJpc3MiOiJjaGF0Iiwicm9vbSI6IioiLCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtZWQ4NDJhZDBmYmU4NDQ2ZmJmZWIxNGM3NTgwYTdmNzEiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOiJmYWxzZSIsIm91dGJvdW5kLWNhbGwiOiJmYWxzZSIsInRyYW5zY3JpcHRpb24iOiJmYWxzZSIsInJlY29yZGluZyI6ImZhbHNlIn0sInVzZXIiOnsibW9kZXJhdG9yIjoidHJ1ZSIsIm5hbWUiOiJUZXN0IFVzZXI2MCIsImlkIjoiYXV0aDB8NWZmOTk0Njg2YTcxODEwMDZmYjA5NzZmIiwiYXZhdGFyIjoiIiwiZW1haWwiOiJ0ZXN0LnVzZXI2MEBkb21haW4uY29tIn19fQ.PCUOUT5TS42taFEmfpRs40T37LCUBUvIAs4tewTnHwyJJponjlDogtrXXmagXT_1clxYCxSHm0N7lMrqRmQKUrKAHikwUtbCNIjBFhxtRHh1NlJWxDdEwLBcHjklwI6j1B7EKtEhjVJyTosk57s6jEFlPOgMj9BsAccxyRfybDD_KFoRsqMMypiuKdROF7-evHmFC7egqHQ2ic9ixXvYaF8dEspoELsQ6bnpYyN3hYhOPOOmO_5ME2BzNilNyZRlpRBSU2Jf2Oy53zLx7ou6T8O0GcvRhpSS1z6NsGe0gRZauA3eMmLUGnqn2TWwLb4iB-WOkNR6f24AGsEqzeCXig"
        });
    }
    onMinimizeClick () {
        console.log('minimize');
        // move jitsi window off screen (needs to still be in the dom)
    }
    render () {
        return (
            <div className="jitsi-dialog" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '4px', position: 'absolute', right: 0, bottom: 0, color: 'white' }}>
                <div style={{}}> <Button
                    color="secondary"
                    onClick={this.onMinimizeClick}
                    startIcon={<VideocamIcon />}
                >
                    Minimize
      </Button></div>
                <div id="jaas-container" style={{ height: "100%" }}></div>
            </div>
        )
    }
}
