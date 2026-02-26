import { BioRecord, ConsentToken } from '../types'

export interface ExchangeClientOptions {
  ieoId: string
}

export interface SubmitResult {
  success: boolean
  record_id: string
  arweave_tx: string
  timestamp: string
}

/**
 * ExchangeClient — Submit and read biological data via the BSP Exchange Protocol.
 *
 * All operations require a valid ConsentToken signed by the BEO holder.
 */
export class ExchangeClient {
  constructor(private options: ExchangeClientOptions) {}

  async submit(record: BioRecord, token: ConsentToken): Promise<SubmitResult> {
    if (!token.isValid()) {
      throw new Error('BSP-E-001: Invalid or missing consent token')
    }
    if (token.isExpired()) {
      throw new Error('BSP-E-002: Token expired')
    }
    if (token.revoked) {
      throw new Error('BSP-E-003: Token revoked')
    }
    if (!token.intents.includes('SUBMIT_BIORECORD')) {
      throw new Error('BSP-E-004: Intent not authorized by token')
    }
    // Implementation: sign record, submit to Arweave
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async readRecords(beoId: string, token: ConsentToken, filters?: {
    categories?: string[]
    biomarkers?: string[]
    from?: string
    to?: string
    limit?: number
    offset?: number
  }): Promise<{ records: BioRecord[], total: number, has_more: boolean }> {
    // Implementation: fetch BioRecords from Arweave with consent verification
    throw new Error('Not implemented — install @bsp/sdk when published')
  }
}
