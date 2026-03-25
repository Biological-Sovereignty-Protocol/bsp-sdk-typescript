// @bsp/sdk — Public API
// Official TypeScript SDK for the Biological Sovereignty Protocol

// ─── Main Client ─────────────────────────────────────────────────────────────
export { BSPClient } from './BSPClient'

// ─── Builders ────────────────────────────────────────────────────────────────
export { BEOClient } from './beo/BEOClient'
export { IEOBuilder } from './ieo/IEOBuilder'
export { BioRecordBuilder } from './biorecord/BioRecordBuilder'

// ─── Modules ─────────────────────────────────────────────────────────────────
export { AccessManager } from './access/AccessManager'
export { ExchangeClient } from './exchange/ExchangeClient'
export { TaxonomyResolver } from './biorecord/TaxonomyResolver'

// ─── Types ───────────────────────────────────────────────────────────────────
export * from './types'

// ─── Utilities ───────────────────────────────────────────────────────────────
export { CryptoUtils } from './utils/CryptoUtils'
export { HttpClient, BSPApiError } from './utils/HttpClient'
export type { KeyPair } from './utils/CryptoUtils'
