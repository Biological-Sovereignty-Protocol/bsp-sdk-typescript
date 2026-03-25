/**
 * BSP Full Flow Example
 *
 * Demonstrates: BEO creation → IEO creation → ConsentToken grant
 *               → BioRecord submission → Record query → Consent revocation
 *
 * Run: npx ts-node examples/full-flow.ts
 * Requirements: BSP_RELAYER_URL in .env (optional for simulated flow)
 *
 * NOTE: The BSP registry is in active development. This example uses a
 * simulated mode that shows the full flow without a live Arweave connection.
 * When the registry is live, remove the SIMULATE_MODE flag.
 */

import {
  BEOClient,
  IEOBuilder,
  BioRecordBuilder,
  ExchangeClient,
  AccessManager,
  CryptoUtils,
} from '../src'
import type { BSPConfig, BEO, IEO, ConsentToken, BioRecord } from '../src/types'
import * as dotenv from 'dotenv'
dotenv.config()

// ─── Config ──────────────────────────────────────────────────────────────────

const SIMULATE_MODE = !process.env.BSP_RELAYER_URL

const config: BSPConfig = {
  relayerUrl: process.env.BSP_RELAYER_URL || 'https://relayer.bsp.network',
  privateKey: process.env.BSP_PRIVATE_KEY,
  network: (process.env.BSP_NETWORK as 'mainnet' | 'testnet') || 'testnet',
}

// ─── Simulation helpers (replace with real SDK calls when registry is live) ──

