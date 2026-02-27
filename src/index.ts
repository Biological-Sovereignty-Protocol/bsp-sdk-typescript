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
