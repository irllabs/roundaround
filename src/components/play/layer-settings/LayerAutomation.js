import React, { useEffect, useContext } from 'react'
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
    root: {
        width: '100%',
        marginBottom: theme.spacing(2)
    },
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
        setSelectedFX(event.target.value);
        dispatch({ type: UPDATE_LAYER_AUTOMATION_FX_ID, payload: { id: selectedLayer.id, value: event.target.value } })
        firebase.updateLayer(roundId, selectedLayer.id, { automationFxId: event.target.value })
    };
    const fxMenuItems = userBus.sortedFx.map(fx => <MenuItem value={fx.id} key={fx.id}>{fx.label}</MenuItem>)
    useEffect(() => {
        setSelectedFX(!_.isNil(selectedLayer.automationFxId) ? selectedLayer.automationFxId : defaultSelectedFx)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id])
    return (

        <Box className={classes.root} display="flex" flexDirection="column">
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
    )
}
