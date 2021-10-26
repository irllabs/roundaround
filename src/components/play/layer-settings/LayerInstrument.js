import React, { useContext, useEffect } from 'react'
import { Box, Typography } from '@material-ui/core'
import IconButton from '@material-ui/core/IconButton'
import _ from 'lodash'
import { useDispatch } from "react-redux";

import Instruments from '../../../audio-engine/Instruments'
import { UPDATE_LAYER_INSTRUMENT } from '../../../redux/actionTypes'

/** SVGs */
import RightArrow from './resources/svg/rightArrow.svg'
import Check from './resources/svg/check.svg'
import LeftArrow from './resources/svg/leftArrow.svg'
import { FirebaseContext } from '../../../firebase'

export default function LayerInstrument({ selectedLayer, user, roundId }) {
    const dispatch = useDispatch();
    const instrumentOptions = Instruments.getInstrumentOptions(false)
    const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedInstrument, user.id)
    const firebase = useContext(FirebaseContext);

    const onInstrumentSelect = async (event) => {
        setSelectedInstrument(event.target.value);
        console.log('onInstrumentSelect', event.target.value);
        let defaultArticulation = await Instruments.getRandomArticulation(event.target.value)
        console.log('defaultArticulation', defaultArticulation);
        if (!_.isNil(defaultArticulation)) {
            setSelectedArticulation(defaultArticulation)
            dispatch({
                type: UPDATE_LAYER_INSTRUMENT,
                payload: {
                    id: selectedLayer.id,
                    instrument: { sampler: instrument.name, sample: defaultArticulation },
                    user: user.id
                }
            })
            firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sampler: instrument.name, sample: defaultArticulation } })
        };
    }

    useEffect(() => {
        async function refreshCustomSampleName(sampleId) {
            let sample = await CustomSamples.get(sampleId)
            setCustomSampleName(sample.name)
        }
        setSelectedInstrument(selectedLayer.instrument.sampler)
        setSelectedArticulation(selectedLayer.instrument.sample)
    }, [selectedLayer])

    const onArticulationSelect = async (articulation) => {
        setSelectedArticulation(articulation.value);
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: selectedInstrument, sample: articulation.value }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sample: articulation.value } })
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
        const defaultLayer = await getDefaultLayerData()
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
        <Box className={showInstrumentsPopup ? classes.instrumentPopup : classes.hidden}>
            {!showArticulationOptions &&
                <Box>
                    <IconButton ref={instrumentsButtonRef} id='instrument' onClick={toggleShowInstrumentList} style={{ borderBottom: showInstrumentsList ? 'thin solid rgba(255, 255, 255, 0.1)' : 'none' }} className={classes.rectButton}>
                        {showInstrumentsList && <Box style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                            <img alt='right arrow' src={LeftArrow} />
                        </Box>}
                        <Box style={{ flex: showInstrumentsList ? 7 : 5, display: 'flex', justifyContent: 'flex-start' }}>
                            <Typography style={{ textAlign: 'left', textTransform: 'Capitalize' }}>Instrument</Typography>
                        </Box>
                        {!showInstrumentsList &&
                            <>
                                <Typography style={{ flex: 3, textAlign: 'left', textTransform: 'Capitalize' }}>
                                    {selectedInstrumentLabel}
                                </Typography>
                                <Box style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                                    <img alt='right arrow' src={RightArrow} />
                                </Box>
                            </>
                        }
                    </IconButton>
                    {showInstrumentsList &&
                        <Box style={{ display: 'flex', flexDirection: 'column' }}>
                            {instrumentOptions.map((instrument, i) =>
                                <IconButton
                                    ref={instrumentsListRef}
                                    id={`instrument-${i}`}
                                    key={`instrument-${i}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onInstrumentSelect(instrument)
                                    }
                                    } style={{ justifyContent: 'space-between' }} className={classes.rectButton}>
                                    <Typography style={{ textAlign: 'left' }}>{instrument.label}</Typography>
                                    {selectedInstrument === instrument.name && <img alt='checked' src={Check} />}
                                </IconButton>
                            )}
                        </Box>
                    }
                </Box>
            }
            {!showInstrumentsList &&
                <Box>
                    <IconButton
                        id='sound'
                        ref={soundsButtonRef}
                        onClick={toggleArticulationOptions}
                        style={{ borderBottom: showArticulationOptions ? 'thin solid rgba(255, 255, 255, 0.1)' : 'none' }}
                        className={classes.rectButton}
                    >
                        {showArticulationOptions &&
                            <Box style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                                <img alt='right arrow' src={LeftArrow} />
                            </Box>}
                        <Typography style={{ flex: 5, textAlign: 'left', textTransform: 'Capitalize' }}>Sound</Typography>
                        {!showArticulationOptions &&
                            <>
                                <Typography style={{ flex: 3, textAlign: 'left', textTransform: 'Capitalize' }}>
                                    {selectedLayer?.instrument?.sample}
                                </Typography>
                                <Box style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}><img alt='right arrow' src={RightArrow} /></Box>
                            </>
                        }
                    </IconButton>
                    {showArticulationOptions &&
                        <Box style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflow: 'scroll' }}>
                            {articulationOptions.map((articulation, i) =>
                                <IconButton
                                    ref={articulationsListRef}
                                    id={`articulation-${i}`}
                                    key={`articulation-${i}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onArticulationSelect(articulation)
                                    }
                                    } style={{ justifyContent: 'space-between' }} className={classes.rectButton}>
                                    <Typography style={{ textAlign: 'left' }}>{articulation.name}</Typography>
                                    {selectedArticulation === articulation.value && <img alt='checked' src={Check} />}
                                </IconButton>
                            )}
                        </Box>
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

export default LayerInstrument;