
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
Use the Node version in `.nvmrc` (currently 22). With [nvm](https://github.com/nvm-sh/nvm):
```
nvm install
nvm use
node -v
```

### (Optional) Clean Install Modules
```
yarn install --frozen-lockfile
```
If the Cypress binary download is blocked on your network, set `CYPRESS_INSTALL_BINARY=0` for the install;
yarn 1 does not write `yarn.lock` when a postinstall script fails.

## Local development
- `yarn` - To install packages that may have changed since your last branch
- `yarn start` - Vite dev server with hot reload on [http://localhost:3000](http://localhost:3000)
- `yarn build` - Production build into `build/`
- `yarn preview` - Serve the production build locally on port 3000
- `yarn lint` - ESLint (also runs on commit)
- `yarn test` - Unit and component tests (Vitest + Testing Library); `yarn test:watch` while developing

## Dev workflow
We use [git flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow#:~:text=The%20overall%20flow%20of%20Gitflow,branch%20is%20created%20from%20main&text=When%20a%20feature%20is%20complete%20it%20is%20merged%20into%20the,branch%20is%20created%20from%20main)

### Summary
- Make sure master is always production ready
- Create feature/bug branches for every issue; put issue ID brance name, e.g. "bug/163-fix-step-count" for [Issue #163](https://github.com/irllabs/roundaround/issues/163) 
- Merge `feature` branches into `stage` as soon as it's ready to minimize merge conflicts and lack of transparency in what the code will look like once it's deployed to `prod`.

### Branches

- `master` - always runs, is deployed to `prod` (http://rounds.studio and http:/rounds.irl.studio)
- `stage` - always runs, features are merged to it; is deployed to `stage` (http://roundaround-stage.web.app) when testing integration of features
- `feature/<GitHub-issue-number>-<Feature-Description>` - one for each issue labeled as `enhancement` in github, deployed to `dev` (http://roundaround-dev.web.app) when testing a feature is useful
- `bug//<GitHub-issue-number>-<Bug-Description>` - one for each issue labeled as `bug`, deployed to `dev` (http://roundaround-dev.web.app) when testing a bug is useful

### How is new work added?
- checkout `stage` and create a new feature/bug branch
- If you want feedback deploy that branch out to `roundaround-dev.web.app`. It's fine if its buggy at the point of feedback
- When you are confident the new feature is completed make a PR and do a [full regression test](https://docs.google.com/spreadsheets/d/1fn3mY7sy1YfqoeCXUstYxEqKOidWj6KFN_negDrXKeQ/edit#gid=116044031). 

    Deploy to `roundaround-dev.web.app`. Ask product to test the added functionality. They will _not_ do a regression
- If the tests pass, the PR is approved, and we're happy with the added functionality, merge that branch to stage. 

    Deploy to `https://roundaround-stage.web.app/`
- When we want to merge into master, deploy that (or those) features to the stage server if they aren't already, and _everyone_ does a full regression before we make a PR for stage to master
- If the tests pass we merge to master. 

    Deploy to `roundaround-dev.web.app`

Summary - we never make a branch off master, only stage, and we only ever merge into master after stage is fully regression tested. We try to get feature branches into stage as soon as possible, so we can be confident we're always moving forward building on tested and verified work.


## Testing
- As of now there's a git hook to make sure any code committed is linted and doesn't add malformed js
- As of now there's a smoke test that runs locally to make sure the site still loads when pushing
- The smoke test signs in with a persistent test account. Its credentials are **not** in the repo: put them in
  `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD` (CI reads them from GitHub Actions secrets) or in an untracked
  `cypress.env.json` with `TEST_EMAIL` / `TEST_PASSWORD`.

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
    
## Deploy functions (Jitsi tokens and share links)
- Secrets live in Secret Manager, not in files: run `firebase functions:secrets:set JAAS_PRIVATE_KEY` (paste the
  contents of the JaaS private key) and `firebase functions:secrets:set BITLY_TOKEN` once per project.
- Non-secret settings (JaaS app id and key id, Bitly group, public origin) are parameters; see `functions/.env.example`.
- `cd functions && yarn install && yarn test`
- `firebase deploy --only functions`
