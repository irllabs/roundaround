import { describe, it, expect, beforeEach } from 'vitest'
import _ from 'lodash'
import rounds from './rounds'
import * as types from '../actionTypes'
import { deepFreeze } from '../../test/deep-freeze'

const list = () => ([
    { id: 'round-1', name: 'First round', createdBy: 'user-1', createdAt: 1600000000000 },
    { id: 'round-2', name: 'Second round', createdBy: 'user-1', createdAt: 1600000001000 }
])

/**
 * The rounds reducer holds the signed-in user's list of rounds. The state handed to it is
 * deep-frozen and compared against a copy of itself afterwards, so a reducer that writes to its
 * input fails here.
 */
describe('the rounds reducer', () => {
    let state

    beforeEach(() => {
        state = deepFreeze(list())
    })

    it('starts with an empty list', () => {
        expect(rounds(undefined, { type: 'ANY' })).toEqual([])
    })

    it('hands back the state it was given for an action it does not handle', () => {
        expect(rounds(state, { type: 'NOT_A_ROUNDS_ACTION', payload: {} })).toBe(state)
    })

    it('SET_ROUNDS replaces the list', () => {
        const before = _.cloneDeep(state)
        const next = rounds(state, { type: types.SET_ROUNDS, payload: { value: [list()[1]] } })
        expect(next).toEqual([list()[1]])
        expect(state).toEqual(before)
    })

    it('SET_ROUNDS empties the list when the last round is deleted', () => {
        expect(rounds(state, { type: types.SET_ROUNDS, payload: { value: [] } })).toEqual([])
    })
})
