import React from 'react';
import {
  HashRouter as Router,
  Route,
  Switch
} from 'react-router-dom';
import MainRoute from '../main-route/MainRoute.component';

import styles from './App.styles.scss';
import '../../styles/baseStyles.scss';

const App = () => (
  <div className={styles.container} >
    <Router>
      <Switch>
        <Route path='/' component={MainRoute}/>
      </Switch>
    </Router>
  </div>
);

export default App;
