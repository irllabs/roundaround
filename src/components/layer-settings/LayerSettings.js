import React, { useRef, useState } from 'react'
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
import { SET_LAYER_NAME } from '../../redux/actionTypes'
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
const LayerSettings = ({ isOpen, selectedLayer, user }) => {
    console.log('selectedLayer', selectedLayer);
    const dispatch = useDispatch();

    const onLayerNameChange = (e) => {
        console.log('name changed', e.target.value);
        dispatch({ type: SET_LAYER_NAME, payload: { id: selectedLayer.id, name: e.target.value, user: user.id } })
    }

    const makeVerticalSliderStyles = makeStyles({
        root: {
            height: 300
        }
    })
    const verticalSliderStyles = makeVerticalSliderStyles();
    const verticalSliderMarks = [
        {
            value: 100,
            label: '6',
        },
        {
            value: 80,
            label: '0',
        },
        {
            value: 60,
            label: '-6',
        },
        {
            value: 40,
            label: '-12',
        },
    ];

    let form = '';
    if (!_.isNil(selectedLayer)) {
        form = (
            <Box display="flex" flexDirection="column">
                <TextField id="standard-basic" value={selectedLayer.name} onChange={onLayerNameChange} />
                <div className={verticalSliderStyles.root + ' mt-32'}>
                    <Slider
                        orientation="vertical"
                        defaultValue={30}
                        aria-labelledby="vertical-slider"
                        marks={verticalSliderMarks}
                    />
                </div>
            </Box>
        )
    }
    return (
        <div>
            <Drawer
                open={isOpen}
                variant={"persistent"}
            >
                <div className={`${styles.layerSettingsContents}`}>
                    {form}
                </div>
            </Drawer>
        </div>
    )
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