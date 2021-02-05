import React, { useState, useCallback, useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { UPDATE_LAYER_AUTOMATION_FX_ID } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';
import AudioEngine from '../../../audio-engine/AudioEngine'
import _ from 'lodash'

const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerAutomation ({ selectedLayer, userId, roundId }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const classes = useStyles();
    const userBus = AudioEngine.busesByUser[userId]
    console.log('userBus', userBus, AudioEngine);

    const defaultSelectedFx = !_.isNil(userBus.sortedFx[0]) ? userBus.sortedFx[0].id : null

    const [selectedFX, setSelectedFX] = React.useState(!_.isNil(selectedLayer.automationFxId) ? selectedLayer.automationFxId : defaultSelectedFx)
    const onFXSelect = (event) => {
        console.log('onFXSelect', event.target.value);
        setSelectedFX(event.target.value);
        // const defaultArticulation = Instruments.getDefaultArticulation(event.target.value)[0]
        // setSelectedArticulation(defaultArticulation)
        dispatch({ type: UPDATE_LAYER_AUTOMATION_FX_ID, payload: { id: selectedLayer.id, value: event.target.value } })
        firebase.updateLayer(roundId, selectedLayer.id, { automationFxId: event.target.value })
    };
    const fxMenuItems = userBus.sortedFx.map(fx => <MenuItem value={fx.id} key={fx.id}>{fx.label}</MenuItem>)

    console.log('fxMenuItems', fxMenuItems);

    /* const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedLayer.instrument.sampler)
     const [selectedArticulation, setSelectedArticulation] = React.useState(selectedLayer.instrument.sample)
     const onArticulationSelect = (event) => {
         setSelectedArticulation(event.target.value);
         dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sample: event.target.value }, user: user.id } })
     
     };
     const articulationMenuItems = articulationOptions.map(articulation => <MenuItem value={articulation.name} key={articulation.name}>{articulation.name}</MenuItem>)
     */
    useEffect(() => {
        setSelectedFX(!_.isNil(selectedLayer.automationFxId) ? selectedLayer.automationFxId : defaultSelectedFx)
    }, [selectedLayer.id])
    return (
        <div>
            <Box display="flex" flexDirection="column">
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="fx-select-label">FX</InputLabel>
                    <Select
                        value={selectedFX}
                        onChange={onFXSelect}
                        labelId="fx-select-label"
                    >
                        {fxMenuItems}
                    </Select>
                </FormControl>

            </Box>

        </div>
    )
}
