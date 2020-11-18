import React from 'react';
import RoundLayer from './RoundLayer.component';

const Constants = {
  BASE_RADIUS: 1,
  RADIUS_BUFFER: 0.5,
};

const Round = (props) => (
  <>
    {
      props.round.getLayers().map((layer, index) => {
        const radius = Constants.BASE_RADIUS + index * Constants.RADIUS_BUFFER;
        return (
          <RoundLayer
            key={layer.id}
            layer={layer}
            radius={radius}
          />
        );
      })
    }
  </>
);

export default Round;
