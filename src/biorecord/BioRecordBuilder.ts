import { BioRecord, BioLevel, RangeObject, RecordStatus, UUID } from '../types'
import { randomUUID } from 'crypto'
import { TaxonomyResolver } from './TaxonomyResolver'

/**
 * BioRecordBuilder — Fluent builder for BSP BioRecords.
 *
 * Validates biomarker codes against the BSP taxonomy and ensures
 * all required fields are present before building.
 *
 * @example
 * ```typescript
 * // From a BSPClient instance
 * const record = client.record()
 *   .setBiomarker('BSP-HM-001')  // Hemoglobin
 *   .setValue(13.8)
 *   .setUnit('g/dL')
 *   .setCollectionTime('2026-02-26T08:00:00Z')
 *   .setRefRange({
 *     optimal:    '13.5-17.5',
 *     functional: '12.0-17.5',
 *     deficiency: '<12.0',
 *     toxicity:   null,
 *     unit:       'g/dL',
 *   })
 *   .build()
 * ```
 */
export class BioRecordBuilder {
  private data: Partial<BioRecord & { ieo_domain: string }> = {
    record_id: randomUUID(),
    version: '1.0.0',
    status: 'ACTIVE',
    supersedes: null,
  }
  private taxonomy = new TaxonomyResolver()

  constructor(private ieo_domain: string) {
    this.data.ieo_domain = ieo_domain
  }

  setBeoId(beoId: UUID): this {
    this.data.beo_id = beoId
    return this
  }

  setBiomarker(code: string): this {
    // Validates the BSP code format — e.g. BSP-HM-001
    if (!this.taxonomy.isValidCode(code)) {
      throw new Error(`Invalid BSP biomarker code: "${code}". Expected format: BSP-XX-NNN`)
    }
    this.data.biomarker = code
    this.data.category = code.split('-').slice(0, 2).join('-')  // e.g. BSP-HM
    this.data.level = this.taxonomy.getLevel(code)
    return this
  }

  setValue(value: number | string | Record<string, unknown>): this {
    this.data.value = value
    return this
  }

  setUnit(unit: string): this {
    this.data.unit = unit
    return this
  }

  setCollectionTime(iso8601: string): this {
    this.data.collected_at = iso8601
    return this
  }

  setRefRange(range: RangeObject): this {
    this.data.ref_range = range
    return this
  }

  setConfidence(confidence: number): this {
    if (confidence < 0 || confidence > 1) {
      throw new Error('confidence must be between 0.0 and 1.0')
    }
    this.data.confidence = confidence
    return this
  }

  setMethod(method: string): this {
    if (!this.data.source) this.data.source = {} as any
    this.data.source!.method = method
    return this
  }

  setEquipment(equipment: string): this {
    if (!this.data.source) this.data.source = {} as any
    this.data.source!.equipment = equipment
    return this
  }

  /**
   * Mark this record as superseding a previous record.
   * The old record is preserved in Arweave history.
   */
  supersedes(recordId: UUID): this {
    this.data.supersedes = recordId
    return this
  }

  /**
   * Validate and build the BioRecord.
   * Throws if any required field is missing or invalid.
   */
  build(): BioRecord {
    const required = ['beo_id', 'biomarker', 'value', 'unit', 'collected_at'] as const
    for (const field of required) {
      if (this.data[field] === undefined || this.data[field] === null || this.data[field] === '') {
        throw new Error(`BioRecord missing required field: "${field}"`)
      }
    }

    // Validate collected_at is a parseable ISO8601 timestamp
    const collectedAtMs = new Date(this.data.collected_at!).getTime()
    if (isNaN(collectedAtMs)) {
      throw new Error(`collected_at must be a valid ISO8601 timestamp — got: "${this.data.collected_at}"`)
    }
    if (collectedAtMs > Date.now() + 60_000) {
      throw new Error('collected_at cannot be in the future')
    }

    // level is derived by setBiomarker(); if biomarker is set but level is not, something went wrong
    if (!this.data.level) {
      throw new Error('level is not set — call setBiomarker() before build()')
    }

    this.data.submitted_at = new Date().toISOString()

    // Provide a minimal ref_range stub if caller omitted it (optional field in spec)
    if (!this.data.ref_range) {
      this.data.ref_range = {
        optimal: '',
        functional: '',
        deficiency: null,
        toxicity: null,
        unit: this.data.unit ?? '',
      }
    }

    // Build source — signature is populated by the exchange layer after submission
    if (!this.data.source) {
      this.data.source = {
        ieo_id: '',
        ieo_domain: this.ieo_domain,
        method: 'unknown',
        signature: '',  // populated by ExchangeClient on submit
      }
    }

    return this.data as BioRecord
  }
}
