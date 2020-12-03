import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import compose from 'recompose/compose';
import { MathUtils, TorusBufferGeometry } from 'three';
import { Layer, Instrument, UX } from '../../constants';
import { connect } from "react-redux";
import { updateLayerInstrument, toggleLayer } from "../../../../redux/actions";
import Effects from '../Effects';

import styles from './LayerLine.styles.scss';

let shiftDown = false;

function onDocumentKeyDown(e) {
    if (e.key === "Shift") shiftDown = true;
}

function onDocumentKeyUp(e) {
    if (e.key === "Shift") shiftDown = false;
}

document.addEventListener("keydown", onDocumentKeyDown, false);
document.addEventListener("keyup", onDocumentKeyUp, false);


const LayerLineComponent = ({
    user,
    editable,
    radius,
    layer,
    layerIndex,
    onCopyHandler,
    onPasteHandler,
    selectLayer,
    deselectLayer,
    selected,
    deleteLayer,
    updateLayerInstrument,
    toggleLayer,
}) => {
    const radialSegments = 2;
    const tubularSegments = 64;

    const minThikness = Layer.Line.MinThickness;
    const maxThikness = Layer.Line.MaxThickness;

    const currentThinkness = useMemo(() => MathUtils.mapLinear(
            layer.instrument.gain,
            Instrument.MinGain,
            Instrument.MaxGain,
            minThikness,
            maxThikness
        ), [layer.instrument.gain])

    const [torusArgs, setTorusArgs] = useState([radius, currentThinkness, radialSegments, tubularSegments,]);

    const invisibleTorus = useMemo(() => [radius, maxThikness * 2, radialSegments, tubularSegments,], [radius])

    const [pointerDown, setPointerDown] = useState(false);

    const mesh = useRef();

    useEffect(() => {
        const onCopy = () => {
            if (selected == layer.id) {
                console.log('copy')
                onCopyHandler(layer)
            }
        }

        const onPaste = () => {
            if (selected == layer.id) {
                console.log('paste')
                onPasteHandler(layer)
            }
        }

        document.addEventListener('copy', onCopy);
        document.addEventListener('paste', onPaste);

        return () => {
            document.removeEventListener('copy', onCopy);
            document.removeEventListener('paste', onPaste);
        }
    }, [selected])

    useEffect(() => {
        const onPointerUp = () => {
            setPointerDown(false);
        }
        document.addEventListener("pointerup", onPointerUp);
        return () => {
            document.removeEventListener("pointerup", onPointerUp);
        }
    }, []);

    const torusGeometry = useMemo(() => new TorusBufferGeometry(torusArgs))

    useEffect(() => {
        const onPointerMove = (event) => {
            if (pointerDown) {
                const torusThikness = mesh.current.geometry.parameters.tube;

                const newGain = MathUtils.mapLinear(torusThikness, minThikness, maxThikness, Instrument.MinGain, Instrument.MaxGain);
                if (newGain != layer.instrument.gain) {
                    updateLayerInstrument(layerIndex, { gain: newGain }, user.id);
                }

                if (event.movementY < 0 && torusThikness < maxThikness) {
                    const tube = +(torusThikness + 0.001 * UX.Layer.Gain).toFixed(3);
                    setTorusArgs([radius, tube, radialSegments, tubularSegments,]);
                }
                else if (event.movementY > 0 && torusThikness > minThikness) {
                    const tube = +(torusThikness - 0.001 * UX.Layer.Gain).toFixed(3);
                    setTorusArgs([radius, tube, radialSegments, tubularSegments,]);
                }

            }
        }

        document.addEventListener("pointermove", onPointerMove);

        return () => {
            document.removeEventListener("pointermove", onPointerMove);
        }
    }, [pointerDown]);

    useEffect(() => {
        setTorusArgs([radius, currentThinkness, radialSegments, tubularSegments,]);
    }, [radius, layer.instrument.gain]);

    const onLayerClick = useCallback(() => {
        if(selected) {
            deselectLayer();
        } else {
            selectLayer(layer.id);
        }
        setPointerDown(true);
    }, [layer, selected])

    const onDoubleClick = useCallback(() => {
        if (shiftDown) {
            deleteLayer(layerIndex);
        } else {
            toggleLayer(!layer.isActive, layerIndex, user.id);
        }
    }, [shiftDown, layerIndex, layer.isActive])

    return (
        <>
            <mesh
                ref={mesh}
            >
                <torusBufferGeometry
                    attach="geometry"
                    args={torusArgs}
                />
                <meshStandardMaterial
                    attach="material"
                    color={selected == layer.id ? Layer.Color.Selected : (layer.color || Layer.Color.Deselected)}
                    opacity={!layer.isActive ? 0 : 1}
                    transparent={!layer.isActive}
                />

                <mesh
                    onPointerDown={editable ? onLayerClick : null}
                    onDoubleClick={editable ? onDoubleClick : null}
                >
                    <torusBufferGeometry
                        attach="geometry"
                        args={invisibleTorus}
                    />
                    <meshStandardMaterial
                        attach="material"
                        opacity={0}
                        transparent={true}
                    />
                </mesh>
                {/* {
          selected &&
          <Effects></Effects>
        } */}
            </mesh>
            {
                !layer.isActive &&
                <mesh>
                    <lineSegments>
                        <edgesGeometry
                            attach="geometry"
                            args={[mesh.current ? mesh.current.geometry : torusGeometry]}
                        />
                        <lineBasicMaterial
                            color={selected == layer.id ? Layer.Color.Selected : (layer.color || Layer.Color.Deselected)}
                            attach="material"
                        />
                    </lineSegments>
                </mesh>
            }
        </>
    );
};

const mapStateToProps = state => {
    return {
        user: state.user
    };
};

const dispatchToProps = {
    toggleLayer,
    updateLayerInstrument,
}

export default connect(
    mapStateToProps,
    dispatchToProps
)(LayerLineComponent);
