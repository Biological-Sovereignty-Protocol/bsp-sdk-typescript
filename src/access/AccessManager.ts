import { BSPConfig, ConsentToken, TokenScope, BSPIntent, UUID, ISO8601 } from '../types'

export interface VerifyConsentOptions {
  beo_domain: string
  token_id: string
  intent: BSPIntent
  category?: string
}

export interface VerifyConsentResult {
  valid: boolean
  reason?: string
  token?: ConsentToken
}

export interface IssueConsentOptions {
  ieo_domain: string
  scope: {
    intents: BSPIntent[]
    categories: string[]
    period?: { from: ISO8601 | null; to: ISO8601 | null }
    max_records?: number
  }
  expires_in_days?: number   // null = persistent
  reason?: string
}

export interface RevokeConsentResult {
  token_id: string
  revoked_at: ISO8601
  arweave_tx: string
}

/**
 * AccessManager — Manage ConsentTokens for BSP access.
 *
 * All BSP data access requires explicit consent from the BEO holder,
 * enforced by the AccessControl smart contract on Arweave.
 *
 * @example
 * ```typescript
 * // From a LABORATORY's perspective — verify before submitting
 * const check = await client.access.verifyConsent({
 *   beo_domain: 'patient.bsp',
 *   token_id:   'tok_...',
 *   intent:     'SUBMIT_RECORD',
 *   category:   'BSP-HM',
 * })
 * if (!check.valid) throw new Error(check.reason)
 *
 * // From a BEO HOLDER's perspective — issue consent to a physician
 * const token = await client.access.issueConsent({
 *   ieo_domain: 'dr-carlos.bsp',
 *   scope: {
 *     intents:    ['READ_RECORDS'],
 *     categories: ['BSP-LA', 'BSP-CV'],
 *   },
 *   expires_in_days: 90,
 * })
 * ```
 */
export class AccessManager {
  constructor(private config: BSPConfig) { }

  /**
   * Verify if a ConsentToken is valid for a specific intent.
   * Call this before attempting any data operation.
   * Checks: token exists, not revoked, not expired, intent in scope, category in scope.
   */
  async verifyConsent(options: VerifyConsentOptions): Promise<VerifyConsentResult> {
    // Implementation: query AccessControl smart contract on Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Issue a ConsentToken to an IEO (BEO holder operation only).
   * Signed by the holder's private key. Written to Arweave.
   */
  async issueConsent(options: IssueConsentOptions): Promise<ConsentToken> {
    // Implementation: sign token with holder's private key, write to Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Revoke a ConsentToken — immediate on-chain effect.
   * All subsequent operations using this token will fail with TOKEN_REVOKED.
   */
  async revokeConsent(tokenId: string): Promise<RevokeConsentResult> {
    // Implementation: post CONSENT_REVOKE transaction to Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Revoke ALL active tokens from a specific IEO.
   */
  async revokeAllFromIEO(ieo_domain: string): Promise<{ revoked_count: number }> {
    // Implementation: query all tokens for this IEO, revoke each
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Emergency: Revoke ALL active consent tokens from the BEO.
   */
  async revokeAllTokens(): Promise<{ revoked_count: number }> {
    // Implementation: query all active tokens, bulk revoke
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Get the full audit log of tokens for this BEO.
   */
  async getTokenHistory(beo_domain: string): Promise<ConsentToken[]> {
    // Implementation: query Arweave for all CONSENT_ISSUE and CONSENT_REVOKE transactions
    throw new Error('Not implemented — registry connection required')
  }
}
