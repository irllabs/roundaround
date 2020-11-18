import React, { useRef } from 'react';
import { extend, Canvas, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Round from '../round/Round.component';
import styles from './GraphicsContext.styles.scss';

extend({ OrbitControls, });

const CameraControls = (props) => {
  const {
    camera,
    gl: { domElement },
  } = useThree();
  const controls = useRef();
  useFrame(() => controls.current.update());
  return <orbitControls ref={controls} args={[camera, domElement]} />;
}

const GraphicsContextComponent = (props) => (
  <div className={props.className}>
    <Canvas className={styles.canvas}>
      <CameraControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Round round={props.round} />
    </Canvas>
  </div>
);

export default GraphicsContextComponent ;
