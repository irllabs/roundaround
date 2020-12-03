import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './InstrumentSelect.styles.scss';

import * as SamplesCollection from '../../samples/index';

const InstrumentSelect = ({ instrumentObject, onInstrumentSelect, layerIndex }) => {
  const didMountRef = useRef(false);
  
  const [instrument, setInstrument] = useState(instrumentObject.instrument);
  
  const [sampler, setSampler] = useState(instrumentObject.sampler);
  const [sample, setSample] = useState(instrumentObject.sample);
  
  const samplers = useMemo(() => Object.keys(SamplesCollection));
  const samples = useMemo(() => sampler ? Object.keys(SamplesCollection[sampler]) : [], [sampler]);
  
  const instruments = [
    'MembraneSynth', 
    'MetalSynth',
    'MonoSynth',
    // 'Monophonic',
    'NoiseSynth',
    'PluckSynth',
    'PolySynth',
    'Sampler',
    'Synth'
  ]
  
  const onSamplerChange = (newSampler) => {
    const newSamples = Object.keys(SamplesCollection[newSampler]);
    setSample(newSamples[0]);
    setSampler(newSampler);
  }
  
  const onInstrumentChange = (event) => {
    const instrument = event.target.value;
    setInstrument(instrument);
    onSamplerChange(samplers[0])
  }
  
  const onSamplerSelectChange = (event) => {
    const newSampler = event.target.value;
    onSamplerChange(newSampler);
  }
  
  const onSampleSelectChange = (event) => {
    const newSample = event.target.value;
    setSample(newSample);
  }
  
  useEffect(() => {
    if (didMountRef.current) onInstrumentSelect(instrument, sampler, sample);
    else didMountRef.current = true;
  }, [instrument, sampler, sample])
  
  useEffect(() => {
    setInstrument(instrumentObject.instrument);
    setSampler(instrumentObject.sampler);
    setSample(instrumentObject.sample);
  }, [instrumentObject.instrument, instrumentObject.sampler, instrumentObject.sample])
  

  return (
    <div 
    key="select-container"
    className={styles.selectCobntainer}>
      <select
        key="select-instrument"
        value={instrument}
        className={styles.select}
        onChange={onInstrumentChange}
        
      >
        {
          instruments.map(toneIntrument =>  (
            <option
              //somehow non-unique, incestigate
              key={toneIntrument + layerIndex}
              value={toneIntrument}>
                {toneIntrument}
              </option>
            )
          )
        }
      </select>
      {
        instrument === 'Sampler' &&
        <>
          <select
            key="select-sampler"
            value={sampler}
            className={styles.select}
            onChange={onSamplerSelectChange}
          >
          {
            samplers.map(sampler => {
              return (
              <option
                //somehow non-unique, incestigate
                key={sampler + layerIndex}
                value={sampler}>
                  {sampler}
                </option>
              )
            })
          }
          </select>
          <select
            key="select-sample"
            value={sample}
            className={styles.select}
            onChange={onSampleSelectChange}
          >
          {
            samples.map(sample => {
              return (
              <option
                //somehow non-unique, incestigate
                key={sample + layerIndex}
                value={sample}>
                  {sample}
                </option>
              )
            })
          }
          </select>
        </>
      }
    </div>
  );
}

export default InstrumentSelect;
