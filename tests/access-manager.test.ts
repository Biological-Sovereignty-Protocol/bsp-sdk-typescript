import { AccessManager, IssueConsentOptions, RevokeConsentResult } from '../src/access/AccessManager'
import { BSPConfig, ConsentToken } from '../src/types'

// ── Fake HTTP client ──────────────────────────────────────────────────────────

class FakeHttp {
    calls: Array<{ method: string; path: string; body?: unknown; params?: unknown }> = []
    private responses = new Map<string, unknown>()
    private errors = new Map<string, { status: number; message: string }>()

    seed(method: string, path: string, response: unknown) {
        this.responses.set(`${method.toUpperCase()}:${path}`, response)
    }

    seedError(method: string, path: string, status: number, message: string) {
        this.errors.set(`${method.toUpperCase()}:${path}`, { status, message })
    }

    private dispatch(method: string, path: string, body?: unknown) {
        this.calls.push({ method, path, body })
        const key = `${method.toUpperCase()}:${path}`
        if (this.errors.has(key)) {
            const err = this.errors.get(key)!
            const e: any = new Error(err.message)
            e.statusCode = err.status
            throw e
        }
        return this.responses.get(key) ?? {}
    }

    get<T>(path: string): Promise<T> {
        return Promise.resolve(this.dispatch('GET', path) as T)
    }

    post<T>(path: string, body: unknown): Promise<T> {
        return Promise.resolve(this.dispatch('POST', path, body) as T)
    }

