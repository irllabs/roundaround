import React, { useState, useCallback, useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import Instruments from '../../../audio-engine/Instruments'
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { UPDATE_LAYER_INSTRUMENT } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';

const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
        marginBottom: '1rem'
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerInstrument ({ selectedLayer, user, roundId }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const classes = useStyles();
    const instrumentOptions = Instruments.getInstrumentOptions()
    const [selectedInstrument, setSelectedInstrument] = React.useState(selectedLayer.instrument.sampler)
    const onInstrumentSelect = (event) => {
        setSelectedInstrument(event.target.value);
        const defaultArticulation = Instruments.getDefaultArticulation(event.target.value)[0]
        setSelectedArticulation(defaultArticulation)
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: event.target.value, sample: defaultArticulation }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sampler: event.target.value, sample: defaultArticulation } })
    };
    const instrumentMenuItems = instrumentOptions.map(instrument => <MenuItem value={instrument.name} key={instrument.name}>{instrument.label}</MenuItem>)

    const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedLayer.instrument.sampler)
    const [selectedArticulation, setSelectedArticulation] = React.useState(selectedLayer.instrument.sample)
    const onArticulationSelect = (event) => {
        setSelectedArticulation(event.target.value);
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sample: event.target.value }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sample: event.target.value } })
    };
    const articulationMenuItems = articulationOptions.map(articulation => <MenuItem value={articulation.name} key={articulation.name}>{articulation.name}</MenuItem>)
    useEffect(() => {
        setSelectedInstrument(selectedLayer.instrument.sampler)
        setSelectedArticulation(selectedLayer.instrument.sample)
    }, [selectedLayer.id])
    return (
        <div>
            <Box display="flex" flexDirection="column">
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="instrument-select-label">Instrument</InputLabel>
                    <Select
                        value={selectedInstrument}
                        onChange={onInstrumentSelect}
                        labelId="instrument-select-label"
                    >
                        {instrumentMenuItems}
                    </Select>
                </FormControl>
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="articulation-select-label">Sound</InputLabel>
                    <Select
                        value={selectedArticulation}
                        onChange={onArticulationSelect}
                        labelId="articulation-select-label"
                    >
                        {articulationMenuItems}
                    </Select>
                </FormControl>
            </Box>

        </div>
    )
}
