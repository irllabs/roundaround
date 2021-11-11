import React, { Component } from 'react'
import { connect } from "react-redux";
import { Divider, Typography } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import _ from 'lodash'
import { SET_LAYER_MUTE, REMOVE_LAYER, SET_IS_SHOWING_LAYER_SETTINGS, SET_LAYER_STEPS } from '../../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import { withStyles } from '@material-ui/core/styles';
import AudioEngine from '../../../audio-engine/AudioEngine'

import AddLayer from './resources/svg/add.svg'
import ChangeInstrument from './resources/svg/instruments.svg'

import VolumeSlider from './VolumeSlider'
import LayerInstrument from './LayerInstrument'
import LayerNumberOfSteps from './LayerNumberOfSteps'
import { FirebaseContext } from '../../../firebase';
import LayerAutomation from './LayerAutomation';
import Track from '../../../audio-engine/Track'
import LayerPercentOffset from './LayerPercentOffset'
import LayerCustomSounds from './LayerCustomSounds'

const styles = theme => ({
    container: {
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        bottom: 0,
        right: 0,
        left: 0
    },
    drawer: {
        backgroundColor: '#2E2E2E',
        '& .MuiPaper-root': {
            backgroundColor: '#2E2E2E',
        }
    },
    root: {
        display: "flex",
        flexDirection: "row",
        height: 48,
        borderRadius: 32,
        marginBottom: 20,
        justifyContent: "flex-start",
        alignItems: "center",
        width: '60%',
        /*'& > *': {
            marginBottom: '1rem'
        },*/
        backgroundColor: '#333333',
    },
    addLayerContainer: {
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        backgroundColor: '#4D4D4D',
        height: '100%',
        borderRadius: 30
    },
    iconButtons: {
        width: 48,
        height: 48,
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
        }
    },
    msg: {
    },
    layerOptions: {
        width: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonContainer: {
        width: '100%',
        marginBottom: theme.spacing(2),
        [theme.breakpoints.down('sm')]: {
            flexDirection: "column"
        },
    },
    containedButton: {
        [theme.breakpoints.down('sm')]: {
            marginBottom: theme.spacing(1)
        },
    },
    soundTabs: {
        marginBottom: theme.spacing(2),
        '& .MuiTab-root': {
            minWidth: 134
        }
    },
    divider: {
        width: '100%',
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    }
})

class LayerSettings extends Component {
    static contextType = FirebaseContext;

    onCloseClick() {
        this.props.dispatch({ type: SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: false } })
    }

    onPreviewClick() {
        // todo: only audible to this user (mute for all others)
    }

    onMuteClick() {
        const isMuted = !this.props.selectedLayer.isMuted
        AudioEngine.tracksById[this.props.selectedLayer.id].setMute(isMuted)
        this.props.dispatch({ type: SET_LAYER_MUTE, payload: { id: this.props.selectedLayer.id, value: isMuted, user: this.props.user.id } })
        this.context.updateLayer(this.props.round.id, this.props.selectedLayer.id, { isMuted })
    }

    onDeleteLayerClick() {
        this.props.dispatch({ type: REMOVE_LAYER, payload: { id: this.props.selectedLayer.id, user: this.props.user.id } })
        this.context.deleteLayer(this.props.round.id, this.props.selectedLayer.id)
        this.onCloseClick()
    }

    onClearStepsClick() {
        let selectedLayerClone = _.cloneDeep(this.props.selectedLayer)
        for (let step of selectedLayerClone.steps) {
            step.isOn = false
        }
        this.props.dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayerClone.id, steps: selectedLayerClone.steps } })
        this.context.updateLayer(this.props.round.id, selectedLayerClone.id, { steps: selectedLayerClone.steps })
    }


    render() {
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
                            <Button className={classes.containedButton} onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button className={classes.containedButton} onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                    </>
                )
            } else {
                layerTypeFormItems = (
                    <>
                        <VolumeSlider selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        <Box className={classes.buttonContainer} display="flex" justifyContent="space-evenly">
                            <Button className={classes.containedButton} onClick={this.onMuteClick.bind(this)} variant="contained" color={selectedLayer.isMuted ? 'primary' : 'secondary'} disableElevation>Mute</Button>
                            <Button className={classes.containedButton} onClick={this.onClearStepsClick.bind(this)} variant="contained" color="secondary" disableElevation>Clear</Button>
                            <Button className={classes.containedButton} onClick={this.onDeleteLayerClick.bind(this)} variant="contained" color="secondary" disableElevation>Delete</Button>
                        </Box>
                        <Divider className={classes.divider} />
                        <LayerInstrument selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                        <LayerCustomSounds selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                    </>
                )
            }
        }
        form = (
            <Box className={classes.root}>
                <Box class={classes.addLayerContainer}>
                    <IconButton className={classes.iconButtons}><img alt='add layer' src={AddLayer} /></IconButton>
                    <IconButton className={classes.iconButtons}><img alt='change instrument' src={ChangeInstrument} /></IconButton>
                </Box>
                <Box className={classes.layerOptions}>
                    <Typography className={classes.msg}>Long Press a round to edit</Typography>
                    {/* <LayerNumberOfSteps selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} />
                    <LayerPercentOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} />
                    {/* <LayerTimeOffset selectedLayer={selectedLayer} roundId={this.props.round.id} user={this.props.user} playUIRef={this.props.playUIRef} /> */}
                    {/*layerTypeFormItems} */}
                </Box>
            </Box>
        )

        return (
            <div className={classes.container}>
                {form}
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