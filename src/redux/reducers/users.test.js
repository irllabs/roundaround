import { describe, it, expect, beforeEach } from 'vitest'
import _ from 'lodash'
import users from './users'
import * as types from '../actionTypes'
import { deepFreeze } from '../../test/deep-freeze'

const members = () => ([
    { id: 'user-1', displayName: 'Ada', color: '#3F51B5' },
    { id: 'user-2', displayName: 'Grace', color: '#F44336' }
])

/**
 * The users reducer holds everyone in the open round. The state handed to it is deep-frozen and
 * compared against a copy of itself afterwards, so a reducer that writes to its input fails here.
 */
describe('the users reducer', () => {
    let state

    beforeEach(() => {
        state = deepFreeze(members())
    })

    it('starts with nobody in the round', () => {
        expect(users(undefined, { type: 'ANY' })).toEqual([])
    })

    it('hands back the state it was given for an action it does not handle', () => {
        expect(users(state, { type: 'NOT_A_USERS_ACTION', payload: {} })).toBe(state)
    })

    it('SET_USERS replaces everyone in the round', () => {
        const before = _.cloneDeep(state)
        const next = users(state, { type: types.SET_USERS, payload: { value: [{ id: 'user-3', displayName: 'Alan' }] } })
        expect(next).toEqual([{ id: 'user-3', displayName: 'Alan' }])
        expect(state).toEqual(before)
    })

    it('SET_USERS empties the list when everyone leaves', () => {
        expect(users(state, { type: types.SET_USERS, payload: { value: [] } })).toEqual([])
    })
})
