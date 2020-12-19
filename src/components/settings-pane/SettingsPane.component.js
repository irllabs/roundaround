import React from 'react';
import { connect } from "react-redux";
import {
    updateLayerInstrument,
    setCamera,
    setEditingMode,
    setLayerSteps,
    setEditAllLayers,
    addRoundLayer,
    removeRoundLayer
} from "../../redux/actions";
import { getDefaultLayerData } from '../../utils/dummyData';
import { Limits } from '../../utils/constants';
import { changeLayerLength } from '../../utils';
import LayerControls from '../graphics-context/round/layer/LayerControls.component';

import styles from './SettingsPane.styles.scss';

const SettingsPane = ({
    round,
    user,
    collaboration,
    isActive,
    camera,
    setCamera,
    editingMode,
    setEditingMode,
    editAllLayers,
    setEditAllLayers,
    updateLayerInstrument,
    addRoundLayer,
    setLayerSteps,
    removeRoundLayer
}) => {
    const onCameraSelect = (event) => {
        const camera = event.target.value;
        setCamera(camera)
    }

    const onEditingModeSelect = (event) => {
        const mode = event.target.value;
        setEditingMode(mode)
    }
    const onEditAllLayersSelect = (event) => {
        const value = event.target.checked;
        console.log('onEditAllLayersSelect', value);
        setEditAllLayers(value)
    }

    const addLayer = () => {
        addRoundLayer(getDefaultLayerData(user.id), user.id)
    }

    const deleteLayer = (index) => {
        removeRoundLayer(index, user.id)
    }

    const setLayerLength = (layer, layerIndex, newLength) => {
        const newSteps = changeLayerLength(layer, newLength);
        setLayerSteps(layerIndex, newSteps, user.id)
    }

    return (
        <div className={`${styles.settingsPane} ${isActive ? styles.settingsPaneActive : ''}`}>
            <div className={styles.roundLayers}>
                {
                    round.layers &&
                    round.layers.map((layer, i) => {
                        const collaborationAndContributor = collaboration && collaboration.contributors && collaboration.contributors[layer.creator];
                        if (collaborationAndContributor) {
                            layer = { ...layer, color: collaboration.contributors[layer.creator].color };
                        } else {
                            layer = { ...layer, color: user.color };
                        }
                        return (
                            <div
                                key={layer.id}
                                className={styles.layerRow}
                            >
                                <div className={styles.layerElementSuperLong}>
                                    <LayerControls
                                        layer={layer}
                                        editable={true}
                                        layerIndex={i}
                                        settingsPane={true}
                                    />
                                </div>
                                <span>Steps:</span>
                                <input
                                    type="range"
                                    min={Limits.stepsPerLayer.min}
                                    max={Limits.stepsPerLayer.max}
                                    onChange={event => {
                                        const layerLength = parseInt(event.target.value);
                                        setLayerLength(layer, i, layerLength);
                                    }}
                                    value={layer.steps.length}
                                    className={styles.layerElementLong}
                                />
                                <span className={styles.layerElementShort}>{layer.steps.length}</span>
                                <span>Gain:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    onChange={event => {
                                        const gain = parseFloat(event.target.value);
                                        updateLayerInstrument(i, { gain }, user.id);
                                    }}
                                    value={layer.instrument.gain}
                                    className={styles.layerElementLong}
                                />
                                <button
                                    type="button"
                                    onClick={() => deleteLayer(i)}
                                    className={styles.layerElementLong}
                                >
                                    Remove
                                </button>
                            </div>
                        )
                    }
                    )
                }
            </div>

            <button
                type="button"
                onClick={addLayer}
                className={styles.addLayerButton}
            >
                Add Layer
            </button>

            <div className={styles.layerRow}>

                <div
                    className={styles.cameraSelect}
                >
                    <p>Select camera:</p>
                    <div>
                        <input
                            type="radio"
                            id="perspective"
                            name="camera"
                            value="perspective"
                            checked={camera === 'perspective'}
                            onChange={onCameraSelect}
                        />
                        <label htmlFor="perspective">Perspective</label>
                    </div>
                    <div>
                        <input
                            type="radio"
                            id="orthographic"
                            name="camera"
                            value="orthographic"
                            checked={camera === 'orthographic'}
                            onChange={onCameraSelect}
                        />
                        <label htmlFor="orthographic">Orthographic</label>
                    </div>
                </div>
                <div>
                    <div
                        className={styles.cameraSelect}
                    >
                        <p>Select mode:</p>
                        <div>
                            <input
                                type="radio"
                                id="steps"
                                name="editing-mode"
                                value="steps"
                                checked={editingMode === 'steps'}
                                onChange={onEditingModeSelect}
                            />
                            <label htmlFor="steps">Steps Editing</label>
                        </div>
                        <div>
                            <input
                                type="radio"
                                id="notes"
                                name="editing-mode"
                                value="notes"
                                checked={editingMode === 'notes'}
                                onChange={onEditingModeSelect}
                            />
                            <label htmlFor="notes">Notes Editing</label>
                        </div>

                    </div>
                </div>
                <div>
                    <input
                        type="checkbox"
                        name="edit-all-layers"
                        checked={editAllLayers}
                        onChange={onEditAllLayersSelect}
                        disabled={collaboration.creator !== user.id}
                    />
                    <label htmlFor="edit-all-layers">Edit all layers</label>
                </div>
            </div>
        </div>
    );
};

const mapStateToProps = state => {
    return {
        camera: state.camera,
        round: state.round,
        editingMode: state.editingMode,
        editAllLayers: state.editAllLayers,
        user: state.user,
        collaboration: state.collaboration
    };
};

export default connect(
    mapStateToProps,
    {
        updateLayerInstrument,
        setCamera,
        setEditingMode,
        setEditAllLayers,
        addRoundLayer,
        removeRoundLayer,
        setLayerSteps
    }
)(SettingsPane);