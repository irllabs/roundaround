import React, { useRef, useState, Component } from 'react'
import { connect, ReactReduxContext, Provider, useDispatch } from "react-redux";
import styles from './LayerSettings.scss'
import { Drawer } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import InboxIcon from '@material-ui/icons/MoveToInbox';
import MailIcon from '@material-ui/icons/Mail';
import TextField from '@material-ui/core/TextField';
import Slider from '@material-ui/core/Slider';
import _ from 'lodash'
import { SET_LAYER_NAME, SET_LAYER_MUTE, SET_LAYER_PREVIEW, REMOVE_ROUND_LAYER, SET_IS_SHOWING_LAYER_SETTINGS } from '../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { convertPercentToDB, convertDBToPercent, numberRange } from '../../utils/index'
import AudioEngine from '../../audio-engine/AudioEngine'

import VolumeSlider from './VolumeSlider'
import LayerName from './LayerName'
import LayerInstrument from './LayerInstrument'
import LayerNumberOfSteps from './LayerNumberOfSteps'


class LayerSettings extends Component {
    constructor (props) {
        super(props)
    }

    onCloseClick () {
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
    }

    onPreviewClick () {
        // todo: only audible to this user (mute for all others)
    }

    onMuteClick () {
        const isMuted = !this.props.selectedLayer.instrument.isMuted
        AudioEngine.tracksById[this.props.selectedLayer.id].setMute(isMuted)
        this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id: this.props.selectedLayer.id, value: isMuted, user: this.props.user.id } })
    }

    onDeleteLayerClick () {
        this.props.dispatch({ type: REMOVE_ROUND_LAYER, payload: { id: this.props.selectedLayer.id, user: this.props.user.id } })
        this.onCloseClick()
    }


    render () {
        //  console.log('Layer settings render()');
        let layerVolumePercent = 80;
        let form = '';
        if (!_.isNil(this.props.selectedLayer)) {
            layerVolumePercent = convertDBToPercent(this.props.selectedLayer.instrument.gain)
            form = (
                <Box display="flex" flexDirection="column" justifyContent="space-evenly" height="100%" alignItems="center">
                    <LayerName selectedLayer={this.props.selectedLayer} user={this.props.user} />
                    <LayerInstrument selectedLayer={this.props.selectedLayer} user={this.props.user} />
                    <LayerNumberOfSteps selectedLayer={this.props.selectedLayer} user={this.props.user} />
                    <div className={`${styles.layerSettingsVolumeSlider}`}>
                        <VolumeSlider selectedLayer={this.props.selectedLayer} user={this.props.user} />
                    </div>
                    <Box display="flex" justifyContent="space-evenly">
                        <Button onClick={this.onPreviewClick.bind(this)} variant={this.props.selectedLayer.instrument.isPreviewed ? 'contained' : 'outlined'} disableElevation>Preview</Button>
                        <Button onClick={this.onMuteClick.bind(this)} variant={this.props.selectedLayer.instrument.isMuted ? 'contained' : 'outlined'} disableElevation>Mute</Button>
                    </Box>
                    <Button onClick={this.onDeleteLayerClick.bind(this)} variant="outlined" disableElevation>Delete layer</Button>
                </Box>
            )
        }
        return (
            <div>
                <Drawer
                    open={this.props.isOpen}
                    variant={"persistent"}
                >
                    <div className={`${styles.layerSettingsContents}`}>
                        <Button onClick={this.onCloseClick.bind(this)} className={`${styles.layerSettingsCloseButton}`}>X</Button>
                        {form}
                    </div>
                </Drawer>
            </div>
        )
    }
}

const mapStateToProps = state => {
    console.log('mapStateToProps', state);
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        editAllLayers: state.editAllLayers,
        selectedLayer,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(LayerSettings);