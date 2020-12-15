import React, { useEffect, useRef } from 'react';
import { initiateElementWatch, watchCleanup } from '../htmlHelpers';
import { Html } from "drei";
const classNames = require("classnames");
import { UX, Layer } from '../../../../utils/constants';
import styles from './LayerMark.styles.scss';

const LayerMarkComponent = ({
    editable,
    onStepsChange,
    position,
    rotation,
    numberOfBeats,
    color
}) => {
    const CUBE_ARGS = [Layer.Mark.Length, 0.1, 0.1,];

    const mesh = useRef();
    const numberOfBeatsLabel = useRef();

    const onNumberOfBeatsClick = () => {
        numberOfBeatsLabel.current.textContent = '';
    }

    useEffect(() => {
        const watchFunctions = initiateElementWatch(numberOfBeatsLabel, numberOfBeats, onStepsChange);
        return watchCleanup(numberOfBeatsLabel, watchFunctions);
    }, [numberOfBeatsLabel.current, numberOfBeats, onStepsChange])

    return (
        <mesh
            ref={mesh}
            position={position}
            rotation={rotation}
        >
            <boxBufferGeometry
                attach="geometry"
                args={CUBE_ARGS}
            />
            <meshStandardMaterial
                attach="material"
                color={color || Layer.Mark.Color}
            />
            <Html
                zIndexRange={[1000, 100]}
                className={editable ? '' : styles.cannotEdit}
                center
            >
                <div
                    ref={numberOfBeatsLabel}
                    onClick={onNumberOfBeatsClick}
                    className={styles.numberOfBeats}
                    contentEditable
                />
            </Html>
        </mesh>
    );
}

export default LayerMarkComponent;
