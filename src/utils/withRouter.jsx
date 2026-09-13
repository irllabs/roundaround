import React from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

/**
 * React Router 6 dropped withRouter and the history/location/match props that <Route component>
 * used to inject; hooks replaced them, and the class components here cannot call hooks. This
 * gives a class the same three props it had: `location`, `history` (push and replace, going
 * through navigate) and `match.params`, so the call sites stay `this.props.history.push(...)`.
 */
export default function withRouter(Component) {
    function WithRouter(props) {
        const location = useLocation()
        const navigate = useNavigate()
        const params = useParams()
        const history = {
            push: (to, state) => navigate(to, { state }),
            replace: (to, state) => navigate(to, { replace: true, state }),
            goBack: () => navigate(-1),
        }
        return <Component {...props} location={location} history={history} navigate={navigate} match={{ params }} />
    }
    WithRouter.displayName = `withRouter(${Component.displayName || Component.name || 'Component'})`
    return WithRouter
}
