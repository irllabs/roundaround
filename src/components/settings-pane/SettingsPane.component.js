import React from 'react';
import { NOTE_OPTIONS } from '../../models/SequencerUtil';
import styles from './SettingsPane.styles.scss';

const SettingsPane = (props) => {
  console.log('re-render settings pane');
  return (
    <div className={`${styles.settingsPane} ${props.isActive ? styles.settingsPaneActive : ''}`}>
      {
        props.round.getLayers().map(layer => (
          <div
            key={layer.id}
            className={styles.layerRow}
          >
            <span className={styles.layerElement}>{layer.name}</span>
            <span>Steps:</span>
            <input
              type="range"
              min="4"
              max="16"
              onChange={event => {
                const layerLength = parseInt(event.target.value);
                props.setLayerLength(layer.id, layerLength);
              }}
              value={layer.steps.length}
              className={styles.layerElement}
            />
            <span className={styles.layerElement}>{layer.steps.length}</span>
            <span>Note:</span>
            <select
              value={layer.instrument.getNote()}
              onChange={event => layer.instrument.setNote(event.target.value)}
            >
              {
                NOTE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))
              }
            </select>
            <span>Gain:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              onChange={event => {
                const gain = parseFloat(event.target.value);
                layer.instrument.setGainLevel(gain);
              }}
              value={layer.instrument.getGainLevel()}
              className={styles.layerElement}
            />
            <button
              type="button"
              onClick={() => props.deleteLayer(layer.id)}
              className={styles.layerElement}
            >
              Remove
            </button>
          </div>
        ))
      }

      <button
        type="button"
        onClick={props.addLayer}
        className={styles.addLayerButton}
      >
        Add Layer
      </button>
    </div>
  );
};

export default SettingsPane;