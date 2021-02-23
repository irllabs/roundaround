import React, { Component } from 'react'
import { connect } from "react-redux";
import { Drawer } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import _ from 'lodash'
import { SET_LAYER_MUTE, REMOVE_LAYER, SET_IS_SHOWING_LAYER_SETTINGS, SET_LAYER_STEPS } from '../../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { withStyles } from '@material-ui/core/styles';
//import { convertPercentToDB, convertDBToPercent, numberRange } from '../../../utils/index'
import AudioEngine from '../../../audio-engine/AudioEngine'

import VolumeSlider from './VolumeSlider'
import LayerInstrument from './LayerInstrument'
import LayerNumberOfSteps from './LayerNumberOfSteps'
import { FirebaseContext } from '../../../firebase';
import LayerType from './LayerType';
import LayerAutomation from './LayerAutomation';
import Track from '../../../audio-engine/Track'
import LayerPercentOffset from './LayerPercentOffset'
import LayerTimeOffset from './LayerTimeOffset'
import LayerCustomSounds from './LayerCustomSounds'

const styles = theme => ({
    drawer: {

    },
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
        width: 300,
        /*'& > *': {
            marginBottom: '1rem'
        },*/
        paddingTop: theme.spacing(2),
        backgroundColor: '#2E2E2E',
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
    buttonContainer: {
        width: '100%',
        marginBottom: theme.spacing(2)
    },
    soundTabs: {
        marginBottom: theme.spacing(2),
        '& .MuiTab-root': {
            minWidth: 134
        }
    }
})

class LayerSettings extends Component {
    static contextType = FirebaseContext;

    constructor (props) {
        super(props)
        this.state = {
            soundMode: 'builtin'
        }
        this.onSoundModeChange = this.onSoundModeChange.bind(this)
    }

    onCloseClick () {
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
    }

    onPreviewClick () {
        // todo: only audible to this user (mute for all others)
    }

    onMuteClick () {
        const isMuted = !this.props.selectedLayer.isMuted
        AudioEngine.tracksById[this.props.selectedLayer.id].setMute(isMuted)
        this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id: this.props.selectedLayer.id, value: isMuted, user: this.props.user.id } })
    }

    onDeleteLayerClick () {
        this.props.dispatch({ type: REMOVE_LAYER, payload: { id: this.props.selectedLayer.id, user: this.props.user.id } })
        this.context.deleteLayer(this.props.round.id, this.props.selectedLayer.id)
        this.onCloseClick()
    }

    onClearStepsClick () {
        let selectedLayerClone = _.cloneDeep(this.props.selectedLayer)
        for (let step of selectedLayerClone.steps) {
            step.isOn = false
        }
        this.props.dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayerClone.id, steps: selectedLayerClone.steps } })
        this.context.updateLayer(this.props.round.id, selectedLayerClone.id, { steps: selectedLayerClone.steps })
    }

    onSoundModeChange (e, tabValue) {
        this.setState({
            soundMode: tabValue
        })
    }

    render () {
        // console.log('Layer settings render()', this.props.user);
        const { classes } = this.props
        const selectedLayer = this.props.selectedLayer
        let form = '';
        if (!_.isNil(selectedLayer)) {
            //layerVolumePercent = convertDBToPercent(selectedLayer.instrument.gain)
            let layerTypeFormItems;
            if (selectedLayer.type === Track.TRACK_TYPE_AUTOMATION) {
                layerTypeFormItems = (
                    <>
                        <LayerAutomation selectedLayer={selectedLayer} roundId={this.props.round.id} userId={this.props.user.id} />
                        <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                            <Button onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                    </>
                )
            } else {
                layerTypeFormItems = (
                    <>
                        <VolumeSlider selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                            <Button onClick={this.onMuteClick.bind(this)} variant="contained" color={selectedLayer.isMuted ? 'primary' : 'secondary'} disableElevation>Mute</Button>
                            <Button onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                        <Tabs
                            className={classes.soundTabs}
                            value={this.state.soundMode}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="fullWidth"
                            onChange={this.onSoundModeChange}
                            aria-label="disabled tabs example"
                        >
                            <Tab label="Built-in sounds" value="builtin" />
                            <Tab label="Custom sounds" value="custom" />
                        </Tabs>
                        {
                            this.state.soundMode === 'builtin' &&
                            <LayerInstrument selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        }
                        {
                            this.state.soundMode === 'custom' &&
                            <LayerCustomSounds selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        }



                    </>
                )
            }
            form = (
                <Box className={classes.root}>

                    <LayerType selectedLayer={selectedLayer} roundId={this.props.round.id} userId={this.props.user.id} />
                    <LayerNumberOfSteps selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                    <LayerPercentOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} />
                    <LayerTimeOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} />
                    {layerTypeFormItems}

                </Box>
            )
        }
        return (
            <div>
                <Drawer
                    className={classes.drawer}
                    open={this.props.isOpen}
                    variant={"persistent"}

                >

                    {form}

                </Drawer>
            </div>
        )
    }
}

const mapStateToProps = state => {
    //  console.log('mapStateToProps', state);
    let selectedLayer = null;
    if (!_.isNil(state.display.selectedLayerId) && !_.isNil(state.round) && !_.isNil(state.round.layers)) {
        selectedLayer = _.find(state.round.layers, { id: state.display.selectedLayerId })
    }
    return {
        round: state.round,
        user: state.user,
        selectedLayer,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(withStyles(styles)(LayerSettings))