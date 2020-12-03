import React, { useMemo } from 'react';
import { SphereArgs } from '../constants';
import { Color } from 'three';
import { Sphere } from "drei";

const ContributorComponent = ({color, position,}) => {
    const sphereColor = useMemo(() => new Color(color), [color]);

    return (
        <Sphere args={SphereArgs.Contributor} position={position}>
            <meshStandardMaterial color={sphereColor} attach="material" />
        </Sphere>
    )
  
};

export default ContributorComponent;
