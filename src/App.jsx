import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import { connect } from "react-redux";
import PlayRoute from './components/play/PlayRoute';
import LandingPageRoute from './components/landing-page/LandingPageRoute';
import RoundsListRoute from './components/rounds-list-route/RoundsListRoute'
import Header from './components/header/Header';
import SignInDialog from './components/dialogs/SignInDialog'
import { setUser, setRounds, setIsShowingSignInDialog } from './redux/actions'
import RenameDialog from './components/dialogs/RenameDialog';
import DeleteRoundDialog from './components/dialogs/DeleteRoundDialog';
import ErrorBoundary from './components/ErrorBoundary';



// The Material UI theme that used to live here is gone, but its four facts did not go with it:
// the palette is src/index.css's `:root`, the breakpoints are its `@theme`, `shape.borderRadius:
// 32` is `MUI_BUTTON`'s `rounded-full` and each dialog's own radius, and
// `typography.button.textTransform: 'none'` is the absence of any `uppercase` utility.
// CssBaseline's body type moved into src/index.css too; see the `body` rule there.
function App({ setUser, setRounds, setIsShowingSignInDialog }) {
  return (
    <div className="App" data-test="app">
      <Router>
        <ErrorBoundary>
          <Header />
          <Switch>
            <Route path="/rounds" component={RoundsListRoute} />
            <Route path="/play" component={PlayRoute} />
            <Route path="/" component={LandingPageRoute} />
          </Switch>
          <SignInDialog />
          <RenameDialog />
          <DeleteRoundDialog />
        </ErrorBoundary>
      </Router>
    </div>
  );
}

const mapStateToProps = state => {
  return {
    user: state.user,
    isShowingSignInDialog: state.display.isShowingSignInDialog
  };
};

export default connect(
  mapStateToProps,
  {
    setUser,
    setRounds,
    setIsShowingSignInDialog
  }
)(App);
