import {
    BEO,
    BeoId,
    BSPConfig,
    RecoveryConfig,
    ISO8601,
    parseId,
    serializeId,
} from '../types'
import { CryptoUtils } from '../utils/CryptoUtils'
import { HttpClient } from '../utils/HttpClient'

export interface CreateBEOOptions {
    domain: string
    recovery?: {
        guardians: Array<{
            name: string
            contact: string
            public_key: string
            role: 'primary' | 'secondary' | 'tertiary'
        }>
        threshold?: number
    }
}

export interface CreateBEOResult {
    beo: BEO
    /** On-chain BEO identifier (u64). Serialise with `serializeId(beo_id)` before JSON. */
    beo_id: BeoId
    domain: string
    aptos_tx: string
    private_key: string
    seed_phrase: string
    warning: string
}

/**
 * BEOClient — Create and manage Biological Entity Objects on Aptos.
 *
 * BEO creation is open to anyone. No permission from the Ambrósio Institute
 * or any authority is required.
 *
 * @example
 * ```typescript
 * const client = new BEOClient(config)
 *
 * // Check if a domain is available
 * const available = await client.isAvailable('andre.bsp')
 *
 * // Create a BEO
 * const result = await client.create({
 *   domain: 'andre.bsp',
 *   recovery: {
 *     guardians: [
 *       { name: 'Maria', contact: 'maria.bsp',   public_key: '...', role: 'primary' },
 *       { name: 'João',  contact: 'joao.bsp',    public_key: '...', role: 'secondary' },
 *       { name: 'Ana',   contact: 'ana.bsp',     public_key: '...', role: 'tertiary' },
 *     ],
 *     threshold: 2,
 *   }
 * })
 * // ⚠️ Store seed_phrase offline — never digitally
 * // ⚠️ Store private_key in .env as BSP_BEO_PRIVATE_KEY
 * ```
 */
export class BEOClient {
    private http: HttpClient

    constructor(private config: BSPConfig) {
        const baseUrl = config.registry_url ?? HttpClient.defaultBaseUrl(config.environment)
        this.http = new HttpClient(baseUrl, config.timeout_ms)
    }

    /**
     * Create a new BEO. Generates an Ed25519 key pair locally in the browser/Node process.
     * Keys are returned ONCE — store them immediately and securely.
     *
     * Flow:
     * 1. Generate Ed25519 keypair locally (never transmitted raw)
     * 2. Sign the creation payload with the new private key
     * 3. Relay to Aptos via the registry API (relayer pays gas)
     */
    async create(options: CreateBEOOptions): Promise<CreateBEOResult> {
        if (!options.domain.endsWith('.bsp')) {
            throw new Error(`BEO domain must end with .bsp — got: "${options.domain}"`)
        }

        // Generate Ed25519 keypair locally — keys never leave this process
        // Note: domain availability is NOT pre-checked here to avoid TOCTOU race conditions.
        // The contract rejects duplicate domains atomically — handle BSPApiError(409) at call site.
        const { publicKey, privateKey, seed } = CryptoUtils.generateKeyPair()
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = {
            function: 'createBEO',
            domain: options.domain,
            publicKey,
            recovery: options.recovery ?? null,
            nonce,
            timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, privateKey)

        const result = await this.http.post<{ transactionId: string; beo_id: string | number }>(
            '/api/relayer/beo',
            {
                domain: options.domain,
                publicKey,
                recovery: options.recovery ?? null,
                signature,
                nonce,
                timestamp,
            },
        )

        const now: ISO8601 = timestamp
        // beo_id = canonical u64 from the Move contract (wire format: decimal string).
        // The API returns it alongside the tx hash so SDKs never have to parse it
        // from an Aptos event.
        const beo_id: BeoId = parseId(result.beo_id)
        const beo: BEO = {
            beo_id,
            domain: options.domain,
            public_key: publicKey,
            created_at: now,
            version: '1.0',
            recovery: options.recovery
                ? {
                    enabled: true,
                    threshold: options.recovery.threshold ?? 2,
                    guardians: options.recovery.guardians.map(g => ({
                        ...g,
                        accepted: false,
                        added_at: now,
                    })),
                }
                : { enabled: false, threshold: 0, guardians: [] },
            status: 'ACTIVE',
            locked_at: null,
            aptos_tx: result.transactionId,
        }

        return {
            beo,
            beo_id,
            domain: options.domain,
            aptos_tx: result.transactionId,
            private_key: privateKey,
            seed_phrase: seed,
            warning: '⚠️ CRITICAL: Store private_key and seed_phrase SECURELY — they are shown ONCE and cannot be recovered.',
        }
    }

    /**
     * Resolve a .bsp domain to its full BEO object (reads Aptos state via registry API).
     */
    async resolve(domain: string): Promise<BEO> {
        const encoded = encodeURIComponent(domain)
        const result = await this.http.get<{ beo: BEO }>(`/api/beos/domain/${encoded}`)
        // Wire format is a decimal string; normalize to bigint.
        return { ...result.beo, beo_id: parseId(result.beo.beo_id as unknown as string) }
    }

    /**
     * Get a BEO by its UUID (reads Aptos state via registry API).
     */
    async get(beoId: BeoId): Promise<BEO> {
        const result = await this.http.get<{ beo: BEO }>(`/api/beos/${serializeId(beoId)}`)
        // Normalize wire format (string → bigint) for the caller.
        return { ...result.beo, beo_id: parseId(result.beo.beo_id as unknown as string) }
    }

