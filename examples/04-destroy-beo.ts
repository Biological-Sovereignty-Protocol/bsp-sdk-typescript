/**
 * Example 04 — Destroy / retire a BEO
 *
 * Demonstrates the "sovereign exit" flow: the individual revokes all
 * active consent tokens and then locks the BEO, rendering it permanently
 * inaccessible without the recovery seed phrase.
 *
 * In BSP, a BEO cannot be forcibly deleted on-chain (immutability), but
 * it can be LOCKED. Re-activation requires the seed phrase used at
 * creation time, which is why we always back it up offline.
 *
 * Run:
 *   npx ts-node examples/04-destroy-beo.ts
 *
 * Env (optional):
 *   BSP_RELAYER_URL      — if unset, runs in SIMULATED mode
 *   BSP_BEO_DOMAIN       — default: alice.bsp
 *   BSP_BEO_PRIVATE_KEY  — required for live operation
 */

import { BEOClient, AccessManager } from '../src'
import type { BSPConfig } from '../src/types'
import * as dotenv from 'dotenv'
dotenv.config()

const SIMULATE = !process.env.BSP_RELAYER_URL

const config: BSPConfig = {
  relayerUrl: process.env.BSP_RELAYER_URL || 'https://relayer.bsp.network',
  privateKey: process.env.BSP_BEO_PRIVATE_KEY,
  network: (process.env.BSP_NETWORK as 'mainnet' | 'testnet') || 'testnet',
}

async function main(): Promise<void> {
  console.log('─── Example 04 — Destroy / Lock BEO ─────────────────────────')
  console.log(`Mode: ${SIMULATE ? 'SIMULATED' : 'LIVE'}`)

  const beoDomain = process.env.BSP_BEO_DOMAIN || 'alice.bsp'
  console.log(`BEO: ${beoDomain}`)
  console.log()

  if (SIMULATE) {
    console.log('[SIM] Step 1 — revoke all active consent tokens...')
    console.log('[SIM]   revoked 2 tokens')
    console.log('[SIM] Step 2 — lock BEO on-chain...')
    console.log('[SIM]   beo status: LOCKED')
    console.log('[SIM]   aptos_tx : aptos_tx_' + Math.random().toString(36).slice(2))
    console.log()
    console.log('BEO is now locked. To re-activate, use the recovery seed phrase')
    console.log('with BEOClient.recover(seedPhrase, domain).')
    return
  }

  if (!config.privateKey) {
    throw new Error('BSP_BEO_PRIVATE_KEY is required for live operation')
  }

  // Step 1 — revoke all active consent
  console.log('Step 1 — revoking all active consent tokens...')
  const access = new AccessManager(config)
  const tokens = await access.listActiveTokens(beoDomain)
  for (const t of tokens) {
    await access.revokeConsent(t.token_id)
    console.log(`  revoked: ${t.token_id}`)
  }
  console.log(`  total revoked: ${tokens.length}`)
  console.log()

  // Step 2 — lock the BEO
  console.log('Step 2 — locking BEO...')
  const beoClient = new BEOClient(config)
  const result = await beoClient.lock(beoDomain)
  console.log(`  status   : ${result.status}`)
  console.log(`  aptos_tx : ${result.aptos_tx}`)
  console.log()
  console.log('BEO locked. The 24-word seed phrase is the only way back in.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
