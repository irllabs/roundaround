/* eslint-disable react-hooks/exhaustive-deps */
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
import Plus from './resources/svg/plus.svg'
import { FirebaseContext } from '../../../firebase'


const LayerInstrument = ({
    showInstrumentsPopup,
    toggleShowInstrumentList,
    toggleArticulationOptions,
    toggleCustomInstrumentDialog,
    showArticulationOptions,
    showInstrumentsList,
    classes,
    selectedLayer,
    round,
    roundId,
    instrumentsListRef,
    articulationsListRef,
    instrumentsButtonRef,
    soundsButtonRef,
    user
}) => {
    const [selectedInstrument, setSelectedInstrument] = React.useState(selectedLayer.instrument.sampler)
    const [selectedArticulation, setSelectedArticulation] = React.useState(selectedLayer.instrument.sample)
    const [selectedInstrumentFull, setSelectedInstrumentFull] = React.useState(selectedLayer.instrument)
    const [combinedInstrumentOptions, setCombinedInstrumentOptions] = React.useState([])
    const dispatch = useDispatch();
    const instrumentOptions = Instruments.getInstrumentOptions(false)
    const articulationOptions = Instruments.getInstrumentArticulationOptions(selectedInstrument, user.id, selectedInstrumentFull)
    const firebase = useContext(FirebaseContext);

    console.log({ selectedInstrument })

    const onInstrumentSelect = async (instrument) => {
        let defaultArticulation
        if (instrument.type === 'custom') {
            setSelectedInstrument('custom')
            defaultArticulation = instrument.articulations[instrument.name]
            console.log({ instrument })
        } else {
            setSelectedInstrument(instrument.name)
            defaultArticulation = await Instruments.getRandomArticulation(instrument.name)
        }
        console.log({ defaultArticulation })

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
        setSelectedInstrumentFull(selectedLayer.instrument)
        let sampler = selectedLayer.instrument.sampler
        if (typeof selectedLayer.instrument.sample === 'object') {
            sampler = 'custom'
        }
        setSelectedInstrument(sampler)
        setSelectedArticulation(selectedLayer.instrument.sample)
    }, [selectedLayer])

    useEffect(async () => {
        const { customInstruments } = round
        if (customInstruments) {
            const cmb = await addCustomInstruments(customInstruments)
            setCombinedInstrumentOptions(cmb)
        }
    }, [round])

    const addCustomInstruments = (customInstruments) => {
        return new Promise(async resolve => {
            const customInstrumentArray = []
            let preCombined = []
            const length = Object.keys(customInstruments).length
            Object.values(customInstruments).forEach(async instrument => {
                const articulation = await Instruments.create('custom', instrument.id, instrument.id)
                customInstrumentArray.push({
                    label: instrument.displayName.replaceAll(' ', '-'),
                    name: instrument.displayName,
                    type: 'custom',
                    articulations: { [instrument.displayName]: [articulation] }
                })
                preCombined = [...instrumentOptions, ...customInstrumentArray]
                if (length === customInstrumentArray.length) resolve(preCombined)
            })
        })
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
                    <Box style={{
                        display: 'flex',
                        flexDirection: 'row'
                    }}>
                        <IconButton ref={instrumentsButtonRef} id='instrument' onClick={toggleShowInstrumentList} style={{ flex: 6, borderBottom: showInstrumentsList ? 'thin solid rgba(255, 255, 255, 0.1)' : 'none' }} className={classes.rectButton}>
                            {showInstrumentsList && <Box style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                                <img alt='right arrow' src={LeftArrow} />
                            </Box>}
                            <Box style={{ flex: showInstrumentsList ? 7 : 5, display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                                <Typography style={{ display: 'flex', flex: 2, textAlign: 'left', textTransform: 'Capitalize' }}>Instrument</Typography>
                            </Box>
                            {!showInstrumentsList &&
                                <>
                                    <Typography style={{ flex: 3, textAlign: 'left', textTransform: 'Capitalize' }}>
                                        {selectedInstrument}
                                    </Typography>
                                    <Box style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                                        <img alt='right arrow' src={RightArrow} />
                                    </Box>
                                </>
                            }
                        </IconButton>
                        {showInstrumentsList &&
                            <Box style={{ display: 'flex', flex: 1, borderBottom: 'thin solid rgba(255, 255, 255, 0.1)', padding: 5 }}>
                                <IconButton
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleCustomInstrumentDialog()
                                    }}
                                    style={{ height: 25, width: 25 }}
                                >
                                    <img alt="new instrument" src={Plus} />
                                </IconButton>
                            </Box>
                        }
                    </Box>
                    {showInstrumentsList &&
                        <Box style={{ display: 'flex', flexDirection: 'column', overflow: 'scroll' }}>
                            {combinedInstrumentOptions.map((instrument, i) =>
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