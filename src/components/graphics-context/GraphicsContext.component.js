import React, { useRef, useCallback } from 'react';
import { extend, Canvas, useFrame, useThree } from 'react-three-fiber';
import { OrthographicCamera, Html } from 'drei';
import { OrbitControls } from '../../utils/OrbitControls';

import { connect, ReactReduxContext, Provider } from "react-redux";

import Round from './round/Round.component';
import Contributors from './contributors/Contributors.component';
import EditorLine from './editor-line/EditorLine.component'
import { FirebaseContext } from '../../firebase/index';

import styles from './GraphicsContext.styles.scss';

extend({ OrbitControls });

const CameraControls = (props) => {
  const {
    camera,
    gl: { domElement },
  } = useThree();
  const controls = useRef();
  useFrame(() => controls.current.update());
  return (
    <orbitControls
      ref={controls}
      args={[camera, domElement]}
      enablePan={false}
      enableRotate={props.cameraMode === 'perspective'}
    />);
}

class GraphicsContextComponent extends React.Component {
  constructor (props) {
    super(props);
    this.cameraRef = React.createRef();
    this.raycasterFilter = this.raycasterFilter.bind(this);
  }

  raycasterFilter = (intersects, state) => {
    return this.props.raycasterActive ? intersects.slice(0, 1) : [];
  };

  // repassing redux and firebase contexts since react-three-fiber is mounted in another component three.
  render () {
    return (
      <ReactReduxContext.Consumer>
        {
          ({ store }) => (
            <FirebaseContext.Consumer>
              {
                (firebase) => (
                  <Canvas
                    className={styles.canvas}
                    raycaster={{ filter: this.raycasterFilter }}
                  >
                    <Provider store={store}>
                      <FirebaseContext.Provider value={firebase}>
                        <CameraControls cameraMode={this.props.camera} />
                        {
                          this.props.camera === 'orthographic' &&
                          <OrthographicCamera
                            makeDefault={true}
                            ref={this.cameraRef}
                            position={[0, 0, 1]}
                            zoom={130}
                          />
                        }
                        <ambientLight />
                        <pointLight position={[10, 10, 10]} />
                        <Round />
                        {
                          this.props.collaboration &&
                          <Contributors />
                        }
                        <EditorLine />
                      </FirebaseContext.Provider>
                    </Provider>
                  </Canvas>
                )
              }
            </FirebaseContext.Consumer>
          )
        }
      </ReactReduxContext.Consumer>
    )
  }
};
const mapStateToProps = state => {
  return {
    raycasterActive: state.raycaster.active,
    camera: state.camera,
    collaboration: state.collaboration
  };
};

export default connect(
  mapStateToProps,
  null
)(GraphicsContextComponent);
