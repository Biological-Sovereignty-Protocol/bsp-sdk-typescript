/**
 * Tests for the bigint id breaking change (v2 → v3 alignment).
 *
 * Validates:
 *   - `parseId` accepts decimal strings, bigints, and safe-integer numbers.
 *   - `parseId` rejects floats, non-digit strings, and unsafe numbers.
 *   - `serializeId` round-trips to a canonical decimal string.
 *   - Interface types (BEO/IEO/ConsentToken) expose their ids as `bigint`.
 */

import {
    parseId,
    serializeId,
    BeoId,
    IeoId,
    ConsentTokenId,
    BEO,
} from '../src/types'

describe('parseId', () => {
    test('accepts a decimal string', () => {
        expect(parseId('42')).toBe(42n)
    })

    test('accepts a bigint unchanged', () => {
        expect(parseId(1234567890n)).toBe(1234567890n)
    })

    test('accepts a safe-integer number', () => {
        expect(parseId(99)).toBe(99n)
    })

    test('preserves u64 values above Number.MAX_SAFE_INTEGER when passed as string', () => {
        const big = '18446744073709551615' // 2^64 - 1
        expect(parseId(big)).toBe(18446744073709551615n)
    })

    test('rejects non-digit strings', () => {
        expect(() => parseId('not-a-number')).toThrow('decimal digits')
        expect(() => parseId('0x42')).toThrow('decimal digits')
        expect(() => parseId('42.5')).toThrow('decimal digits')
    })

    test('rejects unsafe-integer numbers', () => {
        expect(() => parseId(Number.MAX_SAFE_INTEGER + 1)).toThrow('unsafe')
    })

    test('rejects floats', () => {
        expect(() => parseId(3.14)).toThrow('unsafe')
    })

    test('rejects negative numbers', () => {
        expect(() => parseId(-1)).toThrow('unsafe')
    })
})

describe('serializeId', () => {
    test('produces a decimal string', () => {
        expect(serializeId(42n)).toBe('42')
    })

    test('round-trips through parseId', () => {
        const original = 9876543210n
        expect(parseId(serializeId(original))).toBe(original)
    })

    test('preserves u64 max value', () => {
        const u64Max = 18446744073709551615n
        expect(serializeId(u64Max)).toBe('18446744073709551615')
        expect(parseId(serializeId(u64Max))).toBe(u64Max)
    })
})

describe('interface type wiring', () => {
    test('BEO.beo_id is typed as bigint', () => {
        const beo: BEO = {
            beo_id: 1n,
            domain: 'alice.bsp',
            public_key: 'a'.repeat(64),
            created_at: '2026-04-20T00:00:00.000Z',
            version: '1.0',
            recovery: { enabled: false, threshold: 0, guardians: [] },
            status: 'ACTIVE',
            locked_at: null,
        }
        const asBig: bigint = beo.beo_id
        expect(asBig).toBe(1n)
    })

    test('BeoId / IeoId / ConsentTokenId are all bigint aliases', () => {
        const b: BeoId = 1n
        const i: IeoId = 2n
        const t: ConsentTokenId = 3n
        expect(typeof b).toBe('bigint')
        expect(typeof i).toBe('bigint')
        expect(typeof t).toBe('bigint')
    })
})
