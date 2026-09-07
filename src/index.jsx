import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import store from './redux/store'
import { FirebaseContext, Firebase } from './firebase/index';

const firebase = new Firebase();

// Errors that never reach a React error boundary: a listener that throws, a promise nobody caught.
window.addEventListener('error', (event) => {
  firebase.reportError(event.error || new Error(event.message), { fatal: false, context: 'window' });
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  firebase.reportError(reason instanceof Error ? reason : new Error(String(reason)), { fatal: false, context: 'promise' });
});

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <FirebaseContext.Provider value={firebase}>
        <App />
      </FirebaseContext.Provider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
