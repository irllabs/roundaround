import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";
import PlayRoute from './components/play/PlayRoute';
import LandingPageRoute from './components/landing-page/LandingPageRoute';
import RoundsListRoute from './components/rounds-list-route/RoundsListRoute'
import Header from './components/header/Header';
import SignInDialog from './components/dialogs/SignInDialog'
import RenameDialog from './components/dialogs/RenameDialog';
import DeleteRoundDialog from './components/dialogs/DeleteRoundDialog';
import ErrorBoundary from './components/ErrorBoundary';



// No `connect`. App reads nothing out of the store and dispatches nothing -- every child that
// needs the store is connected itself -- and a connected App only bought a subscription that
// re-rendered the whole Router subtree whenever the sign-in state changed.
//
// The Material UI theme that used to live here is gone, but its four facts did not go with it:
// the palette is src/index.css's `:root`, the breakpoints are its `@theme`, `shape.borderRadius:
// 32` is `MUI_BUTTON`'s `rounded-full` and each dialog's own radius, and
// `typography.button.textTransform: 'none'` is the absence of any `uppercase` utility.
// CssBaseline's body type moved into src/index.css too; see the `body` rule there.
//
// The three dialogs sit outside the Routes on purpose: each is bound to a flag in
// `state.display`, and every route can raise it. This is the app's only SignInDialog.
function App() {
  return (
    <div className="App" data-test="app">
      <Router>
        <ErrorBoundary>
          <Header />
          {/* React Router 6+: routes are elements, /play/* keeps matching every round under it the
              way the non-exact /play did, and the landing page is the catch-all the non-exact / was. */}
          <Routes>
            <Route path="/rounds" element={<RoundsListRoute />} />
            <Route path="/play/*" element={<PlayRoute />} />
            <Route path="*" element={<LandingPageRoute />} />
          </Routes>
          <SignInDialog />
          <RenameDialog />
          <DeleteRoundDialog />
        </ErrorBoundary>
      </Router>
    </div>
  );
}

export default App;
