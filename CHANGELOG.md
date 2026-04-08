# Changelog

All notable changes to `bsp-sdk` will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-03-24

### Added

- **BEOClient**: create, recover (BIP39 seed phrase), rotate key, lock, unlock, and fetch Biological Entity Objects
- **IEOClient / IEOBuilder**: register institution identities (IEOs), manage certifications, rotate keys, update contact metadata
- **BioRecordBuilder**: fluent builder for constructing, validating, and signing biological records; supports all BSP biomarker levels (`CORE`, `STANDARD`, `EXTENDED`, `DEVICE`)
- **ExchangeClient**: submit signed BioRecords to the exchange with automated consent verification; query records by BEO with `ReadFilters`; verify Arweave integrity by record ID
- **AccessManager**: grant ConsentTokens with fine-grained `TokenScope` (intents, categories, levels, time period, max records); verify token signatures and revocation status; revoke tokens; list active tokens per BEO
- **CryptoUtils**: Ed25519 key pair generation via `tweetnacl`; BIP39 24-word seed phrase generation and deterministic key recovery; Shamir Secret Sharing split/recover for social key recovery; `verifySignature` utility
- **BSPClient**: unified entry-point client accepting `BSPConfig` (environment, registry URL, Arweave node, timeout)
- **TaxonomyResolver**: validates and resolves BSP biomarker codes against the protocol taxonomy
- **Full TypeScript types**: `BEO`, `IEO`, `BioRecord`, `ConsentToken`, `TokenScope`, `SubmitResult`, `ReadResult`, `ReadFilters`, `BSPConfig`, `BSPError`, and all supporting enums and interfaces
- **Dual module output**: CommonJS (`require`) and ESM (`import`) via `exports` field in `package.json`
- Node.js >= 18 and TypeScript >= 5.0 required

[1.0.0]: https://github.com/Biological-Sovereignty-Protocol/bsp-sdk-typescript/releases/tag/v1.0.0
