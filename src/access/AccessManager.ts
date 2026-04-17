import { BSPConfig, ConsentToken, BSPIntent, UUID, ISO8601 } from '../types'
import { CryptoUtils } from '../utils/CryptoUtils'
import { HttpClient } from '../utils/HttpClient'

export interface VerifyConsentOptions {
    beo_domain: string
    token_id: string
    intent: BSPIntent
    category?: string
}

export interface VerifyConsentResult {
    valid: boolean
    reason?: string
    token?: ConsentToken
}

export interface IssueConsentOptions {
    /** UUID of the BEO granting consent (= Aptos tx hash from BEOClient.create()). */
    beo_id: string
    /** Domain of the IEO receiving consent (e.g. 'fleury.bsp'). */
    ieo_domain: string
    scope: {
        intents: BSPIntent[]
        categories: string[]
        period?: { from: ISO8601 | null; to: ISO8601 | null }
        max_records?: number
    }
    /** Number of days until token expires. Omit for a permanent token. */
    expires_in_days?: number
}

export interface RevokeConsentResult {
    token_id: string
    revoked_at: ISO8601
    aptos_tx: string
}

/**
 * AccessManager — Manage ConsentTokens for BSP access.
 *
 * All BSP data access requires explicit consent from the BEO holder,
 * enforced by the AccessControl Move module on Aptos.
 *
 * @example
 * ```typescript
 * // From a LABORATORY's perspective — verify before submitting
 * const check = await client.access.verifyConsent({
 *   beo_domain: 'patient.bsp',
 *   token_id:   'tok_...',
 *   intent:     'SUBMIT_RECORD',
 *   category:   'BSP-HM',
 * })
 * if (!check.valid) throw new Error(check.reason)
 *
 * // From a BEO HOLDER's perspective — issue consent to a physician
 * const token = await client.access.issueConsent({
 *   ieo_domain: 'dr-carlos.bsp',
 *   scope: {
 *     intents:    ['READ_RECORDS'],
 *     categories: ['BSP-LA', 'BSP-CV'],
 *   },
 *   expires_in_days: 90,
 * })
 * ```
 */
export class AccessManager {
    private http: HttpClient

    constructor(private config: BSPConfig) {
        const baseUrl = config.registry_url ?? HttpClient.defaultBaseUrl(config.environment)
        this.http = new HttpClient(baseUrl, config.timeout_ms)
    }

    /**
     * Verify if a ConsentToken is valid for a specific intent.
     * Call this BEFORE attempting any data operation.
     *
     * Checks enforced by the AccessControl contract:
     * - token exists and belongs to this IEO + BEO pair
     * - token not revoked
     * - token not expired
     * - intent is in token scope
     * - category (if specified) is in token scope
     */
    async verifyConsent(options: VerifyConsentOptions): Promise<VerifyConsentResult> {
        const encoded = encodeURIComponent(options.token_id)
        try {
            const result = await this.http.get<{
                valid: boolean
                reason?: string
                token?: ConsentToken
            }>(`/api/consent/${encoded}?intent=${options.intent}${options.category ? `&category=${options.category}` : ''}`)
            return result
        } catch (err: any) {
            if (err?.statusCode === 404) {
                return { valid: false, reason: 'TOKEN_NOT_FOUND' }
            }
            throw err
        }
    }

    /**
     * Issue a ConsentToken to an IEO (BEO holder operation only).
     * The token is signed with the holder's private key and written to Aptos.
     */
    async issueConsent(options: IssueConsentOptions): Promise<ConsentToken> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const scope = {
            intents: options.scope.intents,
            categories: options.scope.categories,
            period: options.scope.period ?? null,
            max_records: options.scope.max_records ?? null,
        }

        // Payload must match exactly what the contract verifies: grantConsent + beoId + ieoId + scope + expiresInDays
        const payloadToSign = {
            function: 'grantConsent',
            beoId:    options.beo_id,
            ieoId:    options.ieo_domain,
            scope,
            expiresInDays: options.expires_in_days ?? null,
            nonce,
            timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ token: ConsentToken; transactionId: string }>('/api/relayer/consent', {
            beoId:        options.beo_id,
            ieoId:        options.ieo_domain,
            scope,
            expiresInDays: options.expires_in_days ?? null,
            signature,
            nonce,
            timestamp,
        })

        return result.token
    }

    /**
     * Revoke a ConsentToken — immediate on-chain effect.
     * All subsequent operations using this token will fail with TOKEN_REVOKED.
     */
    async revokeConsent(beoId: string, tokenId: string): Promise<RevokeConsentResult> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        // Payload must match exactly what AccessControl.revokeToken verifies
        const payloadToSign = { function: 'revokeToken', tokenId, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.delete<{
            token_id: string
            revoked_at: ISO8601
            transactionId: string
        }>(`/api/consent/${encodeURIComponent(tokenId)}`, { beoId, signature, nonce, timestamp })

        return {
            token_id: result.token_id,
            revoked_at: result.revoked_at,
            aptos_tx: result.transactionId,
        }
    }

    /**
     * Revoke ALL active tokens issued to a specific IEO domain.
     * @param beoId The holder's BEO UUID (required by the contract to verify ownership).
     * @param ieo_domain The IEO domain whose tokens to revoke.
     */
    async revokeAllFromIEO(beoId: string, ieo_domain: string): Promise<{ revoked_count: number }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        // Payload must match AccessControl.revokeAllFromIEO: { beoId, ieoId, nonce, timestamp }
        const payloadToSign = { function: 'revokeAllFromIEO', beoId, ieoId: ieo_domain, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.delete<{ revoked_count: number }>(
            `/api/consent/ieo/${encodeURIComponent(ieo_domain)}`,
            { beoId, signature, nonce, timestamp },
        )

        return { revoked_count: result.revoked_count }
    }

    /**
     * Emergency: Revoke ALL active consent tokens from this BEO.
     * Use when the private key may be compromised.
     * @param beoId The holder's BEO UUID.
     */
    async revokeAllTokens(beoId: string): Promise<{ revoked_count: number }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        // Payload must match AccessControl.revokeAllTokens: { beoId, nonce, timestamp }
        const payloadToSign = { function: 'revokeAllTokens', beoId, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.delete<{ revoked_count: number }>('/api/consent/all', {
            beoId,
            signature,
            nonce,
            timestamp,
        })

        return { revoked_count: result.revoked_count }
    }

    /**
     * Get the full token history for a BEO domain (all ISSUED and REVOKED tokens).
     */
    async getTokenHistory(beo_domain: string): Promise<ConsentToken[]> {
        const encoded = encodeURIComponent(beo_domain)
        const result = await this.http.get<{ tokens: ConsentToken[] }>(`/api/consent/history/${encoded}`)
        return result.tokens
    }
}