    /**
     * Check if a .bsp domain is available for registration.
     * Returns true if the domain is free.
     */
    async isAvailable(domain: string): Promise<boolean> {
        try {
            await this.resolve(domain)
            return false  // resolve succeeded → domain is taken
        } catch (err: any) {
            if (err?.statusCode === 404) return true
            throw err
        }
    }

    /**
     * Lock a BEO temporarily — no reads or writes permitted while locked.
     * Only the BEO holder can lock or unlock.
     *
     * @param beoId The UUID of the BEO to lock (= Aptos tx hash from create()).
     */
    async lock(beoId: BeoId, reason?: string): Promise<{ locked_at: ISO8601; aptos_tx: string }> {
        const wireBeoId = serializeId(beoId)
        const nonce = CryptoUtils.generateNonce()
        const timestamp_secs = Math.floor(Date.now() / 1000)

        const payloadToSign = { function: 'lockBEO', beoId: wireBeoId, nonce, timestamp_secs }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ locked_at: ISO8601; transactionId: string }>('/api/relayer/beo/lock', {
            beoId: wireBeoId,
            signature,
            nonce,
            timestamp_secs,
            reason: reason ?? null,
        })

        return { locked_at: result.locked_at, aptos_tx: result.transactionId }
    }

    /**
     * Unlock a previously locked BEO.
     *
     * @param beoId The UUID of the BEO to unlock.
     */
    async unlock(beoId: BeoId): Promise<{ unlocked_at: ISO8601; aptos_tx: string }> {
        const wireBeoId = serializeId(beoId)
        const nonce = CryptoUtils.generateNonce()
        const timestamp_secs = Math.floor(Date.now() / 1000)

        const payloadToSign = { function: 'unlockBEO', beoId: wireBeoId, nonce, timestamp_secs }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ unlocked_at: ISO8601; transactionId: string }>('/api/relayer/beo/unlock', {
            beoId: wireBeoId,
            signature,
            nonce,
            timestamp_secs,
        })

        return { unlocked_at: result.unlocked_at, aptos_tx: result.transactionId }
    }

    /**
     * Update Social Recovery guardian configuration.
     *
     * @param beoId The UUID of the BEO whose recovery config to update.
     */
    /**
     * Destroy a BEO permanently — LGPD Art. 18 / GDPR Art. 17 (right to erasure).
     * Irreversible: nullifies public key, revokes all ConsentTokens, releases domain.
     */
    async destroy(beoId: BeoId): Promise<{ destroyed_at: ISO8601; aptos_tx: string }> {
        const wireBeoId = serializeId(beoId)
        const nonce = CryptoUtils.generateNonce()
        const timestamp_secs = Math.floor(Date.now() / 1000)

        const payloadToSign = { function: 'destroyBEO', beoId: wireBeoId, nonce, timestamp_secs }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ destroyed_at: ISO8601; transactionId: string }>('/api/relayer/beo/destroy', {
            beoId: wireBeoId,
            signature,
            nonce,
            timestamp_secs,
        })

        return { destroyed_at: result.destroyed_at, aptos_tx: result.transactionId }
    }

    /**
     * Rotate the BEO's Ed25519 key. Requires signature with the current key.
     * After rotation, only the new key can sign operations.
     */
    async rotateKey(beoId: BeoId, newPrivateKey: string): Promise<{ aptos_tx: string }> {
        const wireBeoId = serializeId(beoId)
        const newKeypair = CryptoUtils.keyPairFromSeed(newPrivateKey.slice(0, 64))
        const nonce = CryptoUtils.generateNonce()
        const timestamp_secs = Math.floor(Date.now() / 1000)

        const payloadToSign = {
            function: 'rotateKey',
            beoId: wireBeoId,
            newPublicKey: newKeypair.publicKey,
            nonce,
            timestamp_secs,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ transactionId: string }>('/api/relayer/beo/rotate-key', {
            beoId: wireBeoId,
            newPublicKey: newKeypair.publicKey,
            signature,
            nonce,
            timestamp_secs,
        })

        return { aptos_tx: result.transactionId }
    }

    /**
     * Request Social Recovery — initiates recovery on a new device.
     * Guardians will be notified to confirm.
     */
    async requestRecovery(beoId: BeoId, newPublicKey: string): Promise<{ aptos_tx: string }> {
        const result = await this.http.post<{ transactionId: string }>('/api/relayer/beo/request-recovery', {
            beoId: serializeId(beoId),
            newPublicKey,
        })

        return { aptos_tx: result.transactionId }
    }

    async updateRecovery(beoId: BeoId, config: RecoveryConfig): Promise<{ aptos_tx: string }> {
        if (config.threshold < 1 || config.threshold > config.guardians.length) {
            throw new Error(`threshold must be between 1 and ${config.guardians.length}`)
        }

        const wireBeoId = serializeId(beoId)
        const nonce = CryptoUtils.generateNonce()
        const timestamp_secs = Math.floor(Date.now() / 1000)

        const payloadToSign = {
            function: 'updateRecovery',
            beoId: wireBeoId,
            recovery: config,
            nonce,
            timestamp_secs,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const result = await this.http.post<{ transactionId: string }>('/api/relayer/beo/recovery', {
            beoId: wireBeoId,
            recovery: config,
            signature,
            nonce,
            timestamp_secs,
        })

        return { aptos_tx: result.transactionId }
    }
}
