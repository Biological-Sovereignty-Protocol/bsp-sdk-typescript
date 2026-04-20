/**
 * Example 01 — Create a BEO (Biological Entity Object)
 *
 * Demonstrates how to create a new BEO, capture its identifiers,
 * and safely store the returned private key / seed phrase.
 *
 * Run:
 *   npx ts-node examples/01-create-beo.ts
 *
 * Env (optional):
 *   BSP_RELAYER_URL   — if unset, runs in SIMULATED mode
 *   BSP_NETWORK       — "mainnet" | "testnet" (default: testnet)
 */

import { BEOClient } from '../src'
import type { BSPConfig } from '../src/types'
import * as dotenv from 'dotenv'
dotenv.config()

const SIMULATE = !process.env.BSP_RELAYER_URL

const config: BSPConfig = {
  relayerUrl: process.env.BSP_RELAYER_URL || 'https://relayer.bsp.network',
  privateKey: process.env.BSP_PRIVATE_KEY,
  network: (process.env.BSP_NETWORK as 'mainnet' | 'testnet') || 'testnet',
}

async function main(): Promise<void> {
  console.log('─── Example 01 — Create BEO ─────────────────────────────────')
  console.log(`Mode: ${SIMULATE ? 'SIMULATED (no on-chain write)' : 'LIVE'}`)
  console.log(`Network: ${config.network}`)
  console.log()

  const domain = process.env.BSP_BEO_DOMAIN || 'alice.bsp'

  if (SIMULATE) {
    console.log(`[SIM] Would create BEO for domain: ${domain}`)
    const simulated = {
      beo_id: `beo_${domain.replace('.', '_')}_${Date.now()}`,
      domain,
      aptos_tx: `aptos_tx_${Math.random().toString(36).slice(2)}`,
      private_key: `BSP_BEO_PRIVATE_KEY_${Math.random().toString(36).slice(2)}`,
      seed_phrase: 'word1 word2 ... word24',
    }
    console.log()
    console.log('BEO (simulated):')
    console.log(`  beo_id      : ${simulated.beo_id}`)
    console.log(`  domain      : ${simulated.domain}`)
    console.log(`  aptos_tx    : ${simulated.aptos_tx}`)
    console.log(`  private_key : ${simulated.private_key}`)
    console.log(`  seed_phrase : ${simulated.seed_phrase}`)
    console.log()
    console.log('⚠  Store private_key in .env as BSP_BEO_PRIVATE_KEY.')
    console.log('⚠  Write the 24-word seed_phrase on paper and keep it offline.')
    return
  }

  const beoClient = new BEOClient(config)

  console.log(`Creating BEO for: ${domain}`)
  const result = await beoClient.create({ domain })

  console.log()
  console.log('BEO created:')
  console.log(`  beo_id   : ${result.beo.beo_id}`)
  console.log(`  domain   : ${result.beo.domain}`)
  console.log(`  status   : ${result.beo.status}`)
  console.log(`  aptos_tx : ${result.aptos_tx}`)
  console.log()
  console.log('Next step: examples/02-grant-consent.ts')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
