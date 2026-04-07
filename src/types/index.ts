// BSP Core Types — v1.0
// Full type definitions for the Biological Sovereignty Protocol SDK

export type ISO8601 = string
export type SemVer = string
export type UUID = string
export type ArweaveTx = string

// ─── Enums ───────────────────────────────────────────────────────────────────

export type BEOStatus = 'ACTIVE' | 'LOCKED' | 'DESTROYED' | 'RECOVERY_PENDING'
export type BioLevel = 'CORE' | 'STANDARD' | 'EXTENDED' | 'DEVICE'
export type RecordStatus = 'ACTIVE' | 'SUPERSEDED' | 'PENDING'
export type IEOStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'DESTROYED' | 'LOCKED' | 'PENDING'
export type CertLevel = 'UNCERTIFIED' | 'BASIC' | 'ADVANCED' | 'RESEARCH_PARTNER'
export type IEOType = 'LAB' | 'HOSPITAL' | 'WEARABLE' | 'PHYSICIAN' | 'INSURER' | 'RESEARCH' | 'PLATFORM'

export type BSPIntent =
  | 'SUBMIT_RECORD'
  | 'READ_RECORDS'
  | 'ANALYZE_VITALITY'
  | 'REQUEST_SCORE'
  | 'EXPORT_DATA'
  | 'SYNC_PROTOCOL'

export type ExportFormat = 'JSON' | 'CSV' | 'FHIR_R4'

// ─── BEO ─────────────────────────────────────────────────────────────────────

export interface Guardian {
  name: string
  contact: string
  public_key: string
  role: 'primary' | 'secondary' | 'tertiary'
  accepted: boolean
  added_at: ISO8601
}

export interface RecoveryConfig {
  enabled: boolean
  threshold: number
  guardians: Guardian[]
}

export interface BEO {
  beo_id: UUID
  domain: string
  public_key: string
  created_at: ISO8601
  version: SemVer
  recovery: RecoveryConfig
  status: BEOStatus
  locked_at: ISO8601 | null
  arweave_tx?: ArweaveTx
}

// ─── IEO ─────────────────────────────────────────────────────────────────────

export interface IEOCertification {
  level: CertLevel
  granted_at: ISO8601 | null
  expires_at: ISO8601 | null
  categories: string[]
  intents: BSPIntent[]
}

export interface IEO {
  ieo_id: UUID
  domain: string
  display_name: string
  ieo_type: IEOType
  country: string
  jurisdiction: string
  legal_id: string
  public_key: string
  created_at: ISO8601
  version: SemVer
  certification: IEOCertification
  status: IEOStatus
  arweave_tx?: ArweaveTx
}

// ─── BioRecord ───────────────────────────────────────────────────────────────

export interface RangeObject {
  optimal: string
  functional: string
  deficiency: string | null
  toxicity: string | null
  unit: string
  population?: string
}

export interface SourceMeta {
  ieo_id: UUID
  ieo_domain: string
  method: string
  equipment?: string
  operator?: string
  firmware?: string
  signature: string
}

export interface BioRecord {
  record_id: UUID
  beo_id: UUID
  ieo_id: UUID
  version: SemVer
  biomarker: string
  category: string
  level: BioLevel
  value: number | string | Record<string, unknown>
  unit: string
  ref_range: RangeObject
  collected_at: ISO8601
  submitted_at: ISO8601
  source: SourceMeta
  confidence?: number
  status: RecordStatus
  supersedes: UUID | null
  arweave_tx?: ArweaveTx
  data_hash?: string
}

// ─── ConsentToken ────────────────────────────────────────────────────────────

export interface TokenScope {
  intents: BSPIntent[]
  categories: string[]
  levels: BioLevel[]
  period: {
    from: ISO8601 | null
    to: ISO8601 | null
  } | null
  max_records: number | null
}

export interface ConsentToken {
  token_id: string
  beo_id: UUID
  beo_domain: string
  ieo_id: UUID
  ieo_domain: string
  granted_at: ISO8601
  expires_at: ISO8601 | null
  scope: TokenScope
  revocable: boolean
  revoked: boolean
  revoked_at: ISO8601 | null
  owner_signature: string
  token_hash: string
  arweave_tx?: ArweaveTx
  version: SemVer
}

// ─── Exchange ─────────────────────────────────────────────────────────────────

export type BSPStatus = 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'PENDING'

export interface BSPError {
  code: string
  message: string
  field?: string
  retryable: boolean
}

export interface SubmitResult {
  request_id: string
  status: BSPStatus
  record_ids: string[]
  arweave_txs: string[]
  timestamp: ISO8601
  error?: BSPError
}

export interface ReadResult {
  request_id: string
  beo_id: UUID
  records: BioRecord[]
  total: number
  has_more: boolean
  error?: BSPError
}

export interface ReadFilters {
  categories?: string[]
  biomarkers?: string[]
  levels?: BioLevel[]
  period?: {
    from?: ISO8601
    to?: ISO8601
  }
  limit?: number
  offset?: number
  status?: RecordStatus
}

// ─── SDK Config ───────────────────────────────────────────────────────────────

export interface BSPConfig {
  ieo_domain: string
  private_key: string
  environment: 'mainnet' | 'testnet' | 'local'
  registry_url?: string
  arweave_node?: string
  timeout_ms?: number
}
