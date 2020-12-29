import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { connect, ReactReduxContext, Provider } from "react-redux";
import compose from 'recompose/compose';
const classNames = require("classnames");

import { setLayerName, updateLayerInstrument, toggleRaycaster, setLayerControlsPositions } from '../../redux/actions';
import { Constants, Layer } from '../../constants';
import Modal from '../modal/Modal.component';
import InstrumentSelect from '../instrument-select/InstrumentSelect.component';
import { initiateElementWatch, watchCleanup } from '../../utils/htmlHelpers';
import styles from './LayerControls.styles.scss';

const LayerControlsComponent = ({
    user,
    layer,
    editable,
    radius,
    roundRadius,
    layerIndex,
    setLayerName,
    updateLayerInstrument,
    toggleRaycaster,
    settingsPane,
    setLayerControlsPositions
}) => {
    const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);

    const patternLabel = useRef();
    const layerLabel = useRef();

    const onInstrumentSelect = useCallback((instrument, sampler, sample) => {
        updateLayerInstrument(layerIndex, { instrument, sampler, sample }, user.id);
    }, [layerIndex])

    const onModalClose = useCallback((event) => {
        event.stopPropagation();
        setInstrumentModalOpen(false);
        toggleRaycaster(true);
    }, [])


    const onInstrumentClick = useCallback(() => {
        setInstrumentModalOpen(true);
        toggleRaycaster(false)
    }, [])

    useEffect(() => {
        const watchFunction = initiateElementWatch(patternLabel, '...');
        return watchCleanup(patternLabel, watchFunction);
    }, [patternLabel.current])


    const getInstrumentModal = () => {
        return (
            <Modal
                isOpen={instrumentModalOpen}
                onModalClose={onModalClose}
            >
                <InstrumentSelect
                    onInstrumentSelect={onInstrumentSelect}
                    instrumentObject={layer.instrument}
                    layerIndex={layerIndex}
                />
            </Modal>
        )

    }

    const getControls = () => {
        return (
            <>
                <div>
                    <div
                        ref={patternLabel}
                        className={styles.patternLabelInput}
                        contentEditable={editable}
                    />
                </div>
                <div>
                    <div
                        ref={layerLabel}
                        className={styles.layerLabelInput}
                        contentEditable={editable}
                    />
                </div>
                <div
                    className={styles.instrumentLabelContainer}
                    style={{
                        background: layer.color || Layer.Instrument.LabelColor.getStyle()
                    }}
                >
                    <div
                        className={classNames(editable ? styles.instrumentLabel : [styles.cannotEdit, styles.instrumentLabel])}
                        onClick={editable ? onInstrumentClick : null}
                    >
                        {
                            layer.instrument.instrument === 'Sampler'
                                ?
                                `Sampler - ${layer.instrument.sampler}`
                                :
                                layer.instrument.instrument
                        }
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {
                settingsPane &&
                <>
                    {getInstrumentModal()}
                    {getControls()}
                </>
            }
        </>
    )
}

const mapStateToProps = state => {
    return {
        user: state.user
    };
};

const dispatchToProps = {
    setLayerName,
    updateLayerInstrument,
    toggleRaycaster,
    setLayerControlsPositions
}

export default compose(
    connect(
        mapStateToProps,
        dispatchToProps
    ),
    React.memo
)(LayerControlsComponent);