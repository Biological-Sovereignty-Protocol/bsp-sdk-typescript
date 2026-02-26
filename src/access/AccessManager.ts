import { ConsentToken, BSPIntent } from '../types'

export interface RequestConsentOptions {
  intents: BSPIntent[]
  categories: string[]
  expiresIn?: number  // seconds, null = persistent
  reason?: string
}

/**
 * AccessManager — Manage consent tokens for BSP data access.
 *
 * All BSP data access requires explicit consent from the BEO holder,
 * enforced by the AccessControl smart contract on Arweave.
 */
export class AccessManager {
  constructor(private ieoId: string) {}

  async getToken(beoId: string): Promise<ConsentToken | null> {
    // Implementation: retrieve stored token for this BEO/IEO pair
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async requestConsent(beoId: string, options: RequestConsentOptions): Promise<{ request_id: string }> {
    // Implementation: send consent request to BEO holder
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async waitForApproval(requestId: string, timeoutMs?: number): Promise<ConsentToken> {
    // Implementation: poll for consent approval
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async revokeToken(tokenId: string): Promise<void> {
    // Implementation: revoke token on-chain
    throw new Error('Not implemented — install @bsp/sdk when published')
  }
}
