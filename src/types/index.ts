// BSP Core Types — v0.2

export type ISO8601 = string
export type SemVer = string
export type UUID = string
export type ArweaveTx = string

export type BioLevel = 'CORE' | 'STANDARD' | 'EXTENDED' | 'DEVICE'
export type RecordStatus = 'ACTIVE' | 'SUPERSEDED' | 'PENDING'
export type IEOStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'PENDING'
export type CertLevel = 'BASIC' | 'ADVANCED' | 'FULL' | 'RESEARCH'
export type IEOType = 'LABORATORY' | 'HOSPITAL' | 'WEARABLE' | 'PHYSICIAN' | 'INSURER' | 'RESEARCH' | 'PLATFORM'
export type BSPIntent = 'SUBMIT_BIORECORD' | 'READ_RECORDS' | 'REQUEST_CERTIFICATION' | 'ANALYZE_VITALITY' | 'REQUEST_SCORE' | 'SUBMIT_BIP'

export interface RangeObject {
  optimal_low: number
  optimal_high: number
  functional_low: number
  functional_high: number | null
  critical_low: number
  critical_high: number | null
  unit: string
  population: string
}

export interface SourceMeta {
  ieo_id: UUID
  ieo_domain: string
  method: string
  equipment?: string
  operator?: string
}

export interface BioRecord {
  record_id: UUID
  beo_id: UUID
  version: SemVer
  timestamp: ISO8601
  submitted_at: ISO8601
  arweave_tx?: ArweaveTx
  source: SourceMeta
  category: string
  biomarker: string
  level: BioLevel
  value: number | string | Record<string, unknown>
  unit: string
  ref_range: RangeObject
  confidence: number
  status: RecordStatus
  supersedes: UUID | null
  signature?: string
}

export interface ConsentToken {
  token_id: string
  beo_id: UUID
  ieo_id: UUID
  intents: BSPIntent[]
  categories: string[]
  granted_at: ISO8601
  expires_at: ISO8601 | null
  revoked: boolean
  signature: string
  arweave_tx?: ArweaveTx
  isExpired(): boolean
  isValid(): boolean
}

export interface Guardian {
  contact_hash: string
  public_key: string
  accepted: boolean
  added_at: ISO8601
}

export interface SovereigntyMeta {
  guardians: Guardian[]
  recovery_scheme: string
  seed_phrase_hash: string
  consent_log: ConsentToken[]
}

export interface BEO {
  beo_id: UUID
  domain: string
  created_at: ISO8601
  version: SemVer
  public_key: string
  arweave_tx?: ArweaveTx
  sovereignty: SovereigntyMeta
}
