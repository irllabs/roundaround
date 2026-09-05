import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { MemoryRouter, Route } from 'react-router-dom'
import rootReducer from '../redux/reducers'
import { FirebaseContext } from '../firebase'

export function makeStore() {
    return createStore(rootReducer)
}

/** Shows the current router location so tests can assert on navigation. */
export function LocationProbe() {
    return <Route path="*" render={({ location }) => <div data-testid="location">{location.pathname}</div>} />
}

/**
 * Renders `ui` inside the same providers the app uses: the Redux store, the Firebase context
 * (a plain object of jest mocks in tests) and a memory router.
 */
export function renderWithProviders(ui, { store = makeStore(), firebase = {}, route = '/' } = {}) {
    const Wrapper = ({ children }) => (
        <Provider store={store}>
            <FirebaseContext.Provider value={firebase}>
                <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </FirebaseContext.Provider>
        </Provider>
    )
    return { store, ...render(ui, { wrapper: Wrapper }) }
}
