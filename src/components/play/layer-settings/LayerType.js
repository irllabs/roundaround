import React, { useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { SET_LAYER_TYPE, UPDATE_LAYER_AUTOMATION_FX_ID } from '../../../redux/actionTypes'
import AudioEngine from '../../../audio-engine/AudioEngine'
import { FirebaseContext } from '../../../firebase';
import Track from '../../../audio-engine/Track'
import _ from 'lodash'

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
        [theme.breakpoints.down('sm')]: {
            minWidth: 100
        },
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerType ({ selectedLayer, userId, roundId }) {
    const dispatch = useDispatch();
    const classes = useStyles();
    const firebase = useContext(FirebaseContext);
    const typeOptions = [{ value: Track.TRACK_TYPE_LAYER, label: 'Notes' }, { value: Track.TRACK_TYPE_AUTOMATION, label: 'Automation' }]
    const [selectedType, setSelectedType] = React.useState(selectedLayer.type)
    const onTypeSelect = (event) => {
        setSelectedType(event.target.value);
        if (event.target.value === Track.TRACK_TYPE_LAYER) {
            // AudioEngine.tracksById[selectedLayer.id].setType(event.target.value)
            dispatch({ type: SET_LAYER_TYPE, payload: { id: selectedLayer.id, value: event.target.value } })
            firebase.updateLayer(roundId, selectedLayer.id, { type: event.target.value })
        } else {
            // automation type
            const userBus = AudioEngine.busesByUser[userId]
            const defaultSelectedFx = !_.isNil(userBus.sortedFx[0]) ? userBus.sortedFx[0].id : null
            //AudioEngine.tracksById[selectedLayer.id].setType(event.target.value)
            dispatch({ type: SET_LAYER_TYPE, payload: { id: selectedLayer.id, value: event.target.value } })
            dispatch({ type: UPDATE_LAYER_AUTOMATION_FX_ID, payload: { id: selectedLayer.id, value: defaultSelectedFx } })
            firebase.updateLayer(roundId, selectedLayer.id, { type: event.target.value, automationFxId: defaultSelectedFx })
        }
    };
    const typeMenuItems = typeOptions.map(type => <MenuItem value={type.value} key={type.value}>{type.label}</MenuItem>)


    useEffect(() => {
        setSelectedType(selectedLayer.type)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id])
    return (

        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor="layer-type-select-label">Layer type</InputLabel>
                <Select
                    value={selectedType}
                    onChange={onTypeSelect}
                    labelId="layer-type-select-label"
                >
                    {typeMenuItems}
                </Select>
            </FormControl>
        </Box>


    )
}
