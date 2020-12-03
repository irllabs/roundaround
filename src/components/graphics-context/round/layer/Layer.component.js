import React, { useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
import { Vector3 } from 'three';
import compose from 'recompose/compose';
import { connect } from "react-redux";
import { Html } from 'drei';
import { setLayerSteps, setStepsPositions } from '../../../../redux/actions'
import Step from '../step/Step.component';
import InstrumentComponent from '../instrument/Instrument.component';
import LayerMark from './LayerMark.component';
import LayerLine from './LayerLine.component';
import LayerControls from './LayerControls.component';
import { Constants, Limits } from '../../constants';
import { getDefaultStepData } from '../dummyData';
import { ActiveLayer } from '../instrument/Active';
import { changeLayerLength } from '../../../../utils';
import { FirebaseContext } from '../../../../firebase/index';

const LayerComponent = ({
    user,
    layer,
    radius,
    roundRadius,
    copyLayerPattern,
    pasteLayerPattern,
    selectLayer,
    deselectLayer,
    deleteLayer,
    selected,
    layerIndex,
    setLayerSteps,
    setStepsPositions
}) => {

    const firebase = useContext(FirebaseContext);
    const editable = useMemo(() => !layer.readonly || !firebase.currentUser || layer.creator === firebase.currentUser.uid, [layer.readonly, layer.creator, firebase.currentUser]);

    const activeLayer = useMemo(() => new ActiveLayer(layer.isActive), []);

    const stepPositions = useMemo(() => layer.steps.map((acc, i) => {
        const positionTheta = ((i) / layer.steps.length) * 2 * Math.PI;
        const stepPosition = new Vector3()
            .setFromSphericalCoords(radius, positionTheta, 0)
            .applyAxisAngle(Constants.AXIS, Constants.ANGLE);
        return stepPosition;
    }), [layer.steps.length, radius])

    const markData = useMemo(() => {
        const amount = layer.steps.length;
        const positionTheta = ((amount - 0.5) / amount) * 2 * Math.PI;
        const position = new Vector3()
            .setFromSphericalCoords(radius, positionTheta, 0)
            .applyAxisAngle(Constants.AXIS, Constants.ANGLE);
        const rotation = [0, 0, -positionTheta + Math.PI / 2];

        return { position, rotation };
    }, [radius, layer.steps.length])

    const onStepsChange = useCallback((newLength) => {
        const newSteps = changeLayerLength(layer, newLength);
        setLayerSteps(layerIndex, newSteps, user.id);
        console.log('layer index', layerIndex)
    }, [layer.steps.length, layerIndex])

    useEffect(() => { activeLayer.toggleLayerActive(layer.isActive) }, [layer.isActive]);

    useEffect(() => {
        setStepsPositions(layerIndex, stepPositions);
    }, [stepPositions])

    return (
        <>
            <InstrumentComponent
                instrument={layer.instrument}
                active={activeLayer}
                steps={layer.steps}
            />
            <LayerControls
                editable={editable}
                layer={layer}
                radius={radius}
                layerIndex={layerIndex}
                roundRadius={roundRadius}
            />
            <LayerLine
                editable={editable}
                radius={radius}
                activeLayerHelper={activeLayer}
                onCopyHandler={copyLayerPattern}
                onPasteHandler={pasteLayerPattern}
                layerIndex={layerIndex}
                layer={layer}
                selectLayer={selectLayer}
                deselectLayer={deselectLayer}
                deleteLayer={deleteLayer}
                selected={selected}
            />
            <LayerMark
                color={layer.color}
                editable={editable}
                numberOfBeats={layer.steps.length}
                onStepsChange={onStepsChange}
                position={markData.position}
                rotation={markData.rotation}
            ></LayerMark>
            {
                layer.steps.map((step, index) => {
                    return (
                        <mesh key={step.id}>
                            <Step
                                editable={editable}
                                color={layer.color}
                                activeLayerHelper={activeLayer}
                                layerIndex={layerIndex}
                                stepIndex={index}
                                position={stepPositions[index]}
                                step={step}
                            />
                        </mesh>
                    );
                })
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
    setLayerSteps,
    setStepsPositions
};

export default compose(
    connect(
        mapStateToProps,
        dispatchToProps
    ),
    React.memo
)(LayerComponent);