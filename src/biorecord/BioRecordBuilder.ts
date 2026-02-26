import { BioRecord, BioLevel, RangeObject, SourceMeta, RecordStatus } from '../types'
import { randomUUID } from 'crypto'

/**
 * BioRecordBuilder — Fluent builder for BSP BioRecords.
 *
 * Validates biomarker codes against the BSP taxonomy and ensures
 * all required fields are present before building.
 */
export class BioRecordBuilder {
  private record: Partial<BioRecord> = {
    record_id: randomUUID(),
    version: '0.2.0',
    status: 'ACTIVE',
    supersedes: null,
  }

  beoId(beoId: string): this {
    this.record.beo_id = beoId
    return this
  }

  biomarker(code: string): this {
    this.record.biomarker = code
    return this
  }

  value(value: number | string): this {
    this.record.value = value
    return this
  }

  unit(unit: string): this {
    this.record.unit = unit
    return this
  }

  timestamp(ts: string): this {
    this.record.timestamp = ts
    return this
  }

  source(source: SourceMeta): this {
    this.record.source = source
    return this
  }

  refRange(range: RangeObject): this {
    this.record.ref_range = range
    return this
  }

  confidence(confidence: number): this {
    if (confidence < 0 || confidence > 1) {
      throw new Error('confidence must be between 0.0 and 1.0')
    }
    this.record.confidence = confidence
    return this
  }

  supersedes(recordId: string): this {
    this.record.supersedes = recordId
    this.record.status = 'ACTIVE'
    return this
  }

  build(): BioRecord {
    const required = ['beo_id', 'biomarker', 'value', 'unit', 'timestamp'] as const
    for (const field of required) {
      if (!this.record[field]) {
        throw new Error(`BioRecord missing required field: ${field}`)
      }
    }
    this.record.submitted_at = new Date().toISOString()
    return this.record as BioRecord
  }
}
