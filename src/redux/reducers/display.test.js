import { describe, it, expect, beforeEach } from 'vitest'
import _ from 'lodash'
import display from './display'
import * as types from '../actionTypes'
import { deepFreeze } from '../../test/deep-freeze'

/**
 * One case per action type the display reducer handles. The state handed to the reducer is
 * deep-frozen and compared against a copy of itself afterwards, so a reducer that writes to its
 * input fails here.
 */
describe('the display reducer', () => {
    let state

    beforeEach(() => {
        state = deepFreeze(display(undefined, { type: 'ANY' }))
    })

    it('starts with every dialog closed and nothing selected', () => {
        expect(display(undefined, { type: 'ANY' })).toEqual({
            selectedLayerId: null,
            isShowingSignInDialog: false,
            redirectAfterSignIn: null,
            isUsingJitsi: false,
            isShowingRenameDialog: false,
            isShowingDeleteRoundDialog: false,
            isShowingShareDialog: false,
            disableKeyListener: false,
            selectedRoundId: null,
            isShowingOrientationDialog: false,
            isRecordingSequence: false,
            currentSequencePattern: null
        })
    })

    it('hands back the state it was given for an action it does not handle', () => {
        expect(display(state, { type: 'NOT_A_DISPLAY_ACTION', payload: {} })).toBe(state)
    })

    const cases = [
        {
            name: 'SET_IS_SHOWING_SIGNIN_DIALOG opens the sign-in dialog',
            action: { type: types.SET_IS_SHOWING_SIGNIN_DIALOG, payload: { value: true } },
            assert: (next) => expect(next.isShowingSignInDialog).toBe(true)
        },
        {
            name: 'SET_REDIRECT_AFTER_SIGN_IN remembers where to go after signing in',
            action: { type: types.SET_REDIRECT_AFTER_SIGN_IN, payload: { value: '/play/round-1' } },
            assert: (next) => expect(next.redirectAfterSignIn).toBe('/play/round-1')
        },
        {
            name: 'SET_SELECTED_LAYER_ID selects a layer',
            action: { type: types.SET_SELECTED_LAYER_ID, payload: { layerId: 'layer-1' } },
            assert: (next) => expect(next.selectedLayerId).toBe('layer-1')
        },
        {
            name: 'SET_IS_SHOWING_LAYER_SETTINGS opens the layer settings',
            action: { type: types.SET_IS_SHOWING_LAYER_SETTINGS, payload: { value: true } },
            assert: (next) => expect(next.isShowingLayerSettings).toBe(true)
        },
        {
            name: 'SET_IS_USING_JITSI turns the video call on',
            action: { type: types.SET_IS_USING_JITSI, payload: { value: true } },
            assert: (next) => expect(next.isUsingJitsi).toBe(true)
        },
        {
            name: 'SET_IS_SHOWING_RENAME_DIALOG opens the rename dialog',
            action: { type: types.SET_IS_SHOWING_RENAME_DIALOG, payload: { value: true } },
            assert: (next) => expect(next.isShowingRenameDialog).toBe(true)
        },
        {
            name: 'SET_IS_SHOWING_DELETE_ROUND_DIALOG opens the delete dialog',
            action: { type: types.SET_IS_SHOWING_DELETE_ROUND_DIALOG, payload: { value: true } },
            assert: (next) => expect(next.isShowingDeleteRoundDialog).toBe(true)
        },
        {
            name: 'SET_IS_SHOWING_SHARE_DIALOG opens the share dialog',
            action: { type: types.SET_IS_SHOWING_SHARE_DIALOG, payload: { value: true } },
            assert: (next) => expect(next.isShowingShareDialog).toBe(true)
        },
        {
            name: 'SET_DISABLE_KEY_LISTENER stops the keyboard shortcuts while typing',
            action: { type: types.SET_DISABLE_KEY_LISTENER, payload: { value: true } },
            assert: (next) => expect(next.disableKeyListener).toBe(true)
        },
        {
            name: 'SET_SELECTED_ROUND_ID selects a round in the list',
            action: { type: types.SET_SELECTED_ROUND_ID, payload: { value: 'round-1' } },
            assert: (next) => expect(next.selectedRoundId).toBe('round-1')
        },
        {
            name: 'SET_IS_SHOWING_ORIENTATION_DIALOG asks the player to turn the phone',
            action: { type: types.SET_IS_SHOWING_ORIENTATION_DIALOG, payload: { value: true } },
            assert: (next) => expect(next.isShowingOrientationDialog).toBe(true)
        },
        {
            name: 'SET_IS_RECORDING_SEQUENCE starts recording a sequence',
            action: { type: types.SET_IS_RECORDING_SEQUENCE, payload: { value: true } },
            assert: (next) => expect(next.isRecordingSequence).toBe(true)
        },
        {
            name: 'SET_CURRENT_SEQUENCE_PATTERN highlights the pattern the sequence is on',
            action: { type: types.SET_CURRENT_SEQUENCE_PATTERN, payload: { value: 3 } },
            assert: (next) => expect(next.currentSequencePattern).toBe(3)
        }
    ]

    it.each(cases)('$name', ({ action, assert }) => {
        const before = _.cloneDeep(state)
        const next = display(state, action)
        assert(next)
        expect(state).toEqual(before)
    })

    it('leaves the rest of the display state alone', () => {
        const next = display(state, { type: types.SET_IS_SHOWING_SHARE_DIALOG, payload: { value: true } })
        expect(_.omit(next, 'isShowingShareDialog')).toEqual(_.omit(state, 'isShowingShareDialog'))
    })

    it('covers every action type the display reducer handles', () => {
        const handled = [
            types.SET_IS_SHOWING_SIGNIN_DIALOG, types.SET_REDIRECT_AFTER_SIGN_IN,
            types.SET_SELECTED_LAYER_ID, types.SET_IS_SHOWING_LAYER_SETTINGS, types.SET_IS_USING_JITSI,
            types.SET_IS_SHOWING_RENAME_DIALOG, types.SET_IS_SHOWING_DELETE_ROUND_DIALOG,
            types.SET_IS_SHOWING_SHARE_DIALOG, types.SET_DISABLE_KEY_LISTENER, types.SET_SELECTED_ROUND_ID,
            types.SET_IS_SHOWING_ORIENTATION_DIALOG, types.SET_IS_RECORDING_SEQUENCE,
            types.SET_CURRENT_SEQUENCE_PATTERN
        ]
        const covered = new Set(cases.map(({ action }) => action.type))
        expect([...covered].sort()).toEqual([...handled].sort())
    })
})
