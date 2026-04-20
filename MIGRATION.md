# Migration Guide — v2 → v3

## Overview

v3.0.0 aligns the TypeScript SDK with the Move contracts on Aptos, where all entity identifiers are `u64`. In TypeScript this maps to native `bigint`. Any code that stored or passed BEO/IEO/ConsentToken/BioRecord IDs as `string` or `number` must be updated.

---

## Breaking Changes

### 1. ID types changed from `string` to `bigint`

| Type | v2 | v3 |
|---|---|---|
| `BeoId` | `string` (UUID) | `bigint` |
| `IeoId` | `string` (UUID) | `bigint` |
| `ConsentTokenId` | `string` | `bigint` |
| `BioRecordId` | `string` | `bigint` |

The JSON wire format sent to and received from the API **remains a decimal string**. The SDK handles this conversion internally. At your application boundary, use `parseId()` when reading IDs from JSON/env vars, and `serializeId()` when writing them back.

### 2. `parseId()` and `serializeId()` are now the official conversion utilities

```typescript
import { parseId, serializeId } from 'bsp-sdk'
```

`parseId(raw)` — accepts `string | number | bigint`, returns `bigint`. Throws on non-decimal strings or negative values.

`serializeId(id)` — accepts `bigint`, returns the decimal string for JSON.

---

## Migration Steps

### Step 1 — Replace string literal IDs with `parseId()`

**Before (v2):**
```typescript
const beoId: string = '00000000-0000-0000-0000-000000000042'
const token = await accessManager.grantConsent({ ieoId: 'lab.bsp', ... })
await accessManager.revokeToken('tok_abc123')
await beoClient.get('00000000-0000-0000-0000-000000000042')
```

**After (v3):**
```typescript
import { parseId } from 'bsp-sdk'

const beoId = parseId('42')                     // bigint
const token = await accessManager.grantConsent({ ieoId: lab.ieo_id, ... })  // already bigint from SDK
await accessManager.revokeToken(token.token_id) // already bigint
await beoClient.get(parseId('42'))
```

### Step 2 — Use `serializeId()` when embedding IDs in JSON or logs

**Before (v2):**
```typescript
const body = JSON.stringify({ beo_id: beoId })
console.log(`BEO: ${beoId}`)
```

**After (v3):**
```typescript
import { serializeId } from 'bsp-sdk'

const body = JSON.stringify({ beo_id: serializeId(beoId) })
console.log(`BEO: ${serializeId(beoId)}`)
// or use String interpolation — bigint coerces to string in template literals
console.log(`BEO: ${beoId}`)   // also works
```

### Step 3 — Update environment variable parsing

**Before (v2):**
```typescript
const beoId: string = process.env.BSP_BEO_ID!
```

**After (v3):**
```typescript
import { parseId } from 'bsp-sdk'

const beoId = parseId(process.env.BSP_BEO_ID!)
```

### Step 4 — Update TypeScript type annotations

Replace any explicit `string` annotations for IDs with the SDK branded types:

```typescript
import type { BeoId, IeoId, ConsentTokenId, BioRecordId } from 'bsp-sdk'

// Before
let id: string

// After
let id: BeoId  // bigint
```

---

## API Endpoint Behavior

The REST API still accepts and returns IDs as decimal strings. The SDK handles the conversion at the HTTP boundary — you never see strings in application code.

| Direction | Format | How to handle |
|---|---|---|
| API response → your code | string (e.g. `"42"`) | SDK calls `parseId()` internally; you get `bigint` |
| Your code → API request | bigint | SDK calls `serializeId()` internally before sending |
| Env var / config file | string | Call `parseId()` once at startup |
| Logs / user-facing output | — | Use `serializeId(id)` or template literal (`${id}`) |

---

## Full Before/After Example

**Before (v2):**
```typescript
import { BEOClient, AccessManager } from 'bsp-sdk'

const beoClient = new BEOClient()
const { beo } = await beoClient.create({ domain: 'alice.bsp' })

// beo.beo_id was a string UUID
const manager = new AccessManager({ beo, privateKey })
const token = await manager.grantConsent({ ieoId: 'lab.bsp', scope: { ... } })

// revokeToken accepted a string
await manager.revokeToken(token.token_id)

// get() accepted a string
const fetched = await beoClient.get(beo.beo_id)
```

**After (v3):**
```typescript
import { BEOClient, AccessManager, parseId, serializeId } from 'bsp-sdk'

const beoClient = new BEOClient()
const { beo } = await beoClient.create({ domain: 'alice.bsp' })

// beo.beo_id is now bigint — use directly with SDK methods
const manager = new AccessManager({ beo, privateKey })
const token = await manager.grantConsent({ ieoId: lab.ieo_id, scope: { ... } })

// revokeToken now accepts ConsentTokenId (bigint)
await manager.revokeToken(token.token_id)

// get() now accepts BeoId (bigint)
const fetched = await beoClient.get(beo.beo_id)

// Only convert when crossing the JSON/string boundary:
const wireId = serializeId(beo.beo_id)          // "1234567890"
const fromEnv = parseId(process.env.BEO_ID!)    // bigint
```

---

## Checklist

- [ ] Replace `string` ID variables with `bigint` / `BeoId` / `IeoId` / `ConsentTokenId`
- [ ] Add `parseId()` where IDs are read from API responses, env vars, or config files
- [ ] Add `serializeId()` where IDs are written to JSON bodies or logs
- [ ] Update `JSON.stringify` calls that include ID fields
- [ ] Update TypeScript type annotations (`:string` → `:BeoId` etc.)
- [ ] Run `npm run typecheck` — the compiler will surface any remaining mismatches
