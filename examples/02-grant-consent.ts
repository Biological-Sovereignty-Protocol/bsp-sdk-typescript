/**
 * Example 02 — Grant consent from a BEO to an IEO
 *
 * Demonstrates issuing a ConsentToken that authorizes an institution (IEO)
 * to submit and read records for a specific individual (BEO) within a
 * scoped set of intents, categories, and levels.
 *
 * Run:
 *   npx ts-node examples/02-grant-consent.ts
 *
 * Env (optional):
 *   BSP_RELAYER_URL   — if unset, runs in SIMULATED mode
 *   BSP_BEO_DOMAIN    — default: alice.bsp
 *   BSP_IEO_DOMAIN    — default: genomicslab.bsp
 */

import { AccessManager } from '../src'
import type { BSPConfig, ConsentToken } from '../src/types'
import * as dotenv from 'dotenv'
dotenv.config()

const SIMULATE = !process.env.BSP_RELAYER_URL

const config: BSPConfig = {
  relayerUrl: process.env.BSP_RELAYER_URL || 'https://relayer.bsp.network',
  privateKey: process.env.BSP_PRIVATE_KEY,
  network: (process.env.BSP_NETWORK as 'mainnet' | 'testnet') || 'testnet',
}

async function main(): Promise<void> {
  console.log('─── Example 02 — Grant Consent ──────────────────────────────')
  console.log(`Mode: ${SIMULATE ? 'SIMULATED' : 'LIVE'}`)

  const beoDomain = process.env.BSP_BEO_DOMAIN || 'alice.bsp'
  const ieoDomain = process.env.BSP_IEO_DOMAIN || 'genomicslab.bsp'

  const scope = {
    intents: ['SUBMIT_RECORD', 'READ_RECORDS'] as const,
    categories: ['METABOLIC', 'HORMONAL'] as const,
    levels: ['CORE', 'STANDARD'] as const,
    period: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    max_records: 100,
  }

  console.log(`BEO : ${beoDomain}`)
  console.log(`IEO : ${ieoDomain}`)
  console.log(`Scope: ${JSON.stringify(scope, null, 2)}`)
  console.log()

  if (SIMULATE) {
    const simulated: Partial<ConsentToken> = {
      token_id: `tok_${Math.random().toString(36).slice(2, 10)}`,
      beo_id: `beo_${beoDomain.replace('.', '_')}`,
      ieo_domain: ieoDomain,
      granted_at: new Date().toISOString(),
      expires_at: scope.period.end,
      revoked_at: null,
    }
    console.log('ConsentToken (simulated):')
    console.log(simulated)
    console.log()
    console.log('Next step: examples/03-submit-biorecord.ts')
    return
  }

  const access = new AccessManager(config)

  const token = await access.issueConsent({
    beoDomain,
    ieoDomain,
    scope,
  })

  console.log('ConsentToken issued:')
  console.log(`  token_id   : ${token.token_id}`)
  console.log(`  granted_at : ${token.granted_at}`)
  console.log(`  expires_at : ${token.expires_at}`)
  console.log()
  console.log('Next step: examples/03-submit-biorecord.ts')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
