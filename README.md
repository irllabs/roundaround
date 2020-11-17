
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
- Graphics: [threejs](https://threejs.org/)

Reference:
- Simple radial multi-layer simple sequencer: https://tylerbisson.com/Groove-Pizzeria/
- Another simple implementation: https://github.com/NYUMusEdLab/Accessible-Groove-Pizza

## Musical Concepts
![Step Sequencers: Traditional (Linear) and Radial Metaphors](/docs/images/RoundAround_StepSequencers.jpeg)

## Data Concepts
![Key Data Concepts for RoundAround](/docs/images/RoundAround_Concepts.jpeg)


## Local Development
- `npm install`  
- `npm start`  
- navigate to [http://localhost:3001](http://localhost:3001)