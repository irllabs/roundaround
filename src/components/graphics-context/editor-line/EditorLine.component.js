import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useFrame } from 'react-three-fiber';
import { Geometry, LineBasicMaterial, Line, Vector3, Group } from 'three';
import { connect } from "react-redux";
import * as _ from 'lodash';
import { usePrevious } from '../round/htmlHelpers';
import { EditorLineParams } from '../../../utils/constants';


const EditorLineComponent = ({ collaboration, round, user, positions }) => {
    const previousEdition = usePrevious(round.lastEdition);
    const mounted = useRef();

    const linesGroup = useMemo(() => new Group(), []);

    const getNewLine = () => {
        let startingPoint = new Vector3(0, 0, 0);
        let endingPoint = new Vector3(0, 0, 0);
        if (positions.contributors && round.lastEditor && round.lastEdition && round.lastEditor !== user.id) {
            startingPoint = positions.contributors[round.lastEditor];
            if (round.lastEdition.unit === 'round') {
                endingPoint = positions.round;
            }
            if (round.lastEdition.unit === 'layer') {
                endingPoint = positions.layers[round.lastEdition.layerIndex];
            }
            if (round.lastEdition.unit === 'layerControls') {
                endingPoint = positions.layerControls[round.lastEdition.layerIndex];
            }
            if (round.lastEdition.unit === 'step') {
                if (positions.steps[round.lastEdition.layerIndex]) {
                    endingPoint = positions.steps[round.lastEdition.layerIndex][round.lastEdition.stepIndex];
                }
            }
        }

        if (!startingPoint) {
            startingPoint = new Vector3(0, 0, 0);
        }
        if (!endingPoint) {
            endingPoint = new Vector3(0, 0, 0);
        }

        const color = collaboration && collaboration.contributors && round.lastEditor ? collaboration.contributors[round.lastEditor].color : '#fff'

        const geometry = new Geometry();
        geometry.dynamic = true;
        geometry.vertices.push(startingPoint);
        geometry.vertices.push(endingPoint);
        geometry.verticesNeedUpdate = true;
        const material = new LineBasicMaterial({ color });
        const newline = new Line(geometry, material);

        return newline;
    }

    useFrame((state, elapsedTime) => {
        linesGroup.children.forEach((line) => {
            const a = line.geometry.vertices[0];
            const b = line.geometry.vertices[1];
            const newA = new Vector3(0, 0, 0);
            newA.subVectors(b, a);
            newA.multiplyScalar(elapsedTime * EditorLineParams.speed);
            newA.add(a);
            line.geometry.vertices = [newA, b]
            line.geometry.verticesNeedUpdate = true;
        })
    });

    useEffect(() => {
        if (mounted.current) {

            if (round.lastEdition !== previousEdition) {
                const newLine = getNewLine();
                linesGroup.add(newLine);
                linesGroup.children.forEach(line => {
                    const a = line.geometry.vertices[0];
                    const b = line.geometry.vertices[1];
                    if (a.length().toFixed(3) === b.length().toFixed(3)) {
                        line.geometry.dispose();
                        linesGroup.remove(line)
                    }
                });
            }
        } else {
            mounted.current = true;
        }
    }, [round.lastEditor, round.lastEdition, positions, previousEdition, linesGroup.children])

    return (
        <primitive object={linesGroup} />
    )

};
const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        positions: state.positions
    };
};

export default connect(
    mapStateToProps,
    null
)(EditorLineComponent);
