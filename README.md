[![npm version](https://img.shields.io/npm/v/@bsp/sdk.svg)](https://www.npmjs.com/package/@bsp/sdk)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

# @bsp/sdk

Official TypeScript SDK for the [Biological Sovereignty Protocol](https://biologicalsovereigntyprotocol.com) — giving individuals sovereign control over their biological data.

---

## Installation

```bash
npm install bsp-sdk
# or
yarn add bsp-sdk
# or
pnpm add bsp-sdk
```

Requires Node.js >= 18 and TypeScript >= 5.0.

---

## Quick Start

Minimal working example: create a BEO, grant consent, and submit a biomarker record.

```typescript
import { BEOClient, AccessManager, BioRecordBuilder, ExchangeClient } from 'bsp-sdk'

// 1. Create a Biological Entity Object (the individual's sovereign identity)
const beoClient = new BEOClient()
const { beo, keyPair } = await beoClient.create({ domain: 'andre.bsp' })

// 2. Grant consent to an institution (IEO)
const accessManager = new AccessManager({ beo, privateKey: keyPair.privateKey })
const token = await accessManager.grantConsent({
  ieoId: 'my-lab.bsp',
  scope: {
    intents: ['SUBMIT_RECORD', 'READ_RECORDS'],
    categories: ['METABOLIC'],
    levels: ['STANDARD'],
    period: null,
    max_records: null,
  },
})

// 3. Build a signed BioRecord
const record = new BioRecordBuilder()
  .beoId(beo.beo_id)
  .biomarker('BSP-GL-001')   // Fasting glucose
  .value(94)
  .unit('mg/dL')
  .timestamp(new Date().toISOString())
  .confidence(0.99)
  .sign(keyPair.privateKey)
  .build()

// 4. Submit via an institution's ExchangeClient
const exchange = new ExchangeClient({ ieoId: 'my-lab.bsp', privateKey: labPrivateKey })
const result = await exchange.submit(record, token)
console.log(result.arweave_txs) // permanent record on Arweave
```

---

## API Reference

### `BEOClient`

Manages Biological Entity Objects — the sovereign identity of a biological individual.

```typescript
import { BEOClient } from 'bsp-sdk'
const client = new BEOClient()
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `create(opts)` | `{ domain: string, guardians?: Guardian[] }` | `Promise<{ beo: BEO, keyPair: KeyPair }>` | Creates a new BEO and Ed25519 key pair |
| `recover(seedPhrase)` | `seedPhrase: string` | `Promise<{ beo: BEO, keyPair: KeyPair }>` | Recovers BEO from a BIP39 seed phrase |
| `rotateKey(beoId, oldKey, newKey)` | `string, Uint8Array, Uint8Array` | `Promise<BEO>` | Rotates the signing key and publishes updated BEO |
| `lock(beoId, privateKey)` | `string, Uint8Array` | `Promise<BEO>` | Locks the BEO (freezes new record submissions) |
| `unlock(beoId, privateKey)` | `string, Uint8Array` | `Promise<BEO>` | Unlocks a previously locked BEO |
| `get(beoId)` | `string` | `Promise<BEO>` | Fetches a BEO by ID from the registry |

---

### `IEOClient` / `IEOBuilder`

Manages Institutional Entity Objects — the identity of labs, hospitals, platforms.

```typescript
import { IEOBuilder } from 'bsp-sdk'
const builder = new IEOBuilder()
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `createIEO(opts)` | `IEOCreateOptions` | `Promise<IEO>` | Registers a new institution on the protocol |
| `rotateKey(ieoId, oldKey, newKey)` | `string, Uint8Array, Uint8Array` | `Promise<IEO>` | Rotates the institution's signing key |
| `updateContacts(ieoId, contacts)` | `string, ContactInfo` | `Promise<IEO>` | Updates legal/contact metadata |
| `get(ieoId)` | `string` | `Promise<IEO>` | Fetches an IEO by ID |

`IEOCreateOptions`:

```typescript
{
  domain: string          // e.g. 'my-lab.bsp'
  display_name: string
  ieo_type: IEOType       // 'LAB' | 'HOSPITAL' | 'WEARABLE' | 'PHYSICIAN' | 'INSURER' | 'RESEARCH' | 'PLATFORM'
  country: string         // ISO 3166-1 alpha-2
  jurisdiction: string
  legal_id: string
}
```

---

### `BioRecordBuilder`

Fluent builder for constructing and signing BioRecords before submission.

```typescript
import { BioRecordBuilder } from 'bsp-sdk'

const record = new BioRecordBuilder()
  .beoId('uuid-of-beo')
  .biomarker('BSP-GL-001')
  .value(94)
  .unit('mg/dL')
  .category('METABOLIC')
  .level('STANDARD')
  .timestamp('2026-03-24T08:00:00Z')
  .confidence(0.99)
  .sign(privateKey)
  .build()
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `.beoId(id)` | `string` | `this` | Sets the BEO owner |
| `.biomarker(code)` | `string` | `this` | BSP taxonomy code (e.g. `BSP-GL-001`) |
| `.value(v)` | `number \| string \| object` | `this` | Measured value |
| `.unit(u)` | `string` | `this` | Unit of measurement |
| `.category(c)` | `string` | `this` | Biomarker category |
| `.level(l)` | `BioLevel` | `this` | `'CORE' \| 'STANDARD' \| 'EXTENDED' \| 'DEVICE'` |
| `.timestamp(iso)` | `ISO8601` | `this` | Collection timestamp |
| `.confidence(n)` | `number` | `this` | 0–1 confidence score |
| `.refRange(r)` | `RangeObject` | `this` | Reference ranges |
| `.sign(privateKey)` | `Uint8Array` | `this` | Signs the record with the IEO's private key |
| `.build()` | — | `BioRecord` | Validates and returns the final record |

---

### `ExchangeClient`

Submits and queries biological records on behalf of an institution.

```typescript
import { ExchangeClient } from 'bsp-sdk'
const exchange = new ExchangeClient({ ieoId: 'my-lab.bsp', privateKey })
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `submit(record, token)` | `BioRecord, ConsentToken` | `Promise<SubmitResult>` | Submits a signed record; verifies consent before writing |
| `query(beoId, token, filters?)` | `string, ConsentToken, ReadFilters?` | `Promise<ReadResult>` | Reads records for a BEO within consent scope |
| `verify(recordId)` | `string` | `Promise<boolean>` | Verifies a record's hash against its Arweave transaction |

---

### `AccessManager`

Grants, verifies, and revokes ConsentTokens on behalf of a BEO.

```typescript
import { AccessManager } from 'bsp-sdk'
const manager = new AccessManager({ beo, privateKey })
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `grantConsent(opts)` | `ConsentGrantOptions` | `Promise<ConsentToken>` | Creates and signs a ConsentToken |
| `revokeToken(tokenId)` | `string` | `Promise<void>` | Revokes an active token immediately |
| `verifyToken(token)` | `ConsentToken` | `Promise<boolean>` | Verifies token signature and checks revocation status |
| `listTokens(beoId)` | `string` | `Promise<ConsentToken[]>` | Lists all active tokens for a BEO |

---

### `CryptoUtils`

Low-level cryptographic primitives used internally. Exposed for advanced use cases.

```typescript
import { CryptoUtils } from 'bsp-sdk'
```

| Method | Params | Returns | Description |
|---|---|---|---|
| `generateSeedPhrase()` | — | `string` | BIP39 24-word seed phrase |
| `recoverKeyPair(seedPhrase)` | `string` | `KeyPair` | Deterministic Ed25519 key pair from seed |
| `verifySignature(message, sig, publicKey)` | `Uint8Array, Uint8Array, Uint8Array` | `boolean` | Verifies an Ed25519 signature |
| `generateKeyPair()` | — | `KeyPair` | Generates a fresh random key pair |
| `splitSecret(secret, threshold, shares)` | `Uint8Array, number, number` | `Uint8Array[]` | Shamir Secret Sharing split |
| `recoverSecret(shares)` | `Uint8Array[]` | `Uint8Array` | Shamir Secret Sharing recovery |

---

## Complete Flow Example

BEO creation, consent grant, record submission, and read — end to end.

```typescript
import {
  BEOClient,
  IEOBuilder,
  AccessManager,
  BioRecordBuilder,
  ExchangeClient,
  CryptoUtils,
} from 'bsp-sdk'

// ── 1. Institution setup (done once) ─────────────────────────────────────────
const ieoBuilder = new IEOBuilder()
const labKeyPair = CryptoUtils.generateKeyPair()

const lab = await ieoBuilder.createIEO({
  domain: 'sunrise-lab.bsp',
  display_name: 'Sunrise Diagnostics',
  ieo_type: 'LAB',
  country: 'BR',
  jurisdiction: 'SP',
  legal_id: 'CNPJ-12345678000195',
})

// ── 2. Individual creates their BEO ──────────────────────────────────────────
const beoClient = new BEOClient()
const seedPhrase = CryptoUtils.generateSeedPhrase()
const keyPair = CryptoUtils.recoverKeyPair(seedPhrase)

const { beo } = await beoClient.create({
  domain: 'andre.bsp',
  guardians: [
    {
      name: 'Maria',
      contact: 'maria@example.com',
      public_key: guardianPublicKey,
      role: 'primary',
      accepted: false,
      added_at: new Date().toISOString(),
    },
  ],
})

// ── 3. Individual grants consent to the lab ──────────────────────────────────
const accessManager = new AccessManager({ beo, privateKey: keyPair.privateKey })

const token = await accessManager.grantConsent({
  ieoId: lab.ieo_id,
  scope: {
    intents: ['SUBMIT_RECORD', 'READ_RECORDS'],
    categories: ['METABOLIC', 'HORMONAL'],
    levels: ['STANDARD', 'EXTENDED'],
    period: { from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z' },
    max_records: null,
  },
  expires_at: '2026-12-31T23:59:59Z',
})

// ── 4. Lab submits a record ───────────────────────────────────────────────────
const record = new BioRecordBuilder()
  .beoId(beo.beo_id)
  .biomarker('BSP-GL-001')
  .value(94)
  .unit('mg/dL')
  .category('METABOLIC')
  .level('STANDARD')
  .timestamp(new Date().toISOString())
  .confidence(0.99)
  .refRange({
    optimal: '70–85',
    functional: '85–100',
    deficiency: null,
    toxicity: '> 126',
    unit: 'mg/dL',
  })
  .sign(labKeyPair.privateKey)
  .build()

const exchange = new ExchangeClient({ ieoId: lab.ieo_id, privateKey: labKeyPair.privateKey })
const submitResult = await exchange.submit(record, token)
console.log('Arweave TX:', submitResult.arweave_txs[0])

// ── 5. Lab queries back the records ──────────────────────────────────────────
const readResult = await exchange.query(beo.beo_id, token, {
  categories: ['METABOLIC'],
  limit: 50,
})
console.log(`Retrieved ${readResult.total} records`)

// ── 6. Revoke consent when done ──────────────────────────────────────────────
await accessManager.revokeToken(token.token_id)
```

---

## Error Handling

All SDK methods throw a `BSPError`-shaped object on failure. Always wrap calls in `try/catch`.

```typescript
import type { BSPError } from 'bsp-sdk'

try {
  const result = await exchange.submit(record, token)
} catch (err) {
  const bspErr = err as BSPError
  console.error(`[${bspErr.code}] ${bspErr.message}`)
  if (bspErr.retryable) {
    // safe to retry with backoff
  }
}
```

Common error codes:

| Code | Retryable | Description |
|---|---|---|
| `CONSENT_EXPIRED` | No | ConsentToken has passed its `expires_at` |
| `CONSENT_REVOKED` | No | Token was explicitly revoked by the BEO owner |
| `SCOPE_VIOLATION` | No | Record category or intent is outside token scope |
| `INVALID_SIGNATURE` | No | Record or token signature verification failed |
| `BEO_LOCKED` | No | BEO is in LOCKED state; no writes allowed |
| `IEO_SUSPENDED` | No | Institution's IEO has been suspended |
| `REGISTRY_UNAVAILABLE` | Yes | BSP registry node is temporarily unreachable |
| `ARWEAVE_TIMEOUT` | Yes | Arweave write timed out; record is pending |
| `INVALID_BIOMARKER` | No | BSP taxonomy code not found or malformed |

---

## Configuration

Configure via environment variables or by passing `BSPConfig` directly.

```typescript
import { BSPClient } from 'bsp-sdk'

const client = new BSPClient({
  ieo_domain: 'my-lab.bsp',
  private_key: process.env.BSP_PRIVATE_KEY!,
  environment: 'mainnet',          // 'mainnet' | 'testnet' | 'local'
  registry_url: 'https://api.biologicalsovereigntyprotocol.com',
  arweave_node: 'https://arweave.net',
  timeout_ms: 30000,
})
```

`.env.example`:

```env
# Required
BSP_IEO_DOMAIN=my-lab.bsp
BSP_PRIVATE_KEY=<hex-encoded Ed25519 private key>
BSP_ENVIRONMENT=mainnet

# Optional overrides
BSP_REGISTRY_URL=https://api.biologicalsovereigntyprotocol.com
BSP_ARWEAVE_NODE=https://arweave.net
BSP_TIMEOUT_MS=30000
```

---

## TypeScript Types

Key interfaces exported from `@bsp/sdk`:

```typescript
// The sovereign identity of a biological individual
interface BEO {
  beo_id: UUID
  domain: string
  public_key: string
  created_at: ISO8601
  version: SemVer
  recovery: RecoveryConfig
  status: 'ACTIVE' | 'LOCKED' | 'RECOVERY_PENDING'
  locked_at: ISO8601 | null
  arweave_tx?: ArweaveTx
}

// The identity of an institution
interface IEO {
  ieo_id: UUID
  domain: string
  display_name: string
  ieo_type: 'LAB' | 'HOSPITAL' | 'WEARABLE' | 'PHYSICIAN' | 'INSURER' | 'RESEARCH' | 'PLATFORM'
  public_key: string
  certification: IEOCertification
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'PENDING'
}

// Defines what an institution is allowed to do with a BEO's data
interface ConsentToken {
  token_id: string
  beo_id: UUID
  ieo_id: UUID
  granted_at: ISO8601
  expires_at: ISO8601 | null
  scope: TokenScope
  revocable: boolean
  revoked: boolean
  owner_signature: string
  token_hash: string
}

// What a token permits
interface TokenScope {
  intents: BSPIntent[]      // 'SUBMIT_RECORD' | 'READ_RECORDS' | 'ANALYZE_VITALITY' | ...
  categories: string[]
  levels: BioLevel[]        // 'CORE' | 'STANDARD' | 'EXTENDED' | 'DEVICE'
  period: { from: ISO8601 | null; to: ISO8601 | null } | null
  max_records: number | null
}

// A single biological measurement
interface BioRecord {
  record_id: UUID
  beo_id: UUID
  ieo_id: UUID
  biomarker: string
  value: number | string | Record<string, unknown>
  unit: string
  collected_at: ISO8601
  source: SourceMeta
  confidence?: number
  status: 'ACTIVE' | 'SUPERSEDED' | 'PENDING'
  arweave_tx?: ArweaveTx
}
```

---

## Contributing

Pull requests are welcome. Please open an issue first for any significant change.

```bash
git clone https://github.com/Biological-Sovereignty-Protocol/bsp-sdk-typescript
cd bsp-sdk-typescript
npm install
npm run build
npm test
```

Lint: `npm run lint` | Type check: `npm run typecheck`

---

## License

Apache 2.0 — [Ambrósio Institute](https://ambrosioinstitute.org)

Protocol specification: [bsp-spec](https://github.com/Biological-Sovereignty-Protocol/bsp-spec) | Docs: [biologicalsovereigntyprotocol.com/developers/sdk-reference](https://biologicalsovereigntyprotocol.com/developers/sdk-reference)
