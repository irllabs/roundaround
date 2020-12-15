import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useFrame } from 'react-three-fiber';
import * as Tone from 'tone';
import { Constants } from '../../../utils/constants';
import { Colors } from '../../../utils/constants';

const RoundHandComponent = React.memo(({ length }) => {
    const CUBE_ARGS = [length, 0.01, 0.0001,];
    const mesh = useRef();
    const [dummySequence, setDummySequence] = useState({ progress: 0 });

    useEffect(() => {
        // needed to watch the progress of other sequences since transport.progress does not seem to work
        const newSequence = new Tone.Part(() => { }, ['C4', 'C4']);
        newSequence.loop = true;
        newSequence.start(0);
        setDummySequence(newSequence)
    }, []);

    const getHandData = () => {
        const positionTheta = (dummySequence.progress / 1) * 2 * Math.PI;
        const handPosition = new Vector3()
            .setFromSphericalCoords(length / 2, positionTheta, 0)
            .applyAxisAngle(Constants.AXIS, Constants.ANGLE);
        return [handPosition, positionTheta];
    }

    const setHandPositionAndRotation = (position, theta) => {
        mesh.current.position.x = position.x;
        mesh.current.position.y = position.y;
        mesh.current.position.z = position.z;

        mesh.current.rotation.z = - (theta - Math.PI / 2);
    }

    useFrame((state, elapsedTime) => {
        const [handPosition, positionTheta] = getHandData();
        setHandPositionAndRotation(handPosition, positionTheta);
    });

    useEffect(() => {
        const [handPosition, positionTheta] = getHandData();
        setHandPositionAndRotation(handPosition, positionTheta);
    }, [])

    return (
        <mesh
            ref={mesh}
        >
            <boxBufferGeometry
                attach="geometry"
                args={CUBE_ARGS}
            />
            <meshStandardMaterial
                attach="material"
                color={Colors.neutral}
            />
        </mesh>
    );
})

export default RoundHandComponent;
