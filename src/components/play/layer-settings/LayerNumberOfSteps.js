import React, { useEffect, useContext } from 'react'
import { useDispatch } from "react-redux";
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { SET_LAYER_STEPS } from '../../../redux/actionTypes'
import { changeLayerLength } from '../../../utils/index'
import { FirebaseContext } from '../../../firebase';



const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function LayerNumberOfSteps ({ selectedLayer, user, roundId }) {
    const dispatch = useDispatch();
    const classes = useStyles();
    const firebase = useContext(FirebaseContext);
    const numberOfStepsOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
    const [selectedNumberOfSteps, setSelectedNumberOfSteps] = React.useState(selectedLayer.steps.length)
    const onNumberOfStepsSelect = (event) => {
        setSelectedNumberOfSteps(event.target.value);
        let newSteps = changeLayerLength(selectedLayer, event.target.value)
        dispatch({ type: SET_LAYER_STEPS, payload: { id: selectedLayer.id, steps: newSteps, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, selectedLayer)
    };
    const numberOfStepsMenuItems = numberOfStepsOptions.map(numberOfSteps => <MenuItem value={numberOfSteps} key={numberOfSteps}>{numberOfSteps}</MenuItem>)


    useEffect(() => {
        setSelectedNumberOfSteps(selectedLayer.steps.length)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id])
    return (
        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor="number-of-steps-select-label">Number of steps</InputLabel>
                <Select
                    value={selectedNumberOfSteps}
                    onChange={onNumberOfStepsSelect}
                    labelId="number-of-steps-select-label"
                >
                    {numberOfStepsMenuItems}
                </Select>
            </FormControl>
        </Box>
    )
}