    delete<T>(path: string, body?: unknown): Promise<T> {
        return Promise.resolve(this.dispatch('DELETE', path, body) as T)
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_CONFIG: BSPConfig = {
    ieo_domain:  'fleury.bsp',
    private_key: 'a'.repeat(64),
    environment: 'local',
    registry_url: 'http://localhost:3000',
}

function makeManager(): [AccessManager, FakeHttp] {
    const http = new FakeHttp()
    const mgr = new AccessManager(BASE_CONFIG, http as any)
    return [mgr, http]
}

function tokenPayload(token_id = 'tok_abc'): ConsentToken {
    return {
        token_id,
        beo_id:        '550e8400-e29b-41d4-a716-446655440000',
        beo_domain:    'patient.bsp',
        ieo_id:        '770e8400-e29b-41d4-a716-446655440001',
        ieo_domain:    'fleury.bsp',
        granted_at:    '2026-04-19T12:00:00.000Z',
        expires_at:    null,
        revoked:       false,
        revoked_at:    null,
        revocable:     true,
        owner_signature: 'sig',
        token_hash:    'hash',
        version:       '2.0',
        aptos_tx:      '0xdeadbeef',
        scope: {
            intents:    ['READ_RECORDS'],
            categories: ['BSP-HM'],
            period:     null,
            max_records: null,
        },
    } as unknown as ConsentToken
}

// ── issueConsent (grantConsent) ───────────────────────────────────────────────

describe('AccessManager.issueConsent (grantConsent)', () => {
    test('happy path — returns token with txHash', async () => {
        const [mgr, http] = makeManager()
        http.seed('POST', '/api/relayer/consent', {
            token:         tokenPayload('tok_new'),
            transactionId: '0xabc123',
        })

        const token = await mgr.issueConsent({
            beo_id:       '550e8400-e29b-41d4-a716-446655440000',
            ieo_domain:   'dr-carlos.bsp',
            scope: {
                intents:    ['READ_RECORDS'],
                categories: ['BSP-HM'],
            },
            expires_in_days: 90,
        })

        expect(token.token_id).toBe('tok_new')
        expect(token.aptos_tx).toBe('0xdeadbeef')

        const call = http.calls[0]
        expect(call.method).toBe('POST')
        expect(call.path).toBe('/api/relayer/consent')
        const body = call.body as any
        expect(body.beoId).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(body.ieoId).toBe('dr-carlos.bsp')
        expect(body.expiresInDays).toBe(90)
        expect(body.scope.intents).toEqual(['READ_RECORDS'])
    })

    test('permanent token — expiresInDays null when omitted', async () => {
        const [mgr, http] = makeManager()
        http.seed('POST', '/api/relayer/consent', {
            token:         tokenPayload('tok_perm'),
            transactionId: '0xperm',
        })

        await mgr.issueConsent({
            beo_id:     '550e8400-e29b-41d4-a716-446655440000',
            ieo_domain: 'lab.bsp',
            scope: { intents: ['SUBMIT_RECORD'], categories: ['BSP-LA'] },
        })

        const body = http.calls[0].body as any
        expect(body.expiresInDays).toBeNull()
    })
})

// ── revokeConsent (revokeToken) ───────────────────────────────────────────────

describe('AccessManager.revokeConsent (revokeToken)', () => {
    test('happy path — returns token_id, revoked_at, aptos_tx', async () => {
        const [mgr, http] = makeManager()
        http.seed('DELETE', '/api/consent/tok_abc', {
            token_id:       'tok_abc',
            revoked_at:     '2026-04-20T10:00:00.000Z',
            transactionId:  '0xrevoke',
        })

        const result: RevokeConsentResult = await mgr.revokeConsent(
            '550e8400-e29b-41d4-a716-446655440000',
            'tok_abc',
        )

        expect(result.token_id).toBe('tok_abc')
        expect(result.revoked_at).toBe('2026-04-20T10:00:00.000Z')
        expect(result.aptos_tx).toBe('0xrevoke')
    })

    test('request body carries beoId and signed payload', async () => {
        const [mgr, http] = makeManager()
        http.seed('DELETE', '/api/consent/tok_xyz', {
            token_id: 'tok_xyz', revoked_at: '2026-04-20T11:00:00Z', transactionId: '0xtx',
        })

        await mgr.revokeConsent('beo-uuid-123', 'tok_xyz')

        const body = http.calls[0].body as any
        expect(body.beoId).toBe('beo-uuid-123')
        expect(body.signature).toBeTruthy()
        expect(body.nonce).toBeTruthy()
        expect(body.timestamp).toBeTruthy()
    })

    test('expired / already-revoked token — API error propagates', async () => {
        const [mgr, http] = makeManager()
        http.seedError('DELETE', '/api/consent/tok_expired', 409, 'TOKEN_ALREADY_REVOKED')

        await expect(
            mgr.revokeConsent('beo-uuid-999', 'tok_expired'),
        ).rejects.toMatchObject({ statusCode: 409 })
    })
})

// ── verifyConsent ─────────────────────────────────────────────────────────────

describe('AccessManager.verifyConsent', () => {
    test('valid token returns { valid: true }', async () => {
        const [mgr, http] = makeManager()
        http.seed('GET', '/api/consent/tok_abc', {
            valid:  true,
            reason: null,
            token:  tokenPayload('tok_abc'),
        })

        const result = await mgr.verifyConsent({
            beo_domain: 'patient.bsp',
            token_id:   'tok_abc',
            intent:     'READ_RECORDS' as any,
        })

        expect(result.valid).toBe(true)
        expect(result.token?.token_id).toBe('tok_abc')
    })

    test('404 returns { valid: false, reason: TOKEN_NOT_FOUND }', async () => {
        const [mgr, http] = makeManager()
        http.seedError('GET', '/api/consent/tok_missing', 404, 'Not found')

        const result = await mgr.verifyConsent({
            beo_domain: 'patient.bsp',
            token_id:   'tok_missing',
            intent:     'READ_RECORDS' as any,
        })

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('TOKEN_NOT_FOUND')
    })

    test('expired token mock — verify returns invalid with reason', async () => {
        const [mgr, http] = makeManager()
        http.seed('GET', '/api/consent/tok_expired', {
            valid:  false,
            reason: 'TOKEN_EXPIRED',
            token:  null,
        })

        const result = await mgr.verifyConsent({
            beo_domain: 'patient.bsp',
            token_id:   'tok_expired',
            intent:     'READ_RECORDS' as any,
        })

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('TOKEN_EXPIRED')
        expect(result.token).toBeUndefined()
    })
})
