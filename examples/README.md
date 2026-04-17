# BSP SDK — Examples

Runnable examples for the `bsp-sdk` TypeScript SDK.

## Prerequisites

```bash
# From the repo root
npm install
cp .env.example .env  # then fill in your values
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `BSP_RELAYER_URL` | No | BSP relayer endpoint. If omitted, examples run in simulated mode. |
| `BSP_PRIVATE_KEY` | No | Your BEO or IEO private key (for live mode). |
| `BSP_NETWORK` | No | `testnet` (default) or `mainnet`. |

If `BSP_RELAYER_URL` is not set, all examples run in **simulated mode** — the full flow executes locally with no network calls. Useful for exploring the API before the registry is live.

## Examples

### `full-flow.ts` — Complete end-to-end walkthrough

Covers the entire BSP lifecycle in a single file:

1. BEO creation (`alice.bsp`)
2. IEO creation (`genomicslab.bsp`)
3. ConsentToken grant (Alice authorizes the lab)
4. BioRecord build and submission (hemoglobin result)
5. Record query with filters
6. Consent revocation
7. Revocation verification

```bash
npx ts-node examples/full-flow.ts
```

Expected output (simulated mode):

```
╔════════════════════════════════════════════╗
║  BSP Full Flow Example                     ║
║  Biological Sovereignty Protocol — SDK     ║
╚════════════════════════════════════════════╝

Mode: SIMULATED (no registry connection)
Network: testnet

── Step 1: Create BEO for alice.bsp ─────────────────────────────
  BEO created:
    domain:      alice.bsp
    beo_id:      beo_alice_bsp_...
    aptos_tx:  aptos_tx_...
  ⚠  SIMULATED — store private_key in .env...

...

╔════════════════════════════════════════════╗
║  Flow complete                             ║
╚════════════════════════════════════════════╝
```

## Concepts covered

| Concept | Class used |
|---|---|
| User identity | `BEOClient` |
| Institution identity | `IEOBuilder` |
| Consent management | `AccessManager` |
| Building biological records | `BioRecordBuilder` |
| Data exchange | `ExchangeClient` |

## Adding examples

New examples go in this folder as `.ts` files. Run with:

```bash
npx ts-node examples/<file>.ts
```

For examples that need live registry access, set `BSP_RELAYER_URL` in your `.env` file before running.
