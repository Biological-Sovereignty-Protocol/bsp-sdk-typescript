import { BSPConfig, BioRecord, ConsentToken, ReadFilters, ReadResult, SubmitResult, BSPIntent } from './types'
import { BEOClient } from './beo/BEOClient'
import { IEOBuilder, IEOBuilderOptions } from './ieo/IEOBuilder'
import { IEOClient } from './ieo/IEOClient'
import { BioRecordBuilder } from './biorecord/BioRecordBuilder'
import { TaxonomyResolver } from './biorecord/TaxonomyResolver'
import { AccessManager } from './access/AccessManager'
import { ExchangeClient } from './exchange/ExchangeClient'

/**
 * BSPClient — Main entry point for the BSP SDK.
 *
 * Initializes with IEO credentials and provides access to all
 * BSP operations: reading records, submitting records, managing consent.
 *
 * @example
 * ```typescript
 * import { BSPClient } from '@bsp/sdk'
 *
 * const client = new BSPClient({
 *   ieo_domain:  'fleury.bsp',
 *   private_key: process.env.BSP_IEO_PRIVATE_KEY!,
 *   environment: 'mainnet',
 * })
 *
 * // Verify consent before submission
 * const check = await client.access.verifyConsent({
 *   beo_domain:   'patient.bsp',
 *   token_id:     'tok_...',
 *   intent:       'SUBMIT_RECORD',
 *   category:     'BSP-HM',
 * })
 *
 * if (check.valid) {
 *   const record = new BioRecordBuilder(client)
 *     .setBiomarker('BSP-HM-001')
 *     .setValue(13.8)
 *     .setUnit('g/dL')
 *     .setCollectionTime('2026-02-26T08:00:00Z')
 *     .build()
 *
 *   const result = await client.submitRecords({
 *     targetBeo:    'patient.bsp',
 *     records:      [record],
 *     consentToken: 'tok_...',
 *   })
 *   console.log(result.arweave_txs)
 * }
 * ```
 */
export class BSPClient {
    readonly config: BSPConfig
    readonly beo: BEOClient
    readonly ieo: IEOClient
    readonly access: AccessManager
    private exchange: ExchangeClient

    constructor(config: BSPConfig) {
        this.validateConfig(config)
        this.config = config
        this.beo = new BEOClient(config)
        this.ieo = new IEOClient(config)
        this.access = new AccessManager(config)
        this.exchange = new ExchangeClient(config)
    }

    private validateConfig(config: BSPConfig): void {
        if (!config.ieo_domain?.endsWith('.bsp')) {
            throw new Error(`ieo_domain must end with .bsp — got: "${config.ieo_domain}"`)
        }
        if (!config.private_key) {
            throw new Error('private_key is required')
        }
        // Ed25519 secret key = 64 bytes = 128 hex chars
        if (!/^[0-9a-f]{128}$/i.test(config.private_key)) {
            throw new Error('private_key must be a 128-character hex-encoded Ed25519 secret key (64 bytes)')
        }
        if (!['mainnet', 'testnet', 'local'].includes(config.environment)) {
            throw new Error(`environment must be "mainnet", "testnet", or "local"`)
        }
    }

    /**
     * Submit one or more BioRecords to a target BEO.
     * Requires a valid ConsentToken with SUBMIT_RECORD intent.
     */
    async submitRecords(options: {
        targetBeo: string
        records: BioRecord[]
        consentToken: string
    }): Promise<SubmitResult> {
        return this.exchange.submitRecords(options)
    }

    /**
     * Read BioRecords from an authorized BEO.
     * Requires a valid ConsentToken with READ_RECORDS intent.
     */
    async readRecords(options: {
        targetBeo: string
        consentToken: string
        filters?: ReadFilters
    }): Promise<ReadResult> {
        return this.exchange.readRecords(options)
    }

    /**
     * Verify if a ConsentToken is valid for a specific operation.
     * Call this BEFORE attempting any data operation.
     */
    async verifyConsent(options: {
        beo_domain: string
        token_id: string
        intent: BSPIntent
        category?: string
    }): Promise<{ valid: boolean; reason?: string; token?: ConsentToken }> {
        return this.access.verifyConsent(options)
    }

    // ─── Static Helpers ──────────────────────────────────────────────────────

    /**
     * Create an IEOBuilder for registering a new institution.
     */
    static createIEO(options: IEOBuilderOptions): IEOBuilder {
        return new IEOBuilder(options)
    }

    /**
     * Create a BioRecordBuilder for constructing a BioRecord.
     */
    record(): BioRecordBuilder {
        return new BioRecordBuilder(this.config.ieo_domain)
    }

    /**
     * Access the TaxonomyResolver to validate BSP codes.
     */
    get taxonomy(): TaxonomyResolver {
        return new TaxonomyResolver()
    }
}
