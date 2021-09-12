
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
![Step Sequencers: Traditional (Linear) and Radial Metaphors](/docs/images/RoundAround_StepSequencers.jpeg)

## Data Concepts
![Key Data Concepts for RoundAround](/docs/images/RoundAround_Concepts.jpeg)

# Development

## Please set your node version
Please use node v14.17.6 - the latest stable version of node, [nvm](https://tecadmin.net/install-nvm-macos-with-homebrew/) is an easy way to do this
```shell 
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    nvm install 14.17.6
    nvm use v14.17.6
    node -v // should be 14.17.6
```
`yarn install --frozen-lockfile`, to make sure all modules are installed with that node version (basically a clean install).

## Local development
- Go to your local branch
- `yarn` - To install packages that may have changed since your last branch
- `yarn build` - To do a clean build of js
- `yarn start` - To start the local server
- navigate to [http://localhost:3000](http://localhost:3000)

## Dev workflow
We're basically using [git flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow#:~:text=The%20overall%20flow%20of%20Gitflow,branch%20is%20created%20from%20main&text=When%20a%20feature%20is%20complete%20it%20is%20merged%20into%20the,branch%20is%20created%20from%20main)

The idea is to make sure master is always production ready, and there's as much visibility as possible for new features. We want these features
to get into develop as soon as it's ready to minimize merge conflicts and lack of transparency in what the code will look like once it's deployed to prod.

So how is new work added?
- checkout develop and create a new feature/bug branch
- Get it so it fulfills the requirements, feel free to push that branch out to `roundaround-dev.web.app` whenever needed for feedback 
    (see deploy frontend section below)
- Once you're done push a PR against your branch off of develop and merge it after manually testing
- Push that branch out to `https://roundaround-stage.web.app/`
- Once everyone agrees develop is in a good spot we'll do manual regressions to merge develop into master. 
    _Only_ develop should ever be merged into master


## Testing
- As of now there's a git hook to make sure any code committed is linted and doesn't add malformed js
- As of now there's a smoke test that runs locally to make sure the site still loads when pushing

If the smoke test fails you can debug it with:
`yarn run cypress:open`

make sure the site is running locally.

## Deploy frontend
-  `yarn build`
-  `firebase deploy --only hosting:production`
    Should update `https://roundaround.web.app/`, this should always be master
-  `firebase deploy --only hosting:stage`
    Should update `https://roundaround-stage.web.app/`, this should always be develop and be in a stablish state
-  `firebase deploy --only hosting:dev`
    Should update `https://roundaround-dev.web.app/`, this can be any branch off develop, it's fine if it's buggy
    
## Deploy functions (generates Jitsi tokens)
- Make sure you have the jaasauth.pk private key file in the root of the functions folder (not kept in git)
- `firebase deploy --only functions`