import React from 'react';
import { withRouter } from 'react-router-dom';
import { connect } from "react-redux";
import { toggleLoader } from "../../redux/actions";
import _ from 'lodash'

class JitsiRoute extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
        };
    }
    componentDidMount () {
        const roomName = "SimonsRoom"
        const api = new JitsiMeetExternalAPI("8x8.vc", {
            roomName: "vpaas-magic-cookie-ed842ad0fbe8446fbfeb14c7580a7f71/" + roomName,
            width: 200,
            height: 200,
            userInfo: {
                email: 'qwe@qwe.com',
                displayName: 'Qwe'
            },
            configOverwrite: {
                prejoinPageEnabled: false
            },
            parentNode: document.querySelector('#jaas-container'),
            jwt: "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtZWQ4NDJhZDBmYmU4NDQ2ZmJmZWIxNGM3NTgwYTdmNzEvZGEzZDViLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImV4cCI6MTYxMDIwNTk0MCwibmJmIjoxNjEwMTk4NzM1LCJpc3MiOiJjaGF0Iiwicm9vbSI6IioiLCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtZWQ4NDJhZDBmYmU4NDQ2ZmJmZWIxNGM3NTgwYTdmNzEiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOiJmYWxzZSIsIm91dGJvdW5kLWNhbGwiOiJmYWxzZSIsInRyYW5zY3JpcHRpb24iOiJmYWxzZSIsInJlY29yZGluZyI6ImZhbHNlIn0sInVzZXIiOnsibW9kZXJhdG9yIjoidHJ1ZSIsIm5hbWUiOiJUZXN0IFVzZXI5OCIsImlkIjoiYXV0aDB8NWZmOTk0Njg2YTcxODEwMDZmYjA5NzZmIiwiYXZhdGFyIjoiIiwiZW1haWwiOiJ0ZXN0LnVzZXI5OEBkb21haW4uY29tIn19fQ.lv6vfH0BlGjRPIU_-7L5cOCNX9f41VU81xdkraWaXTVCD2V1t1SZ9yl2d3XgrAzR3sYq4DzWdEyJfT5iFgirhmguU8l-2pykAoFydl0RzQ8hVyg20yMoW8XWvp5wXhL_B4aPkQIxds-N3T9uhDN5R9vpO56T1sDDdN8e6WVu0wI_ZgYHdUiI-0H_ULyUmjMHD6daEujfWlrMUUjyRT3yrNgkF51xdtlrY00Squf7oc27LLbPuR--zhdC5PMhlcOVt-8H1I_h58IkP87-k1wYJ5vuVELEtHZHIZ12iLbzmqQ1jWqp0hQIQrBpv5hlw_uob95hE_JGyD1Wo8iySOuQng"
        });
        this.props.toggleLoader(false);
    }
    render () {
        return (
            <>
                <div id="jaas-container" style={{ height: "100%" }}></div>
            </>
        )
    }
}

const mapStateToProps = state => {
    return {

    };
};

export default connect(
    mapStateToProps, { toggleLoader }
)(withRouter(JitsiRoute));