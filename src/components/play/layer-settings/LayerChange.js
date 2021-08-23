import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { Box, FormControl, Grid, InputLabel, makeStyles, MenuItem, Select } from '@material-ui/core';
import { SET_SELECTED_LAYER_ID } from '../../../redux/actionTypes';
import _ from 'lodash'
import Instruments from '../../../audio-engine/Instruments';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 188,
        [theme.breakpoints.down('sm')]: {
            minWidth: 100
        },
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

function LayerChange(props) {

    const { selectedLayer,  round } = props;
    const classes = useStyles();
    const [selectedLayerID, setSelectedLayerID] = React.useState(selectedLayer.id)
    const instrumentOptions = Instruments.getInstrumentOptions(false);
    // console.log("instrumentOptions: ", instrumentOptions)

    const getLabelText = (sampler) => {
        let instrumentOption = instrumentOptions.find(item=>item.name === sampler);
        let text = '';
        if(instrumentOption) {
            text =  instrumentOption.label;
        } else {
            text = sampler;
        }

        if (text.length > 5) {
            text = text.substring(0, 5) + '...'
        }

        return text;
    }

    const layers = round ? _.filter(round.layers, { createdBy: props.user.id })  : [];

    const sortLayers = layers.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

    const layerItems = sortLayers.map((layer, index) => <MenuItem value={layer.id} key={layer.id}>{getLabelText(layer.instrument.sampler)}</MenuItem>)

    

    const onChangeLayer = (event) => {
       
        const layerId = event.target.value
        props.dispatch({ type: SET_SELECTED_LAYER_ID, payload: { layerId } })
    }

    // console.log("selected Layer: ", selectedLayer)

    useEffect(() => {
        setSelectedLayerID(props.selectedLayer.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.selectedLayer.id])

    return (
        <Box className={classes.root} style={{ marginBottom: '12px' }}>
            <FormControl className={classes.formControl} style={{ width: '100%' }}>
                <Grid
                    container
                    spacing={2}
                >
                    <Grid item xs={4}>
                        <InputLabel htmlFor="layer-select-label" style={{ marginTop: '20px' }}>Layer</InputLabel>

                    </Grid>
                    <Grid item xs={8}>
                        <Select
                            value={selectedLayerID}
                            onChange={onChangeLayer}
                            labelId="layer-select-label"
                            style={{ width: '92%' }}
                        >
                            {layerItems}
                        </Select>
                    </Grid>

                </Grid>
            </FormControl>
        </Box>
    )
}

const mapStateToProps = state => {
    //  console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        isOpen: state.display.isShowingLayerSettings
    };
};


export default connect(
    mapStateToProps
)(LayerChange)
