import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app/App.component';

import { FirebaseContext, Firebase } from './firebase/index';

import { Provider } from 'react-redux';
import store from './redux/store'

ReactDOM.render(
    <Provider store={store}>
        <FirebaseContext.Provider value={new Firebase()}>
            <App />
        </FirebaseContext.Provider>
    </Provider>
, document.getElementById('root'));