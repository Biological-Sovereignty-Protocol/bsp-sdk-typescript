import { CryptoUtils } from '../src/utils/CryptoUtils'

/**
 * These vectors MUST stay byte-identical to the ones in
 * bsp-sdk-python/tests/test_canonical.py.
 *
 * Both SDKs must produce the exact same canonical string for the same input.
 */
const VECTORS: Array<{ name: string; input: unknown; expected: string }> = [
    { name: 'empty object', input: {}, expected: '{}' },
    { name: 'single key', input: { a: 1 }, expected: '{"a":1}' },
    { name: 'keys get sorted', input: { b: 2, a: 1 }, expected: '{"a":1,"b":2}' },
    {
        name: 'nested keys sorted recursively',
        input: { outer: { z: 1, a: 2 } },
        expected: '{"outer":{"a":2,"z":1}}',
    },
    {
        name: 'arrays preserve order',
        input: { arr: [3, 1, 2] },
        expected: '{"arr":[3,1,2]}',
    },
    {
        name: 'arrays of objects sort each object',
        input: { arr: [{ z: 1, a: 2 }, { m: 0 }] },
        expected: '{"arr":[{"a":2,"z":1},{"m":0}]}',
    },
    {
        name: 'null value',
        input: { v: null },
        expected: '{"v":null}',
    },
    {
        name: 'booleans',
        input: { t: true, f: false },
        expected: '{"f":false,"t":true}',
    },
    {
        name: 'integer and float',
        input: { i: 1, f: 1.5 },
        expected: '{"f":1.5,"i":1}',
    },
    {
        name: 'string with unicode (ensure_ascii=False)',
        input: { s: 'olá' },
        expected: '{"s":"olá"}',
    },
    {
        name: 'biorecord-like payload',
        input: { biomarker: 'BSP-HM-001', value: 13.8, unit: 'g/dL' },
        expected: '{"biomarker":"BSP-HM-001","unit":"g/dL","value":13.8}',
    },
]

describe('CryptoUtils.canonicalStringify — cross-SDK canonical JSON', () => {
    for (const v of VECTORS) {
        test(v.name, () => {
            expect(CryptoUtils.canonicalStringify(v.input)).toBe(v.expected)
        })
    }

    test('no spaces in output (matches Python separators=",",":")', () => {
        const out = CryptoUtils.canonicalStringify({ a: 1, b: [1, 2, { c: 3 }] })
        expect(out).not.toMatch(/:\s|,\s/)
        expect(out).toBe('{"a":1,"b":[1,2,{"c":3}]}')
    })

    test('insertion order does not change output', () => {
        const a = CryptoUtils.canonicalStringify({ z: 1, a: 2, m: 3 })
        const b = CryptoUtils.canonicalStringify({ a: 2, m: 3, z: 1 })
        expect(a).toBe(b)
    })
})

describe('CryptoUtils — sign/verify roundtrip', () => {
    test('signs and verifies same payload with same keypair', () => {
        const kp = CryptoUtils.generateKeyPair()
        const payload = { foo: 1, bar: 'two', nested: { a: [1, 2, 3] } }
        const sig = CryptoUtils.signPayload(payload, kp.privateKey)
        expect(CryptoUtils.verifySignature(payload, sig, kp.publicKey)).toBe(true)
    })

    test('deterministic: same payload + key → same signature', () => {
        const kp = CryptoUtils.generateKeyPair()
        const payload = { biomarker: 'BSP-HM-001', value: 13.8, unit: 'g/dL' }
        const s1 = CryptoUtils.signPayload(payload, kp.privateKey)
        const s2 = CryptoUtils.signPayload(payload, kp.privateKey)
        expect(s1).toBe(s2)
    })

    test('key order insensitive: different input order → same signature', () => {
        const kp = CryptoUtils.generateKeyPair()
        const s1 = CryptoUtils.signPayload({ z: 1, a: 2 }, kp.privateKey)
        const s2 = CryptoUtils.signPayload({ a: 2, z: 1 }, kp.privateKey)
        expect(s1).toBe(s2)
    })
})

/**
 * Cross-SDK fixture — generate a signature from a deterministic seed and
 * write it to tests/fixtures/canonical-sig.json. The Python SDK reads the
 * same fixture file and must verify the signature (see test_canonical.py).
 *
 * The fixture is regenerated in both `npm test` runs AND `pytest` runs —
 * both must converge to byte-identical outputs.
 */
import * as fs from 'fs'
import * as path from 'path'

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'canonical-sig.json')
// 32-byte seed (hex) — shared between Python and TS fixtures
const FIXED_SEED = '0101010101010101010101010101010101010101010101010101010101010101'
const FIXED_PAYLOAD = {
    biomarker: 'BSP-HM-001',
    value: 13.8,
    unit: 'g/dL',
    collected_at: '2026-02-26T08:00:00Z',
    nested: { z: 1, a: [1, 2, 3] },
}

describe('Cross-SDK signature fixture', () => {
    test('generates and verifies canonical-sig.json fixture', () => {
        const kp = CryptoUtils.keyPairFromSeed(FIXED_SEED)
        const signature = CryptoUtils.signPayload(FIXED_PAYLOAD, kp.privateKey)
        const canonical = CryptoUtils.canonicalStringify(FIXED_PAYLOAD)

        const fixture = {
            seed: FIXED_SEED,
            public_key: kp.publicKey,
            payload: FIXED_PAYLOAD,
            canonical,
            signature,
        }

        fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true })
        fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n')

        // Verify roundtrip — TS can verify its own fixture
        expect(
            CryptoUtils.verifySignature(FIXED_PAYLOAD, signature, kp.publicKey),
        ).toBe(true)

        // Canonical must be exactly what we expect (stable across engines)
        expect(canonical).toBe(
            '{"biomarker":"BSP-HM-001","collected_at":"2026-02-26T08:00:00Z","nested":{"a":[1,2,3],"z":1},"unit":"g/dL","value":13.8}',
        )
    })

    test('reads existing fixture (if present) and still verifies', () => {
        // This is the Python-side smoke test in reverse: TS reads the fixture
        // produced by ANY SDK and must verify it.
        if (!fs.existsSync(FIXTURE_PATH)) return
        const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'))
        const ok = CryptoUtils.verifySignature(
            fixture.payload,
            fixture.signature,
            fixture.public_key,
        )
        expect(ok).toBe(true)
    })
})
