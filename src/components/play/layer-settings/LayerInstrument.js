import React, { useEffect, useContext, useState, useRef } from 'react'
import { useDispatch } from "react-redux";
import Instruments from '../../../audio-engine/Instruments'
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { UPDATE_LAYER_INSTRUMENT, SET_DISABLE_KEY_LISTENER } from '../../../redux/actionTypes'
import { FirebaseContext } from '../../../firebase';
import _ from 'lodash'
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import CustomSamples from '../../../audio-engine/CustomSamples'
import { getDefaultLayerData } from '../../../utils/defaultData'
import { TextField } from '@material-ui/core';

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
        marginBottom: '1rem'
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
    articulationSelectContainer: {
        display: 'flex',
    },
    articulationSelect: {
        flexGrow: 1,
        marginTop: theme.spacing(1)
    },
    articluationMenuButton: {
        marginLeft: theme.spacing(1)
    },
    customInstrumentMenuItem: {
        borderBottom: 'solid 1px rgba(255,255,255,0.12)'
    }
}));

export default function LayerInstrument ({ selectedLayer, user, roundId }) {
    const dispatch = useDispatch();
    const firebase = useContext(FirebaseContext);
    const classes = useStyles();
    const instrumentOptions = Instruments.getInstrumentOptions(false)
    const [selectedInstrument, setSelectedInstrument] = React.useState(selectedLayer.instrument.sampler)

    const onInstrumentSelect = (event) => {
        setSelectedInstrument(event.target.value);
        console.log('onInstrumentSelect', event.target.value);
        let defaultArticulation = Instruments.getDefaultArticulation(event.target.value)
        console.log('defaultArticulation', defaultArticulation);
        if (!_.isNil(defaultArticulation)) {
            setSelectedArticulation(defaultArticulation)
            dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: event.target.value, sample: defaultArticulation }, user: user.id } })
            firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sampler: event.target.value, sample: defaultArticulation } })
        };
    }
    const instrumentMenuItems = () => {
        let items = instrumentOptions.map(instrument => <MenuItem value={instrument.name} key={instrument.name}>{instrument.label}</MenuItem>)
        items.unshift(<MenuItem className={classes.customInstrumentMenuItem} value={"custom"} key={"custom"}>{"Custom"}</MenuItem>)
        return items
    }
    const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedInstrument, user.id)
    const [selectedArticulation, setSelectedArticulation] = React.useState(selectedLayer.instrument.sample)
    const onArticulationSelect = async (event) => {
        setSelectedArticulation(event.target.value);
        // console.log('UPDATE_LAYER_INSTRUMENT', selectedInstrument, event.target.value);
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: selectedInstrument, sample: event.target.value }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sample: event.target.value } })
        if (selectedInstrument === 'custom') {
            let sample = await CustomSamples.get(event.target.value)
            setCustomSampleName(sample.name)
        }
    };
    const articulationMenuItems = articulationOptions.map(articulation => <MenuItem value={articulation.value} key={articulation.value}>{articulation.name}</MenuItem>)
    useEffect(() => {
        async function refreshCustomSampleName (sampleId) {
            let sample = await CustomSamples.get(sampleId)
            setCustomSampleName(sample.name)
        }
        setSelectedInstrument(selectedLayer.instrument.sampler)
        setSelectedArticulation(selectedLayer.instrument.sample)
        if (selectedLayer.instrument.sampler === 'custom') {
            refreshCustomSampleName(selectedLayer.instrument.sample)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLayer.id, selectedLayer.instrument.sample, selectedLayer.instrument.sampler])


    const [sampleAnchorElement, setSampleAnchorElement] = useState(null);
    const onSampleMenuClick = (event) => {
        setSampleAnchorElement(event.currentTarget);
    };
    const onSampleMenuClose = () => {
        setSampleAnchorElement(null);
    };
    const onRenameSampleClick = () => {
        setSampleAnchorElement(null);
        setIsShowingRenameSampleDialog(true)
        dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: true } })
    }
    const onDeleteSampleClick = () => {
        setSampleAnchorElement(null);
        setIsShowingDeleteSampleDialog(true)
    }
    const [isShowingDeleteSampleDialog, setIsShowingDeleteSampleDialog] = useState(false)
    const onCloseDeleteSampleDialog = () => {
        setIsShowingDeleteSampleDialog(false)
    }
    const deleteSample = async () => {
        await CustomSamples.delete(selectedArticulation, user.id)
        setIsShowingDeleteSampleDialog(false)
        const defaultLayer = getDefaultLayerData()
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: defaultLayer.instrument.sampler, sample: defaultLayer.instrument.sample }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sampler: defaultLayer.instrument.sampler, sample: defaultLayer.instrument.sample } })
    }
    const renameSampleTextField = useRef(null)
    const [isShowingRenameSampleDialog, setIsShowingRenameSampleDialog] = useState(false)
    const onCloseRenameSampleDialog = () => {
        setIsShowingRenameSampleDialog(false)
        dispatch({ type: SET_DISABLE_KEY_LISTENER, payload: { value: false } })
    }
    const renameSample = async () => {
        const newName = renameSampleTextField.current.querySelectorAll("input")[0].value
        // console.log('on rename click', newName);
        CustomSamples.rename(selectedArticulation, newName)
        onCloseRenameSampleDialog()
    }
    const [customSampleName, setCustomSampleName] = useState(null)
    return (
        <Box className={classes.root} display="flex" flexDirection="column">
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor="instrument-select-label">Instrument</InputLabel>
                <Select
                    value={selectedInstrument}
                    onChange={onInstrumentSelect}
                    labelId="instrument-select-label"
                >
                    {instrumentMenuItems()}
                </Select>
            </FormControl>
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor="articulation-select-label">Sound</InputLabel>
                <Box className={classes.articulationSelectContainer}>
                    <Select
                        className={classes.articulationSelect}
                        value={selectedArticulation}
                        onChange={onArticulationSelect}
                        labelId="articulation-select-label"
                    >
                        {articulationMenuItems}
                    </Select>
                    {
                        (selectedInstrument === 'custom') &&
                        <>
                            <IconButton className={classes.articluationMenuButton} onClick={onSampleMenuClick}>
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                            <Menu
                                anchorEl={sampleAnchorElement}
                                keepMounted
                                open={Boolean(sampleAnchorElement)}
                                onClose={onSampleMenuClose}
                            >
                                <MenuItem onClick={onRenameSampleClick}>Rename</MenuItem>
                                <MenuItem onClick={onDeleteSampleClick}>Delete</MenuItem>
                            </Menu>
                        </>
                    }
                </Box>
            </FormControl>
            <Dialog
                open={isShowingDeleteSampleDialog}
                onClose={onCloseDeleteSampleDialog}
            >
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete this sample?
          </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseDeleteSampleDialog} color="primary">
                        Cancel
          </Button>
                    <Button onClick={deleteSample} color="primary" variant="contained" disableElevation autoFocus>
                        Delete
          </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={isShowingRenameSampleDialog} onClose={onCloseRenameSampleDialog} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Rename</DialogTitle>
                <DialogContent>
                    <TextField
                        ref={renameSampleTextField}
                        defaultValue={customSampleName ? customSampleName : ''}
                        autoFocus
                        margin="dense"
                        id="renameSample"
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCloseRenameSampleDialog}>
                        Cancel
          </Button>
                    <Button color="primary" variant="contained" disableElevation autoFocus onClick={renameSample}>
                        Rename
          </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
