import { UUID, ISO8601, BSPConfig, RecoveryConfig } from '../types'
import { CryptoUtils } from '../utils/CryptoUtils'
import { HttpClient } from '../utils/HttpClient'

/**
 * IEOClient — Manage Institutional Entity Objects after creation.
 *
 * @example
 * ```typescript
 * const client = new IEOClient(config)
 * await client.lock(ieoId)           // emergency freeze
 * await client.unlock(ieoId)         // unfreeze
 * await client.rotateKey(ieoId, newSeed)
 * await client.updateContacts(ieoId, { apiEndpoint: 'https://...' })
 * await client.destroy(ieoId)        // cryptographic erasure
 * ```
 */
export class IEOClient {
    private http: HttpClient

    constructor(private config: BSPConfig) {
        const baseUrl = config.registry_url ?? HttpClient.defaultBaseUrl(config.environment)
        this.http = new HttpClient(baseUrl, config.timeout_ms)
    }

    async get(ieoId: UUID): Promise<any> {
        const result = await this.http.get<{ ieo: any }>(`/api/ieos/${ieoId}`)
        return result.ieo
    }

    async resolve(domain: string): Promise<any> {
        const encoded = encodeURIComponent(domain)
        const result = await this.http.get<{ ieo: any }>(`/api/ieos/domain/${encoded}`)
        return result.ieo
    }

    async list(filters?: { status?: string; ieoType?: string; certLevel?: string }): Promise<{ ieos: any[]; count: number }> {
        const params = new URLSearchParams()
        if (filters?.status) params.set('status', filters.status)
        if (filters?.ieoType) params.set('ieoType', filters.ieoType)
        if (filters?.certLevel) params.set('certLevel', filters.certLevel)
        const qs = params.toString()
        return this.http.get<{ ieos: any[]; count: number }>(`/api/ieos${qs ? '?' + qs : ''}`)
    }

    async verifyCertification(ieoId: UUID): Promise<{ certified: boolean; level?: string; reason?: string }> {
        return this.http.get(`/api/ieos/${ieoId}/certification`)
    }

    async lock(ieoId: UUID): Promise<{ locked_at: ISO8601; aptos_tx: string }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = { function: 'lockIEO', ieoId, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ locked_at: ISO8601; transactionId: string }>('/api/ieo/lock', {
            ieoId, signature, nonce, timestamp,
        })

        return { locked_at: result.locked_at, aptos_tx: result.transactionId }
    }

    async unlock(ieoId: UUID): Promise<{ unlocked_at: ISO8601; aptos_tx: string }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = { function: 'unlockIEO', ieoId, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ unlocked_at: ISO8601; transactionId: string }>('/api/ieo/unlock', {
            ieoId, signature, nonce, timestamp,
        })

        return { unlocked_at: result.unlocked_at, aptos_tx: result.transactionId }
    }

    async rotateKey(ieoId: UUID, newSeedHex: string): Promise<{ aptos_tx: string }> {
        const newKeypair = CryptoUtils.keyPairFromSeed(newSeedHex)
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = { function: 'rotateKey', ieoId, newPublicKey: newKeypair.publicKey, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ transactionId: string }>('/api/ieo/rotate-key', {
            ieoId, newPublicKey: newKeypair.publicKey, signature, nonce, timestamp,
        })

        return { aptos_tx: result.transactionId }
    }

    async updateContacts(ieoId: UUID, contacts: { apiEndpoint?: string; webhookUrl?: string }): Promise<{ aptos_tx: string }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = {
            function: 'updateContacts', ieoId,
            apiEndpoint: contacts.apiEndpoint ?? null,
            webhookUrl: contacts.webhookUrl ?? null,
            nonce, timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ transactionId: string }>('/api/ieo/contacts', {
            ieoId, apiEndpoint: contacts.apiEndpoint ?? null, webhookUrl: contacts.webhookUrl ?? null,
            signature, nonce, timestamp,
        })

        return { aptos_tx: result.transactionId }
    }

    async updateRecovery(ieoId: UUID, recovery: any): Promise<{ aptos_tx: string }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = { function: 'updateRecovery', ieoId, recovery: recovery ?? null, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ transactionId: string }>('/api/ieo/recovery', {
            ieoId, recovery: recovery ?? null, signature, nonce, timestamp,
        })

        return { aptos_tx: result.transactionId }
    }

    async destroy(ieoId: UUID): Promise<{ destroyed_at: ISO8601; aptos_tx: string }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = { function: 'destroyIEO', ieoId, nonce, timestamp }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ destroyed_at: ISO8601; transactionId: string }>('/api/ieo/destroy', {
            ieoId, signature, nonce, timestamp,
        })

        return { destroyed_at: result.destroyed_at, aptos_tx: result.transactionId }
    }
}
