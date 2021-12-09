import React, { useContext } from 'react'
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


const LayerInstrument = ({
    showInstrumentsPopup,
    toggleShowInstrumentList,
    toggleArticulationOptions,
    selectedInstrumentLabel,
    showArticulationOptions,
    showInstrumentsList,
    classes,
    selectedLayer,
    roundId,
    instrumentsListRef,
    articulationsListRef,
    instrumentsButtonRef,
    soundsButtonRef,
    user
}) => {
    const [selectedInstrument, setSelectedInstrument] = React.useState(selectedLayer.instrument.sampler)
    const [selectedArticulation, setSelectedArticulation] = React.useState(selectedLayer.instrument.sample)
    const dispatch = useDispatch();
    const instrumentOptions = Instruments.getInstrumentOptions(false)
    const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedInstrument, user.id)
    const firebase = useContext(FirebaseContext);

    const onInstrumentSelect = async (instrument) => {
        setSelectedInstrument(instrument.name)
        let defaultArticulation = await Instruments.getRandomArticulation(instrument.name)
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

    const onArticulationSelect = async (articulation) => {
        setSelectedArticulation(articulation.value);
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: selectedInstrument, sample: articulation.value }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sample: articulation.value } })
    };

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
            }
        </Box>
    )
}

export default LayerInstrument;