# @bsp/sdk — TypeScript SDK for the Biological Sovereignty Protocol

> Official TypeScript SDK for the [Biological Sovereignty Protocol (BSP)](https://github.com/Biological-Sovereignty-Protocol/bsp-spec)
> Published by the Ambrósio Institute · ambrosio.health · bsp.dev

## Installation

```bash
npm install @bsp/sdk
# or
yarn add @bsp/sdk
# or
pnpm add @bsp/sdk
```

## Quick Start

```typescript
import { BEOClient, BioRecordBuilder, ExchangeClient } from '@bsp/sdk'

// Create a BEO (Biological Entity Object)
const beoClient = new BEOClient()
const beo = await beoClient.create({ domain: 'andre.bsp' })

// Build a BioRecord
const record = new BioRecordBuilder()
  .beoId(beo.beo_id)
  .biomarker('BSP-GL-001')   // Fasting glucose
  .value(94)
  .unit('mg/dL')
  .timestamp(new Date().toISOString())
  .confidence(0.99)
  .build()

// Submit with consent token
const client = new ExchangeClient({ ieoId: 'my-lab.bsp' })
const result = await client.submit(record, consentToken)
```

## Modules

| Module | Description |
|---|---|
| `BEOClient` | Create and manage Biological Entity Objects |
| `BioRecordBuilder` | Build and validate BioRecords |
| `ExchangeClient` | Submit and read biological data |
| `TaxonomyResolver` | Validate and resolve BSP biomarker codes |
| `AccessManager` | Manage consent tokens on-chain |

## Documentation

Full documentation: [bsp.dev](https://bsp.dev)
Protocol specification: [bsp-spec](https://github.com/Biological-Sovereignty-Protocol/bsp-spec)

## License

Apache 2.0 — Ambrósio Institute
