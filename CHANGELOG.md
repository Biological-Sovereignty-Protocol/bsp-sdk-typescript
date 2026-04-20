# Changelog

All notable changes to `bsp-sdk` will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [3.0.0] — 2026-04-20

### Breaking

- **`bigint` identifiers.** `BEO.beo_id`, `IEO.ieo_id`, `ConsentToken.token_id`,
  `BioRecord.record_id`, `BioRecord.supersedes`, and `SourceMeta.ieo_id` are now
  typed as `bigint` (aliases `BeoId`, `IeoId`, `ConsentTokenId`, `BioRecordId`)
  to match the on-chain `u64` representation. String/UUID values no longer
  compile.

  Wire-format strings from the Registry API are parsed via `parseId()` and
  serialised via `serializeId()`. Both helpers are exported from the SDK root.

- **`timestamp_secs` on the wire.** All write methods (`BEOClient.lock`,
  `unlock`, `destroy`, `rotateKey`, `updateRecovery`, `requestRecovery`) now
  send `timestamp_secs: number` (Unix seconds) instead of `timestamp: string`
  (ISO8601). Aligns with the Registry API v2 schema.

### Migration

```ts
// v2
await client.beo.lock('550e8400-e29b-41d4-a716-446655440000')

// v3
import { parseId } from '@biological-sovereignty-protocol/sdk'
const beoId = parseId('42') // bigint — safe for u64
await client.beo.lock(beoId)
```

### Added

- `parseId(raw: string | number | bigint): bigint` — canonical id parser.
- `serializeId(id: bigint): string` — canonical wire encoder.
- `BeoId`, `IeoId`, `ConsentTokenId`, `BioRecordId` type aliases.
- `tests/bigint-ids.test.ts` — 13 tests covering parse/serialize round-trips
  and u64 max value preservation.

---

## [2.1.0] — 2026-04-20

### Added

- **Aptos migration**: client now targets Aptos Move contracts; `@aptos-labs/ts-sdk` upgraded to `^6.3.1`.
- **TypeDoc**: API reference generation via `npm run docs` (config in `typedoc.json`).
- **CONTRIBUTING.md**: local setup, testing, linting, examples, PR guidelines.
- **Examples**: split `full-flow.ts` into four focused, runnable examples:
  - `examples/01-create-beo.ts`
  - `examples/02-grant-consent.ts`
  - `examples/03-submit-biorecord.ts`
  - `examples/04-destroy-beo.ts`

### Changed

- `hexToBytes` now validates even-length hex strings (security hardening).
- Replaced SmartWeave references with AO across inline comments.

### Infrastructure

- CodeQL and Dependabot workflows added to the repository.

## [1.0.0] — 2026-03-24

### Added

- **BEOClient**: create, recover (BIP39 seed phrase), rotate key, lock, unlock, and fetch Biological Entity Objects
- **IEOClient / IEOBuilder**: register institution identities (IEOs), manage certifications, rotate keys, update contact metadata
- **BioRecordBuilder**: fluent builder for constructing, validating, and signing biological records; supports all BSP biomarker levels (`CORE`, `STANDARD`, `EXTENDED`, `DEVICE`)
- **ExchangeClient**: submit signed BioRecords to the exchange with automated consent verification; query records by BEO with `ReadFilters`; verify on-chain integrity by record ID
- **AccessManager**: grant ConsentTokens with fine-grained `TokenScope` (intents, categories, levels, time period, max records); verify token signatures and revocation status; revoke tokens; list active tokens per BEO
- **CryptoUtils**: Ed25519 key pair generation via `tweetnacl`; BIP39 24-word seed phrase generation and deterministic key recovery; Shamir Secret Sharing split/recover for social key recovery; `verifySignature` utility
- **BSPClient**: unified entry-point client accepting `BSPConfig` (environment, registry URL, Aptos contract address, timeout)
- **TaxonomyResolver**: validates and resolves BSP biomarker codes against the protocol taxonomy
- **Full TypeScript types**: `BEO`, `IEO`, `BioRecord`, `ConsentToken`, `TokenScope`, `SubmitResult`, `ReadResult`, `ReadFilters`, `BSPConfig`, `BSPError`, and all supporting enums and interfaces
- **Dual module output**: CommonJS (`require`) and ESM (`import`) via `exports` field in `package.json`
- Node.js >= 18 and TypeScript >= 5.0 required

[1.0.0]: https://github.com/Biological-Sovereignty-Protocol/bsp-sdk-typescript/releases/tag/v1.0.0
