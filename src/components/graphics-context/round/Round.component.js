import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import compose from 'recompose/compose';
import { Line, CircleGeometry, LineDashedMaterial, Vector3, TextureLoader, Color } from 'three';
import { Html, Sphere } from "drei";
import { connect } from "react-redux";
import * as Tone from 'tone';
import * as _ from 'lodash';
import { addRoundLayer, removeRoundLayer, setRoundName, setRoundBpm, setLayerSteps, resetRoundStore, setLayersPositions, setRoundInfoPosition } from '../../../redux/actions';
import { getDefaultLayerData, refrashAllIdsInArray } from './dummyData';
import { initiateElementWatch, watchCleanup } from './htmlHelpers';
import { Constants, SphereArgs, Layer, Round, Colors } from '../constants';
import RoundLayer from './layer/Layer.component';
import RoundHand from './RoundHand.component';
import styles from './Round.styles.scss';
import '../../../textures/plus_sign.png';

const RoundComponent = ({
    round,
    addRoundLayer,
    removeRoundLayer,
    setRoundName,
    setRoundBpm,
    setLayerSteps,
    setLayersPositions,
    resetRoundStore,
    user,
    collaboration,
    setRoundInfoPosition
}) => {
    const layersAmount = round.layers ? round.layers.length : 0;

    const [copiedLayer, setCopiedLayer] = useState(null);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [plusSignTexture, setPlusSignTexture] = useState();

    const label = useRef();
    const bpmLabel = useRef();

    const labelPosition = useMemo(() => {
        const radius = Round.Padding.Interior + layersAmount * Layer.Padding;
        const position = new Vector3()
            .setFromSphericalCoords(radius, Math.PI / 2, 0)
            .applyAxisAngle(Constants.AXIS, Constants.ANGLE);
        
        setRoundInfoPosition(position);
        return position;
    }, [layersAmount])

    const dashedOutline = useMemo(() => {
        const radius = Round.Padding.Interior + (layersAmount - 1) * Layer.Padding;
        const dashMaterial = new LineDashedMaterial({ color: Round.DashedOutline.Color, dashSize: 0.1, gapSize: 0.05, linewidth: 2 });
        const circGeom = new CircleGeometry(radius + Round.DashedOutline.Padding, 160);

        circGeom.vertices.shift();

        const circ = new Line(circGeom, dashMaterial);
        circ.computeLineDistances();
        return circ;
    }, [round, layersAmount])

    const handLength = useMemo(() => {
        return Round.Padding.Interior + (layersAmount - 1) * Layer.Padding;
    }, [layersAmount])

    const onCopyLayerPattern = useCallback((layer) => {
        setCopiedLayer(layer);
    }, [])

    const onPasteLayerPattern = useCallback((layer) => {
        //rework copy-paste
        if (copiedLayer && layer.id != copiedLayer.id) {
            const index = round.layers.indexOf(layer);
            const stepsToCopy = refrashAllIdsInArray(copiedLayer.steps);
            setLayerSteps(index, stepsToCopy, user.id);
        }
    }, [copiedLayer, round.layers.length])

    const onSelectLayer = useCallback((id) => {
        setSelectedLayer(id);
    }, [])

    const onDeselectLayer = useCallback(() => {
        setSelectedLayer();
    }, [])

    const onDeleteLayer = useCallback((layerIndex) => {
        removeRoundLayer(layerIndex, user.id)
    }, [])


    const addNewLayer = useCallback(() => {
        const newLayer = getDefaultLayerData(user.id);
        addRoundLayer(newLayer, user.id);
    }, [])

    const onSetRoundName = (name) => {
        setRoundName(name, user.id)
    }

    useEffect(() => {
        const watchFunctions = initiateElementWatch(label, round.name, onSetRoundName);
        return watchCleanup(label, watchFunctions);
    }, [round.name, label.current])

    const onSetRoundBpm = (bpm) => {
        setRoundBpm(bpm, user.id)
    }

    useEffect(() => {
        Tone.Transport.bpm.value = round.bpm;

        const watchFunctions = initiateElementWatch(bpmLabel, round.bpm, onSetRoundBpm);
        return watchCleanup(bpmLabel, watchFunctions);
    }, [round.bpm, bpmLabel.current])

    useEffect(() => {
        var loader = new TextureLoader();

        loader.load('textures/plus_sign.png', (texture) => {
            setPlusSignTexture(texture);
        })

        return () => {
            console.log('round component getting unmounted')
            resetRoundStore()
        }
    }, [])

    useEffect(() => {
        const layersPositions = round.layers.map((layer, i) => {
            const x = Round.Padding.Interior + i * Layer.Padding;
            console.log('x', x)
            return new Vector3(0, x, 0);
        });
        setLayersPositions(layersPositions);
    }, [round.layers.length])

    const plusButtonColor = useMemo(() => {
        return user.color || Colors.on;
    }, [user.color])

    const roundRadius = useMemo(() => Round.Padding.Interior + (round.layers.length - 1) * Layer.Padding, [round.layers.length])

    return (
        <>
            <primitive object={dashedOutline} />
            <Html
                position={labelPosition}
                className={styles.roundLabel}
                zIndexRange={[10, 0]}
            >
                <div
                    ref={label}
                    contentEditable="true"
                />
                <div
                    ref={bpmLabel}
                    contentEditable="true"
                    className={styles.bpmLabel}
                />
            </Html>
            <Sphere args={SphereArgs.addLayer} onClick={addNewLayer}>
                {
                    plusSignTexture &&
                    <meshStandardMaterial color={plusButtonColor} attach="material" map={plusSignTexture} />
                }
            </Sphere>
            <RoundHand
                length={handLength}
            />
            {
                round.layers.map((layer, index) => {
                    const radius = Round.Padding.Interior + index * Layer.Padding;
                    const collaborationAndContributor = collaboration && collaboration.contributors && collaboration.contributors[layer.creator];
                    if (collaborationAndContributor) {
                        layer = {...layer, color: collaboration.contributors[layer.creator].color};
                    } else {
                        layer = {...layer, color: user.color};
                    }
                    return (
                        <RoundLayer
                            copyLayerPattern={onCopyLayerPattern}
                            pasteLayerPattern={onPasteLayerPattern}
                            selectLayer={onSelectLayer}
                            deselectLayer={onDeselectLayer}
                            deleteLayer={onDeleteLayer}
                            selected={selectedLayer}
                            key={layer.id}
                            layer={layer}
                            layerIndex={index}
                            radius={radius}
                            roundRadius={roundRadius}
                        />
                    );
                })
            }
        </>
    );
}

const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration
    };
};

const dispatchToProps = {
    resetRoundStore,
    addRoundLayer,
    removeRoundLayer,
    setRoundName,
    setRoundBpm,
    setLayerSteps,
    setLayersPositions,
    setRoundInfoPosition
};

export default compose(
    connect(
        mapStateToProps,
        dispatchToProps
    ),
    React.memo
)(RoundComponent);
