# Round Around

## Overview

The goal of this project is to create a multi-person collaborative step sequencer (here is an extremely simple one: https://tonejs.github.io/examples/stepSequencer.html) .

Feature of the sequencer are:

- A Radial paradigm (see https://apps.musedlab.org/groovepizza/?museid=naq8XXgSX&)
- Multi-person live collaboration (e.g. google docs + step sequencer)
- Front-end: React based, with computer browser client first, and mobile with ReactNative next
- Back-end: Firebase, leverage real-time database for all collaborative editing features
- Audio engine: [Tone.js](https://tonejs.github.io/#:~:text=js-,Tone.,of%20the%20Web%20Audio%20API.)
- Synthesis: Sample based
- Graphics: [svg.js](https://svgjs.com/docs/3.0/)

Reference:

- Simple radial multi-layer simple sequencer: https://tylerbisson.com/Groove-Pizzeria/
- Another simple implementation: https://github.com/NYUMusEdLab/Accessible-Groove-Pizza

## Musical Concepts

Rounds (aka RoundAround) is a Step Sequencer.

Rounds names a number of musical/technical concepts; understanding these terms is critical to effective communication about the development of rounds:

- `Round`: A collection of "Layers"; a Round is visualized as multiple concentric circles, each with steps that have an active/inactive state, a velocity, a pitch and a probability; note that "pitch" is currently not exposed in Rounds.
- `Project`: The backend/Firebase data concept for how information for a `Round` is stored; a `Project` consists of a "Round" (the `layers` it includes, the `sampler instruments` associated with each `layer` and the rythmic `pattern` assigned to the layer), the `User` that created it
- `Layer`: A layer consists of the sounds (`Sampler Bank`) and composition (`Pattern`) for a single part of a composition (`Round`). `Layers` are visualized as a single circle with steps on it
- `Pattern`: The composition or score associated with a layer; the pattern consists of information describing what `Steps` are on/off, and what pitch/velocity/probability are associated with each step
- `Instrument`: What a layer sounds like. The `Instrument` drop down for a layer selects a `Sampler Instrument` whose notes are triggered by active steps in a `pattern`
- `Sampler Bank`: A collection of `Sampler Instruments`; the default `Bank` includes Hi-Hat, Snare, Bass Drum, Metal and Percussion.
- `Sampler Instrument`: A collection of audio samples associated with notes ("MIDI Pitches") and loudnesses ("MIDI Velocity"). Rounds supports the SoundFont2 sampler instrument format, which provides velocity layers ( multiple samples associated with a single MIDI note and selected based on the incoming note's velocity and pitch ranges (a sample associated with a range of incoming midi-pitches that is then pitch-shifted accordingly based on the deviation from the "root" pitch). The sampler instrument design software PolyPhone is used to create SoundFont2 instruments.
- `Microtiming`: Deviations in timing that are smaller than a `Step`. Rounds implements `micro` (in the range of a few miliseconds) and `macro` (in the range of 0-100% of a step) timing adjustments on a per-layer basis
- `Step`: The lowest-level musical unit within Rounds and dictates whether a sound is triggered or not. A `Step` is visualized as a small circle along the larger `Layer` circle, and can be filled ("active") or not filled ("in-active"). A step's size (the circle radius) indicates the "velocity" of a note, and its fill-opacity indicates the "probability" that the note plays back
- `Step Probability`: An attribute of a `Step` that indicates the likelyhood that the step plays back; the "Probability" component of a step allows Rounds to play constantly varying / non-deterministic musical patternsm; a "long-hold" on a step opens a UI for modifying probability/velocity in an x-y graph.
- `Step Velocity`: An attribute of a `Step` that indicates how loudly a sample plays back; corresponds with the concept of "MIDI Velocity"
- `Step Count` / `Number of Steps`: The number of `Steps` in a `Layer`; corresponds with equal subdivisions of the total duration of a pattern, which is directed by the overall project BPM
- `Step Interaction`: The occurence of a user interaction with a step (i.e. clicking/dragging). In a multi-person session, user-interactions are visualized for all users to that all players know what other players are doing
- `Session`: a collaborative "Session" where multiple users are interacting with a complex "round". A "Session" is created when a user "Shares" a round and another user joins.

## Local Development

- `yarn`
- `yarn start`
- navigate to [http://localhost:3000](http://localhost:3000)

## Deploy frontend

- `yarn build`
- `firebase deploy --only hosting:production`
- `firebase deploy --only hosting:stage`

## Deploy functions (generates Jitsi tokens)

- Make sure you have the jaasauth.pk private key file in the root of the functions folder (not kept in git)
- `firebase deploy --only functions`

## Importing Soundfonts

Soundfonts can be converted to a Javascript readble format using a script located in scrips/soundfonts. Soundfonts need to be in SFZ format, this is a file format that does not contain the actual samples, they reside in a folder called samples. The script will convert all of the SFZs in the specified folder to a single JS file. An example folder of Snares is located in the soundfonts folder. The script takes two parameters, path to input folder and output file name. To convert the example 'Snares' folder run the following in the scripts/soundfonts folder:

- `yarn` (to install dependencies)
- `node index.js snares ./Snares`

- This will output a file called snares.js
- Place this file in 'src/samples/Snares' and rename it 'index.js'
- Copy the samples folder in the Snares folder to 'public/samples/Snares'
- Create an instrument in 'src/audio-engine/instruments/Snares.js' (just copy an existing one and rename accordingly)
- Imported the instrument in to 'src/audio-engine/Instrument.js'

## Importing MIDI

The following are notes on implementing a MIDI import feature. It assumes that the user wishes to import a midi file which is 1 bar long, containing one or more tracks, that each track should be mapped to an individual layer in the round, and that each note in the track should be mapped to a step in the layer.

- Once the user has selected a local MIDI file, it can be converted to a JS object using the following library: https://github.com/Tonejs/Midi
- It would probably be a good idea to quantize each note in the notes array, the quantize value should perhaps be up to the user
- You can then loop through each track in the MIDI JS object and create a layer in the round for each track (see "onAddLayerClick" function in PlayUI.js)
- The number of steps the layer should have can be calculated based on the timings and duration of the notes in the note array. To change the number of steps in a layer dispatch a "SET_LAYER_STEPS" action (see components/play/layer-settings/LayerNumberOfSteps.js)
- You can then loop through each of the steps and toggle them on if a note exists in the note array at the particular step time and dispatch a "TOGGLE_STEP" action
- Note that timing in midi files is in "ticks", with the resolution set in the header of the JSON file as PPQ (Parts Per Quarter note). So for example with a PPQ of 192, for a layer with 4 steps you would be looking for notes with times of 0, 192, 384 & 568.
