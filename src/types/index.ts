// BSP Core Types — v3.0 (Aptos, bigint IDs)
// Full type definitions for the Biological Sovereignty Protocol SDK
//
// ╭─ Breaking change (v2 → v3) ────────────────────────────────────────────────╮
// │ On-chain BSP identifiers (BEO, IEO, ConsentToken, BioRecord) are `u64` in │
// │ Move. v2 exposed them as `UUID = string`, which silently truncated large  │
// │ values through JavaScript's `number` coercion in some code paths and did  │
// │ not match the wire format of the Registry API's new `timestamp_secs` +    │
// │ hex-nonce alignment.                                                      │
// │                                                                           │
// │ v3 models them as native `bigint`. Consumers must use the `BeoId`/        │
// │ `IeoId`/`ConsentTokenId`/`BioRecordId` branded types. When serialising to │
// │ JSON use `bsp.serializeId(id)` (emits a string). When deserialising use   │
// │ `bsp.parseId(raw)` (accepts string or bigint, rejects `number` inputs     │
// │ above `Number.MAX_SAFE_INTEGER`).                                         │
// │                                                                           │
// │ The legacy `UUID` type alias is kept and re-typed to `string` so that     │
// │ code referring to non-id UUIDs (request ids, record hashes) compiles      │
// │ unchanged.                                                                │
// ╰───────────────────────────────────────────────────────────────────────────╯

export type ISO8601 = string
export type SemVer = string
export type UUID = string
export type AptosTxHash = string

/** @deprecated Use AptosTxHash instead. Kept for migration compatibility. */
export type ArweaveTx = AptosTxHash

// ─── On-chain ID types ───────────────────────────────────────────────────────

/** BSP BEO identifier — u64 on Move, `bigint` in TS. */
export type BeoId = bigint

/** BSP IEO identifier — u64 on Move, `bigint` in TS. */
export type IeoId = bigint

/** ConsentToken identifier — u64 on Move, `bigint` in TS. */
export type ConsentTokenId = bigint

/** BioRecord identifier — u64 on Move, `bigint` in TS. */
export type BioRecordId = bigint

/**
 * Parse a wire-format id (string, bigint, or safe-integer number) into a `bigint`.
 * Throws on unsafe `number` inputs or non-numeric strings — callers should
 * prefer wire-format strings for cross-language safety.
 */
export function parseId(raw: string | number | bigint): bigint {
  if (typeof raw === 'bigint') return raw
  if (typeof raw === 'string') {
    if (!/^\d+$/.test(raw)) throw new TypeError(`id must be decimal digits, got "${raw}"`)
    return BigInt(raw)
  }
  if (!Number.isSafeInteger(raw) || raw < 0) {
    throw new TypeError(`id number ${raw} is unsafe — pass as string to preserve u64 range`)
  }
  return BigInt(raw)
}

/** Serialize an id to its canonical wire form (decimal string — safe for JSON, u64). */
export function serializeId(id: bigint): string {
  return id.toString(10)
}

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
  beo_id: BeoId
  domain: string
  public_key: string
  created_at: ISO8601
  version: SemVer
  recovery: RecoveryConfig
  status: BEOStatus
  locked_at: ISO8601 | null
  aptos_tx?: AptosTxHash
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
  ieo_id: IeoId
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
  aptos_tx?: AptosTxHash
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
  ieo_id: IeoId
  ieo_domain: string
  method: string
  equipment?: string
  operator?: string
  firmware?: string
  signature: string
}

export interface BioRecord {
  record_id: BioRecordId
  beo_id: BeoId
  ieo_id: IeoId
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
  supersedes: BioRecordId | null
  aptos_tx?: AptosTxHash
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
  token_id: ConsentTokenId
  beo_id: BeoId
  beo_domain: string
  ieo_id: IeoId
  ieo_domain: string
  granted_at: ISO8601
  expires_at: ISO8601 | null
  scope: TokenScope
  revocable: boolean
  revoked: boolean
  revoked_at: ISO8601 | null
  owner_signature: string
  token_hash: string
  aptos_tx?: AptosTxHash
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
  record_ids: BioRecordId[]
  aptos_txs: string[]
  /** Wire-format Unix seconds (u64) — matches Registry API `timestamp_secs`. */
  timestamp_secs: number
  error?: BSPError
}

export interface ReadResult {
  request_id: string
  beo_id: BeoId
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

export type AptosNetwork = 'mainnet' | 'testnet' | 'devnet' | 'local'

export interface BSPConfig {
  ieo_domain: string
  private_key: string
  environment: 'mainnet' | 'testnet' | 'local'
  registry_url?: string
  /** Aptos Move contract address where BSP modules are deployed */
  contract_address?: string
  /** Aptos network for direct chain queries (defaults to match environment) */
  aptos_network?: AptosNetwork
  /** Aptos fullnode URL override (optional, defaults based on aptos_network) */
  aptos_node_url?: string
  timeout_ms?: number
}
