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

# Development

## Set Node Version

Please use node v14.17.6 - the latest stable version of node, [nvm](https://tecadmin.net/install-nvm-macos-with-homebrew/) is an easy way to do this

On OX, install Homebrew if you don't have it:

```
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

Install and select said version of Node:

```
nvm install 14.17.6
nvm use v14.17.6
node -v // should be 14.17.6
```

### (Optional) Clean Install Modules

```
yarn install --frozen-lockfile`
```

## Local development

- Go to your local branch
- `yarn` - To install packages that may have changed since your last branch
- `yarn build` - To do a clean build of js
- `yarn start` - To start the local server
- navigate to [http://localhost:3000](http://localhost:3000)

## Dev workflow

We use [git flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow#:~:text=The%20overall%20flow%20of%20Gitflow,branch%20is%20created%20from%20main&text=When%20a%20feature%20is%20complete%20it%20is%20merged%20into%20the,branch%20is%20created%20from%20main)

### Summary

- Make sure master is always production ready
- Create feature/bug branches for every issue; put issue ID brance name, e.g. "bug/163-fix-step-count" for [Issue #163](https://github.com/irllabs/roundaround/issues/163)
- Merge `feature` branches into `stage` as soon as it's ready to minimize merge conflicts and lack of transparency in what the code will look like once it's deployed to `prod`.

### Branchines

- `master` - always runs, is deployed to `prod` (http://rounds.studio and http:/rounds.irl.studio)
- `stage` - always runs, features are merged to it; is deployed to `stage` (http://roundaround-stage.web.app) when testing integration of features
- `feature/<GitHub-issue-number>-<Feature-Description>` - one for each issue labeled as `enhancement` in github, deployed to `dev` (http://roundaround-dev.web.app) when testing a feature is useful
- `bug//<GitHub-issue-number>-<Bug-Description>` - one for each issue labeled as `bug`, deployed to `dev` (http://roundaround-dev.web.app) when testing a bug is useful

### How is new work added?

- checkout `stage` and create a new feature/bug branch
- Get it so it fulfills the requirements, feel free to push that branch out to `roundaround-dev.web.app` whenever needed for feedback; (see deploy frontend section below)
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

- `yarn build`
- `firebase deploy --only hosting:production`
  Should update `https://roundaround.web.app/`, this should always be master
- `firebase deploy --only hosting:stage`
  Should update `https://roundaround-stage.web.app/`, this should always be develop and be in a stablish state
- `firebase deploy --only hosting:dev`
  Should update `https://roundaround-dev.web.app/`, this can be any branch off develop, it's fine if it's buggy

## Deploy functions (generates Jitsi tokens)

- Make sure you have the jaasauth.pk private key file in the root of the functions folder (not kept in git)
- `firebase deploy --only functions`
