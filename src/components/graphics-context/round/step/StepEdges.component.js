import React from 'react';

const StepEdgesComponent = (props) => (
    <lineSegments>
      <edgesGeometry 
        attach="geometry"
        args={[props.geometry]}
      />
      <lineBasicMaterial 
        color={props.color}
        attach="material"
      />
    </lineSegments>
)

export default StepEdgesComponent;