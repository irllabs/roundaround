import React, { useRef } from 'react';
import { Color } from 'three';
import { useFrame } from 'react-three-fiber'

const Colors = {
  on: new Color(0.7, 0.7, 0.9),
  off: new Color(0.2, 0.3, 0.8),
  active: new Color(0.8, 0.3, 0.4),
};

const Step = (props) => {
  const SCALE = [ 1, 1, 1, ];
  const RADIUS = 0.2;
  const GEO_SEGMENTS = 16;
  const SPHERE_ARGS = [ RADIUS, GEO_SEGMENTS, GEO_SEGMENTS, ];
  const mesh = useRef();
  const handleClick = (event) => {
    event.stopPropagation();
    props.step.toggleStep();
  };
  
  useFrame((state, elapsedTime) => {
    const { activePercent } = props.step.update(elapsedTime);
    const colorState = props.step.isOn ? Colors.on : Colors.off;
    const color = colorState.clone().lerp(Colors.active, activePercent);
    mesh.current.material.color.copy(color);
  });
  
  return (
    <mesh
      ref={mesh}
      position={props.position}
      scale={SCALE}
      onClick={handleClick}
    >
      <sphereBufferGeometry
        attach="geometry"
        args={SPHERE_ARGS}
      />
      <meshStandardMaterial
        attach="material"
        color={props.step.isOn ? Colors.on : Colors.off}
      />
    </mesh>
  )
};

export default Step;
