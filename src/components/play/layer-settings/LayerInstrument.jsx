import React, { useContext, useEffect } from 'react'
import _ from 'lodash'
import { useDispatch } from "react-redux";

import Instruments from '../../../audio-engine/Instruments'
import { UPDATE_LAYER_INSTRUMENT } from '../../../redux/actionTypes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ICON_BUTTON } from './styles'

/** SVGs */
import RightArrow from './resources/svg/rightArrow.svg'
import Check from './resources/svg/check.svg'
import LeftArrow from './resources/svg/leftArrow.svg'
import { FirebaseContext } from '../../../firebase'

// MUI's Typography, default variant: a <p> with margin 0 at body1's own 16/1.5/0.00938em. The
// weight has to be spelled out too -- the generated Button puts text-sm/font-medium on its whole
// subtree, and every one of these labels sits inside one. So is the wrapping: `whitespace-nowrap`
// is on the Button as well, and the longest sample name (`Electro perc`) does not fit the 62px
// the `[flex:3]` column gets in a 216px popup. MUI let it wrap onto a second line; nowrap would
// make it the row's min-content width instead and squeeze `Sound` and the arrow.
const LABEL = 'm-0 text-left text-base font-normal leading-6 tracking-[0.00938em] whitespace-normal'

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

    useEffect(() => {
        setSelectedInstrument(selectedLayer.instrument.sampler)
        setSelectedArticulation(selectedLayer.instrument.sample)
    }, [selectedLayer])

    const onArticulationSelect = async (articulation) => {
        setSelectedArticulation(articulation.value);
        dispatch({ type: UPDATE_LAYER_INSTRUMENT, payload: { id: selectedLayer.id, instrument: { sampler: selectedInstrument, sample: articulation.value }, user: user.id } })
        firebase.updateLayer(roundId, selectedLayer.id, { instrument: { sample: articulation.value } })
    };

    return (
        <div id="instrument-popup" data-test="instrument-popup" data-open={String(showInstrumentsPopup)} inert={!showInstrumentsPopup} className={showInstrumentsPopup ? classes.instrumentPopup : classes.hidden}>
            {!showArticulationOptions &&
                <div>
                    <Button type="button" variant="plain" size="icon-app" ref={instrumentsButtonRef} id='instrument' onClick={toggleShowInstrumentList} className={cn(ICON_BUTTON, classes.rectButton, showInstrumentsList ? 'border-b border-white/10' : 'border-b-0')}>
                        {showInstrumentsList && <div className="flex flex-1 justify-start">
                            <img alt='right arrow' src={LeftArrow} className="h-[14px] w-2" />
                        </div>}
                        <div className={cn('flex justify-start', showInstrumentsList ? '[flex:7]' : '[flex:5]')}>
                            <p className={cn(LABEL, 'capitalize')}>Instrument</p>
                        </div>
                        {!showInstrumentsList &&
                            <>
                                <p className={cn(LABEL, '[flex:3] capitalize')}>
                                    {selectedInstrumentLabel}
                                </p>
                                <div className="flex flex-1 justify-end">
                                    <img alt='right arrow' src={RightArrow} className="h-[14px] w-2" />
                                </div>
                            </>
                        }
                    </Button>
                    {showInstrumentsList &&
                        <div className="flex flex-col">
                            {/* ref inside a map: it ends up on the last row, which is what it did
                                before this migration and all the click-away needs. */}
                            {instrumentOptions.map((instrument, i) =>
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="icon-app"
                                    ref={instrumentsListRef}
                                    id={`instrument-${i}`}
                                    key={`instrument-${i}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onInstrumentSelect(instrument)
                                    }
                                    } className={cn(ICON_BUTTON, classes.rectButton, 'justify-between')}>
                                    <p className={LABEL}>{instrument.label}</p>
                                    {selectedInstrument === instrument.name && <img alt='checked' src={Check} className="h-[10px] w-[14px]" />}
                                </Button>
                            )}
                        </div>
                    }
                </div>
            }
            {!showInstrumentsList &&
                <div>
                    <Button
                        type="button"
                        variant="plain"
                        size="icon-app"
                        id='sound'
                        ref={soundsButtonRef}
                        onClick={toggleArticulationOptions}
                        className={cn(ICON_BUTTON, classes.rectButton, showArticulationOptions ? 'border-b border-white/10' : 'border-b-0')}
                    >
                        {showArticulationOptions &&
                            <div className="flex flex-1 justify-start">
                                <img alt='right arrow' src={LeftArrow} className="h-[14px] w-2" />
                            </div>}
                        <p className={cn(LABEL, '[flex:5] capitalize')}>Sound</p>
                        {!showArticulationOptions &&
                            <>
                                <p className={cn(LABEL, '[flex:3] capitalize')}>
                                    {selectedLayer?.instrument?.sample}
                                </p>
                                <div className="flex flex-1 justify-end"><img alt='right arrow' src={RightArrow} className="h-[14px] w-2" /></div>
                            </>
                        }
                    </Button>
                    {showArticulationOptions &&
                        <div className="flex max-h-[300px] flex-col overflow-scroll">
                            {articulationOptions.map((articulation, i) =>
                                <Button
                                    type="button"
                                    variant="plain"
                                    size="icon-app"
                                    ref={articulationsListRef}
                                    id={`articulation-${i}`}
                                    key={`articulation-${i}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onArticulationSelect(articulation)
                                    }
                                    } className={cn(ICON_BUTTON, classes.rectButton, 'justify-between')}>
                                    <p className={LABEL}>{articulation.name}</p>
                                    {selectedArticulation === articulation.value && <img alt='checked' src={Check} className="h-[10px] w-[14px]" />}
                                </Button>
                            )}
                        </div>
                    }
                </div>
            }
        </div>
    )
}

export default LayerInstrument;
