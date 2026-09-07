import { describe, it, expect, beforeEach } from 'vitest'
import _ from 'lodash'
import user from './user'
import * as types from '../actionTypes'
import { deepFreeze } from '../../test/deep-freeze'

const signedIn = () => ({ id: 'user-1', displayName: 'Ada', email: 'ada@example.com', color: '#3F51B5', isGuest: false })

/**
 * One case per action type the user reducer handles. The state handed to the reducer is deep-frozen
 * and compared against a copy of itself afterwards, so a reducer that writes to its input fails here.
 */
describe('the user reducer', () => {
    let state

    beforeEach(() => {
        state = deepFreeze(signedIn())
    })

    it('starts with nobody signed in', () => {
        expect(user(undefined, { type: 'ANY' })).toBeNull()
    })

    it('hands back the state it was given for an action it does not handle', () => {
        expect(user(state, { type: 'NOT_A_USER_ACTION', payload: {} })).toBe(state)
    })

    const cases = [
        {
            name: 'SET_USER signs a user in',
            state: () => null,
            action: { type: types.SET_USER, payload: { value: signedIn() } },
            assert: (next) => expect(next).toEqual(signedIn())
        },
        {
            name: 'SET_USER replaces the signed-in user',
            action: { type: types.SET_USER, payload: { value: { id: 'user-2', displayName: 'Grace' } } },
            assert: (next) => expect(next).toEqual({ id: 'user-2', displayName: 'Grace' })
        },
        {
            name: 'SET_USER signs the user out when the value is null',
            action: { type: types.SET_USER, payload: { value: null } },
            assert: (next) => expect(next).toBeNull()
        },
        {
            name: 'SET_USER_DISPLAYNAME renames the user and leaves the rest alone',
            action: { type: types.SET_USER_DISPLAYNAME, payload: { value: 'Grace' } },
            assert: (next) => expect(next).toEqual({ ...signedIn(), displayName: 'Grace' })
        },
        {
            name: 'SET_USER_COLOR recolours the user and leaves the rest alone',
            action: { type: types.SET_USER_COLOR, payload: { value: '#F44336' } },
            assert: (next) => expect(next).toEqual({ ...signedIn(), color: '#F44336' })
        },
        {
            name: 'CLEAR_USER goes back to nobody signed in',
            action: { type: types.CLEAR_USER, payload: {} },
            assert: (next) => expect(next).toBeNull()
        }
    ]

    it.each(cases)('$name', ({ state: given, action, assert }) => {
        const input = given ? given() : state
        const before = _.cloneDeep(input)
        const next = user(input, action)
        assert(next)
        expect(input).toEqual(before)
    })

    it('covers every action type the user reducer handles', () => {
        const handled = [types.SET_USER, types.SET_USER_DISPLAYNAME, types.SET_USER_COLOR, types.CLEAR_USER]
        const covered = new Set(cases.map(({ action }) => action.type))
        expect([...covered].sort()).toEqual([...handled].sort())
    })
})
