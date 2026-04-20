/**
 * Example 03 — Submit a signed BioRecord
 *
 * Demonstrates how an IEO builds a BioRecord via BioRecordBuilder,
 * signs it, and submits it through ExchangeClient. Consent is verified
 * automatically on the relayer side.
 *
 * Run:
 *   npx ts-node examples/03-submit-biorecord.ts
 *
 * Env (optional):
 *   BSP_RELAYER_URL   — if unset, runs in SIMULATED mode
 *   BSP_BEO_DOMAIN    — default: alice.bsp
 *   BSP_IEO_DOMAIN    — default: genomicslab.bsp
 *   BSP_IEO_PRIVATE_KEY — required for live submission
 */

import { BioRecordBuilder, ExchangeClient } from '../src'
import type { BSPConfig, BioRecord } from '../src/types'
import * as dotenv from 'dotenv'
dotenv.config()

const SIMULATE = !process.env.BSP_RELAYER_URL

const config: BSPConfig = {
  relayerUrl: process.env.BSP_RELAYER_URL || 'https://relayer.bsp.network',
  privateKey: process.env.BSP_IEO_PRIVATE_KEY,
  network: (process.env.BSP_NETWORK as 'mainnet' | 'testnet') || 'testnet',
}

async function main(): Promise<void> {
  console.log('─── Example 03 — Submit BioRecord ───────────────────────────')
  console.log(`Mode: ${SIMULATE ? 'SIMULATED' : 'LIVE'}`)

  const beoDomain = process.env.BSP_BEO_DOMAIN || 'alice.bsp'
  const ieoDomain = process.env.BSP_IEO_DOMAIN || 'genomicslab.bsp'

  console.log(`BEO : ${beoDomain}`)
  console.log(`IEO : ${ieoDomain}`)
  console.log()

  // Build the record
  const record: Partial<BioRecord> = {
    beo_id: `beo_${beoDomain.replace('.', '_')}`,
    ieo_domain: ieoDomain,
    level: 'CORE',
    category: 'METABOLIC',
    taxonomy_code: 'GLU-FAST-001',
    value: 92,
    unit: 'mg/dL',
    collected_at: new Date().toISOString(),
    source: {
      device: 'lab-analyzer-v3',
      method: 'enzymatic',
      operator_id: 'op_42',
    },
  }

  console.log('BioRecord payload:')
  console.log(JSON.stringify(record, null, 2))
  console.log()

  if (SIMULATE) {
    const simulatedResult = {
      record_id: `rec_${Math.random().toString(36).slice(2, 10)}`,
      submitted_at: new Date().toISOString(),
      aptos_tx: `aptos_tx_${Math.random().toString(36).slice(2)}`,
      status: 'ACCEPTED',
    }
    console.log('SubmitResult (simulated):')
    console.log(simulatedResult)
    console.log()
    console.log('Next step: examples/04-destroy-beo.ts')
    return
  }

  if (!config.privateKey) {
    throw new Error('BSP_IEO_PRIVATE_KEY is required for live submission')
  }

  const builder = new BioRecordBuilder(config)
  const signedRecord = builder
    .forBEO(beoDomain)
    .withLevel('CORE')
    .withCategory('METABOLIC')
    .withCode('GLU-FAST-001')
    .withValue(92, 'mg/dL')
    .collectedAt(record.collected_at as string)
    .build()

  const exchange = new ExchangeClient(config)
  const result = await exchange.submitRecord(signedRecord)

  console.log('SubmitResult:')
  console.log(`  record_id    : ${result.record_id}`)
  console.log(`  submitted_at : ${result.submitted_at}`)
  console.log(`  aptos_tx     : ${result.aptos_tx}`)
  console.log(`  status       : ${result.status}`)
  console.log()
  console.log('Next step: examples/04-destroy-beo.ts')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
