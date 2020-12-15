import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import compose from 'recompose/compose';
import { BoxBufferGeometry, MathUtils, Color } from 'three';
import { useFrame } from 'react-three-fiber';
import { diff } from 'deep-object-diff';
import * as _ from 'lodash';
import { Html } from "drei";
import { connect } from "react-redux";
import { initiateElementWatch, watchCleanup, usePrevious } from '../htmlHelpers';
import { toggleStep, setStepVelocity, setStepProbability, setStepNote } from "../../../../redux/actions";
const classNames = require('classnames');
import { Step, Beat, Colors, UX } from '../../../../utils/constants';
import StepEdges from './StepEdges.component';
import styles from './Step.styles.scss';

const StepComponent = ({
    editable,
    user,
    color,
    step,
    position,
    editingMode,
    toggleStep,
    setStepVelocity,
    setStepProbability,
    setStepNote,
    layerIndex,
    stepIndex,
    activeLayerHelper
}) => {

    const mounted = useRef();

    let changeThrottling = false;
    const SIDE = Step.Geometry.EdgeLength;
    const CUBE_ARGS = [SIDE, SIDE, SIDE,];

    const mesh = useRef();
    const noteLabel = useRef();

    const prevStep = usePrevious(step);

    const minScale = Step.Geometry.MinScale;
    const maxScale = Step.Geometry.MaxScale;

    const minVelocity = Beat.MinVelocity;
    const maxVelocity = Beat.MaxVelocity;

    const minProbability = Beat.MinProbability;
    const maxProbability = Beat.MaxProbability;

    const minOpacity = 0;
    const maxOpacity = 1;

    const currentScale = useMemo(() => MathUtils.mapLinear(step.velocity, minVelocity, maxVelocity, minScale, maxScale), [step.velocity]);
    const currentOpacity = useMemo(() => MathUtils.mapLinear(step.probability, minProbability, maxProbability, minOpacity, maxOpacity), [step.probability]);

    const [pointerDown, setPointerDown] = useState(false);
    const [editingNote, setEditingNote] = useState(false);
    const [changingProperty, setChangingProperty] = useState('');

    const [scale, setScale] = useState([currentScale, currentScale, currentScale,]);
    const [opacity, setOpacity] = useState(currentOpacity);

    const [displayParameters, setDisplayParameters] = useState(false);

    const threeFillColor = useMemo(() => color ? new Color(color) : undefined, [color])

    const handleClick = useCallback((event) => {
        event.stopPropagation();
        if (editingMode === 'steps' && !editingNote) {
            toggleStep(!step.isOn, layerIndex, stepIndex, user.id);
        }

        if (editingMode === 'notes' || editingNote) {
            noteLabel.current.focus();
        }
    }, [editingMode, step.isOn, layerIndex, stepIndex, noteLabel.current, editingNote])

    // Todo: do a lot less in here! Think this is what's frying my CPU
    useFrame((state, elapsedTime) => {
        // console.log('useFrame');
        const { activePercent } = activeLayerHelper.steps[step.id].update(elapsedTime);
        const colorSource = threeFillColor || Colors.on;
        const color = colorSource.clone().lerp(Colors.active, activePercent);
        mesh.current.material.color.copy(color);
        mesh.current.material.transparent = true;
    });

    const onSetNote = (note) => {
        const newNote = note.toUpperCase();
        noteLabel.current.textContent = newNote;
        setStepNote(newNote, layerIndex, stepIndex, user.id);
        setEditingNote(false);
        activeLayerHelper.steps[step.id].setNote(note);
    }

    useEffect(() => {
        const watchFunctions = initiateElementWatch(noteLabel, step.note, onSetNote);
        return watchCleanup(noteLabel, watchFunctions);
    }, [noteLabel.current, step.note])

    useEffect(() => {
        if (!mounted.current) {
            console.log('componentDidMount')
            mounted.current = true;
        } else {
            if (!_.isEmpty(diff(prevStep, step))) {
                // optimise components updates
                console.log('componentDidUpdate')
            }
        }
    });

    useEffect(() => {
        const currentScale = MathUtils.mapLinear(step.velocity, minVelocity, maxVelocity, minScale, maxScale);
        setScale([currentScale, currentScale, currentScale,]);
        if (activeLayerHelper.steps[step.id]) {
            activeLayerHelper.steps[step.id].setVelocity(step.velocity);
        }
    }, [step.velocity])

    useEffect(() => {
        const currentOpacity = MathUtils.mapLinear(step.probability, minProbability, maxProbability, minOpacity, maxOpacity);
        setOpacity(currentOpacity);
        if (activeLayerHelper.steps[step.id]) {
            activeLayerHelper.steps[step.id].setProbability(step.probability);
        }
    }, [step.probability])

    useEffect(() => {
        const onPointerUp = () => {
            document.getElementsByTagName('body')[0].style.pointerEvents = "auto";
            setPointerDown(false);
            setChangingProperty('');
        }

        document.addEventListener("pointerup", onPointerUp);

        return () => {
            document.removeEventListener("pointerup", onPointerUp);
        }
    }, [])

    useEffect(() => {
        function onDocumentKeyDown (e) {
            if (e.key === "Shift") setEditingNote(true);
        }

        function onDocumentKeyUp (e) {
            if (e.key === "Shift" && noteLabel.current !== document.activeElement) setEditingNote(false);
        }

        document.addEventListener("keydown", onDocumentKeyDown);
        document.addEventListener("keyup", onDocumentKeyUp);

        return () => {
            document.removeEventListener("keydown", onDocumentKeyDown);
            document.removeEventListener("keyup", onDocumentKeyUp);
        }
    }, [])

    useEffect(() => {
        activeLayerHelper.addStep(step);
        return () => {
            activeLayerHelper.removeStep(step.id);
        }
    }, [])

    useEffect(() => {
        activeLayerHelper.toggleStep(step.id, step.isOn);
    }, [step.isOn])

    const onPointerEnterHandler = useCallback(() => {
        setDisplayParameters(true);
    }, [])

    const onPointerLeaveHandler = useCallback(() => {
        setDisplayParameters(false);
    }, [])

    const onPointerDownHandler = useCallback(() => {
        setPointerDown(true);
    }, [])

    // TODO: revisit
    useEffect(() => {
        const onPointerMove = (e) => {
            if (!pointerDown || (e.movementY == 0 && e.movementX == 0)) return;
            document.getElementsByTagName('body')[0].style.pointerEvents = "none";

            if (changingProperty === 'probability') {
                let newOpacity = opacity;

                if (e.movementX < 0 && opacity > minOpacity) {
                    newOpacity = opacity - 0.1 * UX.Step.Probability;
                }

                if (e.movementX > 0 && opacity < maxOpacity) {
                    newOpacity = opacity + 0.1 * UX.Step.Probability;
                }

                const newProbability = +MathUtils.mapLinear(newOpacity, minOpacity, maxOpacity, minProbability, maxProbability).toFixed(1);
                if (newProbability != step.probability) {
                    if (changeThrottling) return;
                    setStepProbability(newProbability, layerIndex, stepIndex, user.id);
                    activeLayerHelper.steps[step.id].setProbability(step.probability);
                    changeThrottling = true;

                    setTimeout(() => {
                        changeThrottling = false;
                    }, 50);
                }

                setOpacity(newOpacity);
            } else if (changingProperty === 'velocity') {

                let newScale = scale;

                if (e.movementY > 0 && scale[0] > minScale) {
                    newScale = scale.map((x) => (x - 0.1 * UX.Step.Velocity));
                }

                if (e.movementY < 0 && scale[0] < maxScale) {
                    newScale = scale.map((x) => (x + 0.1 * UX.Step.Velocity));
                }

                const newVelocity = +MathUtils.mapLinear(newScale[0], minScale, maxScale, minVelocity, maxVelocity).toFixed(1);
                if (newVelocity != step.velocity) {
                    if (changeThrottling) return;
                    setStepVelocity(newVelocity, layerIndex, stepIndex, user.id);
                    activeLayerHelper.steps[step.id].setVelocity(step.velocity);
                    changeThrottling = true;

                    setTimeout(() => {
                        changeThrottling = false;
                    }, 50);
                }
                setScale(newScale);
            } else {
                const property = Math.abs(e.movementX) > 0 ? 'probability' : 'velocity';
                setChangingProperty(property);
            }
        }

        document.addEventListener("pointermove", onPointerMove);

        return () => {
            document.removeEventListener("pointermove", onPointerMove);
        }
    }, [pointerDown, opacity, scale, changingProperty])

    const cubeGeometry = useMemo(() => new BoxBufferGeometry(CUBE_ARGS), [])

    return (
        <>
            <mesh
                ref={mesh}
                position={position}
                scale={scale}
                onClick={editable ? handleClick : null}
                onPointerDown={editable ? onPointerDownHandler : null}
                onPointerEnter={onPointerEnterHandler}
                onPointerLeave={onPointerLeaveHandler}
            >
                <boxBufferGeometry
                    attach="geometry"
                    args={CUBE_ARGS}
                />
                <meshStandardMaterial
                    attach="material"
                    color={color || Step.Geometry.FillColor}
                    opacity={!step.isOn ? 0 : opacity}
                    transparent={!step.isOn}
                />
                <Html
                    zIndexRange={[1000, 100]}
                >
                    {
                        (displayParameters || pointerDown) &&
                        <div
                            className={styles.beatParameters}
                        >
                            Velocity: {step.velocity}
                            <br />
                            Probability: {step.probability}
                        </div>
                    }
                </Html>
            </mesh>
            <mesh
                position={position}
                scale={scale}
            >
                <StepEdges
                    geometry={mesh.current ? mesh.current.geometry : cubeGeometry}
                    color={color || Step.Geometry.EdgeColor}
                />
            </mesh>
        </>
    )
};

const mapStateToProps = state => {
    return {
        editingMode: state.editingMode,
        user: state.user
    };
};

const dispatchToProps = {
    toggleStep,
    setStepVelocity,
    setStepProbability,
    setStepNote
};

export default compose(
    connect(
        mapStateToProps,
        dispatchToProps
    ),
    React.memo
)(StepComponent);
