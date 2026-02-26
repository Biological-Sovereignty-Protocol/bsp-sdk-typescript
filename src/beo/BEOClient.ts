import { BEO, Guardian, UUID } from '../types'

export interface CreateBEOOptions {
  domain: string
  guardians?: Omit<Guardian, 'accepted' | 'added_at'>[]
}

/**
 * BEOClient — Create and manage Biological Entity Objects on Arweave.
 *
 * BEO creation is open to anyone. No permission from the Ambrósio Institute
 * or any authority is required.
 */
export class BEOClient {
  async create(options: CreateBEOOptions): Promise<BEO> {
    // Implementation: generate key pair, register on BEORegistry (Arweave)
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async resolve(domain: string): Promise<BEO> {
    // Implementation: resolve .bsp domain to BEO via DomainRegistry
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async get(beoId: UUID): Promise<BEO> {
    // Implementation: fetch BEO from Arweave by ID
    throw new Error('Not implemented — install @bsp/sdk when published')
  }

  async isAvailable(domain: string): Promise<boolean> {
    // Implementation: check DomainRegistry for availability
    throw new Error('Not implemented — install @bsp/sdk when published')
  }
}
