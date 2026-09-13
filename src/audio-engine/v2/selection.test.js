import { describe, it, expect } from 'vitest'
import { selectedEngine } from './selection'

describe('selectedEngine', () => {
    it('is v1 unless asked', () => {
        expect(selectedEngine({ search: '', env: undefined })).toBe('v1')
        expect(selectedEngine({ search: '?foo=bar', env: {} })).toBe('v1')
    })

    it('reads the URL first, then the build variable', () => {
        expect(selectedEngine({ search: '?engine=v2', env: undefined })).toBe('v2')
        expect(selectedEngine({ search: '?x=1&engine=v2', env: undefined })).toBe('v2')
        expect(selectedEngine({ search: '?engine=v1', env: 'v2' })).toBe('v1')
        expect(selectedEngine({ search: '', env: 'v2' })).toBe('v2')
        expect(selectedEngine({ search: '?engine=v3', env: undefined })).toBe('v1')
    })
})
