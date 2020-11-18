import React, { useRef, } from 'react';
import { Vector3 } from 'three';
import Step from './Step.component';

const Constants = {
  AXIS: new Vector3(0, 1, 0),
  ANGLE: Math.PI / 2,
};


const LayerLine = ({ radius, }) => {
  const mesh = useRef();
  const torusConstructorArgs = [
    radius, // radius
    0.01, // radius of tube
    4, // radialSegments
    64, // tubularSegments
  ];
  return (
    <mesh
      ref={mesh}
    >
      <torusBufferGeometry
        attach="geometry"
        args={torusConstructorArgs}
      />
      <meshStandardMaterial
        attach="material"
      />
    </mesh>
  );
};

const RoundLayer = (props) => (
  <>
    <LayerLine radius={props.radius} />
    {props.layer.steps.map((step, index) => {
      const positionTheta = (index / props.layer.steps.length) * 2 * Math.PI;
      const stepPosition = new Vector3()
        .setFromSphericalCoords(props.radius, positionTheta, 0)
        .applyAxisAngle(Constants.AXIS,  Constants.ANGLE);
      return (
        <Step
          key={step.id}
          position={stepPosition}
          step={step}
        />
      );
    })}
  </>
);

export default RoundLayer;
