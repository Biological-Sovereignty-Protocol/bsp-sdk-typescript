import { BSPConfig, BioRecord, ReadFilters, ReadResult, SubmitResult } from '../types'
import { CryptoUtils } from '../utils/CryptoUtils'
import { HttpClient } from '../utils/HttpClient'

export interface SubmitOptions {
    targetBeo: string
    records: BioRecord[]
    consentToken: string
}

export interface ReadOptions {
    targetBeo: string
    consentToken: string
    filters?: ReadFilters
}

export interface ExportOptions {
    targetBeo: string
    consentToken: string
    format: 'JSON' | 'CSV' | 'FHIR_R4'
}

/**
 * ExchangeClient — Submit and read biological data via the BSP Exchange Protocol.
 *
 * All operations require a valid ConsentToken signed by the BEO holder and
 * verified by the AccessControl smart contract.
 *
 * The double authentication model:
 * 1. ConsentToken — proves the BEO holder authorized this IEO
 * 2. IEO signature — proves this IEO actually sent the request
 *
 * @example
 * ```typescript
 * // Submit records (Lab/Hospital/Wearable)
 * const result = await client.submitRecords({
 *   targetBeo:    'patient.bsp',
 *   records:      [bloodTestRecord, hrvRecord],
 *   consentToken: 'tok_...',
 * })
 * console.log(result.arweave_txs) // permanent IDs on Arweave
 *
 * // Read records (Physician/Platform)
 * const data = await client.readRecords({
 *   targetBeo:    'patient.bsp',
 *   consentToken: 'tok_...',
 *   filters: { categories: ['BSP-CV', 'BSP-LA'] },
 * })
 * data.records.forEach(r => console.log(r.biomarker, r.value, r.unit))
 * ```
 */
export class ExchangeClient {
    private http: HttpClient

    constructor(private config: BSPConfig) {
        const baseUrl = config.registry_url ?? HttpClient.defaultBaseUrl(config.environment)
        this.http = new HttpClient(baseUrl, config.timeout_ms)
    }

    /**
     * Submit one or more BioRecords to a target BEO.
     *
     * Consent verification checklist (enforced on-chain):
     * ✓ token exists and belongs to this IEO + BEO pair
     * ✓ token not revoked
     * ✓ token not expired
     * ✓ token scope includes SUBMIT_RECORD intent
     * ✓ token scope includes the record's category
     */
    async submitRecords(options: SubmitOptions): Promise<SubmitResult> {
        if (!options.records || options.records.length === 0) {
            throw new Error('At least one BioRecord is required')
        }
        if (options.records.length > 100) {
            throw new Error('Maximum 100 records per submission batch')
        }

        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = {
            function: 'submitRecords',
            targetBeo: options.targetBeo,
            consentToken: options.consentToken,
            recordCount: options.records.length,
            nonce,
            timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        return this.http.post<SubmitResult>('/api/exchange/records', {
            targetBeo: options.targetBeo,
            records: options.records,
            consentToken: options.consentToken,
            signature,
            nonce,
            timestamp,
        })
    }

    /**
     * Read BioRecords from an authorized BEO.
     * Results are paginated — use filters.offset for pagination.
     *
     * Requires ConsentToken with READ_RECORDS intent.
     */
    async readRecords(options: ReadOptions): Promise<ReadResult> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = {
            function: 'readRecords',
            targetBeo: options.targetBeo,
            consentToken: options.consentToken,
            nonce,
            timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        const params = new URLSearchParams({
            targetBeo: options.targetBeo,
            consentToken: options.consentToken,
            signature,
            nonce,
            timestamp,
        })

        if (options.filters) {
            const f = options.filters
            if (f.categories?.length)  params.set('categories', f.categories.join(','))
            if (f.biomarkers?.length)  params.set('biomarkers', f.biomarkers.join(','))
            if (f.levels?.length)      params.set('levels', f.levels.join(','))
            if (f.status)              params.set('status', f.status)
            if (f.limit !== undefined) params.set('limit', String(f.limit))
            if (f.offset !== undefined) params.set('offset', String(f.offset))
            if (f.period?.from)        params.set('from', f.period.from)
            if (f.period?.to)          params.set('to', f.period.to)
        }

        return this.http.get<ReadResult>(`/api/exchange/records?${params.toString()}`)
    }

    /**
     * EXPORT_DATA — Export all BioRecords from the BEO.
     *
     * This operation CANNOT be blocked by any BSP-compliant system.
     * Any system that blocks EXPORT_DATA violates the BSP specification.
     *
     * Requires ConsentToken with EXPORT_DATA intent.
     */
    async sovereignExport(options: ExportOptions): Promise<{ data: string; format: string; record_count: number }> {
        const nonce = CryptoUtils.generateNonce()
        const timestamp = new Date().toISOString()

        const payloadToSign = {
            function: 'sovereignExport',
            targetBeo: options.targetBeo,
            consentToken: options.consentToken,
            format: options.format,
            nonce,
            timestamp,
        }
        const signature = CryptoUtils.signPayload(payloadToSign, this.config.private_key)

        return this.http.post<{ data: string; format: string; record_count: number }>('/api/exchange/export', {
            targetBeo: options.targetBeo,
            consentToken: options.consentToken,
            format: options.format,
            signature,
            nonce,
            timestamp,
        })
    }
}
