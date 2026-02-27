import { BSPConfig, BioRecord, ReadFilters, ReadResult, SubmitResult, BSPError } from '../types'

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

// BSP error codes — all returned in BSPResponse.error.code
const ERROR_CODES = {
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INTENT_NOT_AUTHORIZED: 'INTENT_NOT_AUTHORIZED',
  CATEGORY_NOT_AUTHORIZED: 'CATEGORY_NOT_AUTHORIZED',
  IEO_SIGNATURE_INVALID: 'IEO_SIGNATURE_INVALID',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  BIOMARKER_CODE_INVALID: 'BIOMARKER_CODE_INVALID',
  UNIT_INVALID: 'UNIT_INVALID',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  ARWEAVE_WRITE_FAILED: 'ARWEAVE_WRITE_FAILED',  // retryable
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',    // retryable
} as const

export type BSPErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

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
  constructor(private config: BSPConfig) { }

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
    // Implementation: verify consent, sign request with IEO private key, submit to Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Read BioRecords from an authorized BEO.
   * Results are paginated — use filters.offset for pagination.
   */
  async readRecords(options: ReadOptions): Promise<ReadResult> {
    // Implementation: verify consent, query Arweave, decrypt records
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * SOVEREIGN_EXPORT — Export all BioRecords from the BEO.
   *
   * This cannot be blocked by any BSP-compliant system.
   * Any system that blocks SOVEREIGN_EXPORT violates the BSP specification.
   */
  async sovereignExport(options: ExportOptions): Promise<{ data: string; format: string; record_count: number }> {
    // Implementation: decrypt all records with holder's private key, format output
    throw new Error('Not implemented — registry connection required')
  }
}