function simulatedBEO(domain: string): { beo: BEO; beo_id: string; arweave_tx: string; private_key: string; seed_phrase: string; warning: string } {
  const beo: BEO = {
    beo_id: `beo_${domain.replace('.', '_')}_${Date.now()}`,
    domain,
    public_key: `ed25519_pub_${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    version: '1.0.0',
    status: 'ACTIVE',
    recovery: null,
  }
  return {
    beo,
    beo_id: beo.beo_id,
    arweave_tx: `arweave_tx_${Math.random().toString(36).slice(2)}`,
    private_key: `BSP_BEO_PRIVATE_KEY_${Math.random().toString(36).slice(2)}`,
    seed_phrase: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
    warning: 'SIMULATED — store private_key in .env as BSP_BEO_PRIVATE_KEY, seed_phrase offline.',
  }
}

function simulatedIEO(domain: string, name: string): { ieo: IEO; ieo_id: string; arweave_tx: string; private_key: string; seed_phrase: string; warning: string } {
  const ieo: IEO = {
    ieo_id: `ieo_${domain.replace('.', '_')}_${Date.now()}`,
    domain,
    display_name: name,
    ieo_type: 'LAB',
    country: 'BR',
    jurisdiction: 'BR',
    legal_id: '00.000.000/0001-00',
    public_key: `ed25519_pub_${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    version: '1.0.0',
    certification: {
      level: 'UNCERTIFIED',
      granted_at: null,
      expires_at: null,
      categories: [],
      intents: [],
    },
    status: 'ACTIVE',
  }
  return {
    ieo,
    ieo_id: ieo.ieo_id,
    arweave_tx: `arweave_tx_${Math.random().toString(36).slice(2)}`,
    private_key: `BSP_IEO_PRIVATE_KEY_${Math.random().toString(36).slice(2)}`,
    seed_phrase: 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima',
    warning: 'SIMULATED — store private_key in .env as BSP_IEO_PRIVATE_KEY, seed_phrase offline.',
  }
}

function simulatedConsentToken(beo_id: string, ieo_domain: string): ConsentToken {
  const now = new Date()
  const expires = new Date(now)
  expires.setDate(expires.getDate() + 90)
  return {
    token_id: `tok_${Math.random().toString(36).slice(2, 10)}`,
    beo_id,
    ieo_domain,
    granted_at: now.toISOString(),
    expires_at: expires.toISOString(),
    revoked_at: null,
    status: 'ACTIVE',
    scope: {
      intents: ['READ_RECORDS', 'SUBMIT_RECORD'],
      categories: ['BSP-HM', 'BSP-LA', 'BSP-CV'],
      period: { from: null, to: null },
      max_records: null,
    },
  }
}

// ─── Main flow ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║  BSP Full Flow Example                     ║')
  console.log('║  Biological Sovereignty Protocol — SDK     ║')
  console.log(`╚════════════════════════════════════════════╝`)
  console.log(`\nMode: ${SIMULATE_MODE ? 'SIMULATED (no registry connection)' : 'LIVE (connecting to ' + config.relayerUrl + ')'}`)
  console.log('Network:', config.network)

  // ─── Step 1: Create user identity (BEO) ──────────────────────────────────

  console.log('\n── Step 1: Create BEO for alice.bsp ─────────────────────────────')

  const beoClient = new BEOClient(config)
  let beoResult: Awaited<ReturnType<typeof beoClient.create>>

  if (SIMULATE_MODE) {
    beoResult = simulatedBEO('alice.bsp') as any
  } else {
    const isAvailable = await beoClient.isAvailable('alice.bsp')
    if (!isAvailable) {
      console.log('  Domain alice.bsp already taken — using existing BEO in demo mode.')
      beoResult = simulatedBEO('alice.bsp') as any
    } else {
      beoResult = await beoClient.create({
        domain: 'alice.bsp',
        recovery: {
          guardians: [
            { name: 'Guardian A', contact: 'guardian-a.bsp', public_key: 'pubkey_a', role: 'primary' },
            { name: 'Guardian B', contact: 'guardian-b.bsp', public_key: 'pubkey_b', role: 'secondary' },
          ],
          threshold: 2,
        },
      })
    }
  }

  const { beo, beo_id, arweave_tx: beoTx } = beoResult
  console.log('  BEO created:')
  console.log(`    domain:      ${beo.domain}`)
  console.log(`    beo_id:      ${beo_id}`)
  console.log(`    arweave_tx:  ${beoTx}`)
  console.log(`  ⚠  ${beoResult.warning}`)

  // ─── Step 2: Create institution identity (IEO) ───────────────────────────

  console.log('\n── Step 2: Create IEO for genomicslab.bsp ───────────────────────')

  let ieoResult: Awaited<ReturnType<IEOBuilder['register']>>

  if (SIMULATE_MODE) {
    ieoResult = simulatedIEO('genomicslab.bsp', 'Genomics Lab Brasil') as any
  } else {
    const ieoBuilder = new IEOBuilder({
      domain: 'genomicslab.bsp',
      name: 'Genomics Lab Brasil',
      ieo_type: 'LAB',
      jurisdiction: 'BR',
      legal_id: '12.345.678/0001-99',
      contact: 'bsp@genomicslab.com.br',
      website: 'https://genomicslab.com.br',
      country: 'BR',
    })

    // Preview first — dry run, no on-chain write
    const preview = ieoBuilder.preview()
    console.log('  IEO preview:')
    console.log(`    domain:    ${preview.domain}`)
    console.log(`    type:      ${preview.ieo.ieo_type}`)
    console.log(`    certified: ${preview.ieo.certification.level}`)

    ieoResult = await ieoBuilder.register()
  }

  const { ieo, ieo_id, arweave_tx: ieoTx } = ieoResult
  console.log('  IEO registered:')
  console.log(`    domain:      ${ieo.domain}`)
  console.log(`    ieo_id:      ${ieo_id}`)
  console.log(`    arweave_tx:  ${ieoTx}`)
  console.log(`  ⚠  ${ieoResult.warning}`)

  // ─── Step 3: Grant consent ────────────────────────────────────────────────

  console.log('\n── Step 3: Alice grants consent to genomicslab.bsp ──────────────')

  const accessManager = new AccessManager(config)
  let token: ConsentToken

  if (SIMULATE_MODE) {
    token = simulatedConsentToken(beo_id, 'genomicslab.bsp')
  } else {
    token = await accessManager.issueConsent({
      ieo_domain: 'genomicslab.bsp',
      scope: {
        intents: ['READ_RECORDS', 'SUBMIT_RECORD'],
        categories: ['BSP-HM', 'BSP-LA', 'BSP-CV'],
        period: { from: null, to: null },
        max_records: null,
      },
      expires_in_days: 90,
      reason: 'Genetic analysis — full panel',
    })
  }

  console.log('  ConsentToken issued:')
  console.log(`    token_id:   ${token.token_id}`)
  console.log(`    ieo:        ${token.ieo_domain}`)
  console.log(`    expires_at: ${token.expires_at}`)
  console.log(`    intents:    ${token.scope.intents.join(', ')}`)
  console.log(`    categories: ${token.scope.categories.join(', ')}`)

  // ─── Step 4: Submit BioRecord ─────────────────────────────────────────────

  console.log('\n── Step 4: genomicslab.bsp submits a BioRecord ──────────────────')

  // Build the record using the fluent builder
  let record: BioRecord
  try {
    record = new BioRecordBuilder('genomicslab.bsp')
      .setBeoId(beo_id)
      .setBiomarker('BSP-HM-001')   // Hemoglobin — Core level
      .setValue(13.8)
      .setUnit('g/dL')
      .setCollectionTime('2026-03-24T08:00:00Z')
      .setRefRange({
        optimal: '13.5-17.5',
        functional: '12.0-17.5',
        deficiency: '<12.0',
        toxicity: null,
        unit: 'g/dL',
      })
      .setConfidence(0.99)
      .setMethod('spectrophotometry')
      .setEquipment('Sysmex XN-3000')
      .build()
    console.log('  BioRecord built:')
    console.log(`    record_id:  ${record.record_id}`)
    console.log(`    biomarker:  ${record.biomarker}`)
    console.log(`    value:      ${record.value} ${record.unit}`)
    console.log(`    collected:  ${record.collected_at}`)
    console.log(`    confidence: ${record.confidence}`)
  } catch (err) {
    console.error('  Failed to build BioRecord:', (err as Error).message)
    throw err
  }

  const exchangeClient = new ExchangeClient(config)
  let submitResult: Awaited<ReturnType<ExchangeClient['submitRecords']>>

  if (SIMULATE_MODE) {
    submitResult = {
      submitted_count: 1,
      arweave_txs: [`arweave_tx_record_${Math.random().toString(36).slice(2)}`],
      errors: [],
    } as any
  } else {
    submitResult = await exchangeClient.submitRecords({
      targetBeo: 'alice.bsp',
      records: [record],
      consentToken: token.token_id,
    })
  }

  console.log('  Submitted:')
  console.log(`    count:       ${submitResult.submitted_count}`)
  console.log(`    arweave_txs: ${(submitResult as any).arweave_txs.join(', ')}`)

  // ─── Step 5: Query records ────────────────────────────────────────────────

  console.log('\n── Step 5: Query BioRecords from alice.bsp ──────────────────────')

  let readResult: Awaited<ReturnType<ExchangeClient['readRecords']>>

  if (SIMULATE_MODE) {
    readResult = {
      records: [record],
      total: 1,
      offset: 0,
      limit: 50,
    } as any
  } else {
    readResult = await exchangeClient.readRecords({
      targetBeo: 'alice.bsp',
      consentToken: token.token_id,
      filters: {
        categories: ['BSP-HM'],
        from: '2026-01-01T00:00:00Z',
        to: '2026-12-31T23:59:59Z',
        limit: 50,
        offset: 0,
      },
    })
  }

  console.log(`  Found ${readResult.total} record(s):`)
  for (const r of readResult.records) {
    console.log(`    [${r.biomarker}] ${r.value} ${r.unit} — collected ${r.collected_at}`)
  }

  // ─── Step 6: Revoke consent ───────────────────────────────────────────────

  console.log('\n── Step 6: Alice revokes the ConsentToken ────────────────────────')

  let revokeResult: Awaited<ReturnType<AccessManager['revokeConsent']>>

  if (SIMULATE_MODE) {
    revokeResult = {
      token_id: token.token_id,
      revoked_at: new Date().toISOString(),
      arweave_tx: `arweave_tx_revoke_${Math.random().toString(36).slice(2)}`,
    }
  } else {
    revokeResult = await accessManager.revokeConsent(token.token_id)
  }

  console.log('  Token revoked:')
  console.log(`    token_id:   ${revokeResult.token_id}`)
  console.log(`    revoked_at: ${revokeResult.revoked_at}`)
  console.log(`    arweave_tx: ${revokeResult.arweave_tx}`)

  // ─── Step 7: Verify revocation ────────────────────────────────────────────

  console.log('\n── Step 7: Verify token is now invalid ───────────────────────────')

  let verifyResult: Awaited<ReturnType<AccessManager['verifyConsent']>>

  if (SIMULATE_MODE) {
    verifyResult = {
      valid: false,
      reason: 'TOKEN_REVOKED: token was revoked at ' + revokeResult.revoked_at,
      token: { ...token, status: 'REVOKED', revoked_at: revokeResult.revoked_at },
    }
  } else {
    verifyResult = await accessManager.verifyConsent({
      beo_domain: 'alice.bsp',
      token_id: token.token_id,
      intent: 'READ_RECORDS',
      category: 'BSP-HM',
    })
  }

  console.log(`  Token valid: ${verifyResult.valid}`)
  if (!verifyResult.valid) {
    console.log(`  Reason: ${verifyResult.reason}`)
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║  Flow complete                             ║')
  console.log('╠════════════════════════════════════════════╣')
  console.log(`║  BEO:    ${beo.domain.padEnd(34)}║`)
  console.log(`║  IEO:    ${ieo.domain.padEnd(34)}║`)
  console.log(`║  Token:  ${token.token_id.padEnd(34)}║`)
  console.log(`║  Record: BSP-HM-001 · ${String(record.value).padEnd(27)}║`)
  console.log(`║  Revoked: ${String(revokeResult.revoked_at).slice(0, 10).padEnd(33)}║`)
  console.log('╚════════════════════════════════════════════╝\n')
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  if (err.stack) console.error(err.stack)
  process.exit(1)
})
