import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import { connect } from "react-redux";
import { unstable_createMuiStrictModeTheme, ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import './App.css'
import PlayRoute from './components/play/PlayRoute';
import LandingPageRoute from './components/landing-page/LandingPageRoute';
import RoundsListRoute from './components/rounds-list-route/RoundsListRoute'
import Header from './components/header/Header';
import SignInDialog from './components/dialogs/SignInDialog'
import { setUser, setRounds, setIsShowingSignInDialog } from './redux/actions'
import RenameDialog from './components/dialogs/RenameDialog';
import DeleteRoundDialog from './components/dialogs/DeleteRoundDialog';



function App ({ setUser, setRounds, setIsShowingSignInDialog }) {
  const theme = React.useMemo(
    () =>
      unstable_createMuiStrictModeTheme({
        palette: {
          type: 'dark',
          primary: {
            dark: '#AAAAAA',
            main: '#EAEAEA',
            light: '#FFFFFF'
          },
          secondary: {
            dark: '#333333',
            main: '#474747',
            light: '#C1C1C1'
          },
          text: {
            primary: '#EAEAEA'
          },
          action: {
            active: '#EAEAEA'
          }
        },
        shape: {
          borderRadius: 32
        },
        typography: {
          button: {
            textTransform: 'none'
          }
        }
      }),
    [],
  );



  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Header />
          <Switch>
            <Route path="/rounds" component={RoundsListRoute} />
            <Route path="/play" component={PlayRoute} />
            <Route path="/" component={LandingPageRoute} />
          </Switch>
        </Router>
        <SignInDialog />
        <RenameDialog />
        <DeleteRoundDialog />
      </ThemeProvider>
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