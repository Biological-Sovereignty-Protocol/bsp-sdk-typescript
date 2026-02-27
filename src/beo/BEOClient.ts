import { BEO, UUID, BSPConfig, RecoveryConfig } from '../types'

export interface CreateBEOOptions {
  domain: string
  recovery?: {
    guardians: Array<{
      name: string
      contact: string
      public_key: string
      role: 'primary' | 'secondary' | 'tertiary'
    }>
    threshold?: number
  }
}

export interface CreateBEOResult {
  beo: BEO
  beo_id: UUID
  domain: string
  arweave_tx: string
  private_key: string
  seed_phrase: string
  warning: string
}

/**
 * BEOClient — Create and manage Biological Entity Objects on Arweave.
 *
 * BEO creation is open to anyone. No permission from the Ambrósio Institute
 * or any authority is required.
 *
 * @example
 * ```typescript
 * const client = new BEOClient(config)
 *
 * // Check if a domain is available
 * const available = await client.isAvailable('andre.bsp')
 *
 * // Create a BEO
 * const result = await client.create({
 *   domain: 'andre.bsp',
 *   recovery: {
 *     guardians: [
 *       { name: 'Maria', contact: 'maria.bsp',   public_key: '...', role: 'primary' },
 *       { name: 'João',  contact: 'joao.bsp',    public_key: '...', role: 'secondary' },
 *       { name: 'Ana',   contact: 'ana.bsp',     public_key: '...', role: 'tertiary' },
 *     ],
 *     threshold: 2,
 *   }
 * })
 * // ⚠️ Store seed_phrase offline — never digitally
 * // ⚠️ Store private_key in .env as BSP_BEO_PRIVATE_KEY
 * ```
 */
export class BEOClient {
  constructor(private config: BSPConfig) { }

  /**
   * Create a new BEO. Generates an Ed25519 key pair locally.
   * Keys are returned ONCE — store them immediately and securely.
   */
  async create(options: CreateBEOOptions): Promise<CreateBEOResult> {
    if (!options.domain.endsWith('.bsp')) {
      throw new Error(`BEO domain must end with .bsp — got: "${options.domain}"`)
    }
    const isAvailable = await this.isAvailable(options.domain)
    if (!isAvailable) {
      throw new Error(`Domain "${options.domain}" is already registered`)
    }
    // Implementation: generate Ed25519 key pair locally, register on BEORegistry (Arweave)
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Resolve a .bsp domain to its full BEO object.
   */
  async resolve(domain: string): Promise<BEO> {
    // Implementation: query DomainRegistry then BEORegistry on Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Get a BEO by its UUID.
   */
  async get(beoId: UUID): Promise<BEO> {
    // Implementation: fetch BEO from BEORegistry on Arweave by ID
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Check if a .bsp domain is available for registration.
   */
  async isAvailable(domain: string): Promise<boolean> {
    // Implementation: query DomainRegistry on Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Lock a BEO temporarily — no reads or writes permitted while locked.
   * Only the holder can unlock.
   */
  async lock(reason?: string): Promise<{ locked_at: string; arweave_tx: string }> {
    // Implementation: post BEO_LOCK transaction to Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Unlock a previously locked BEO.
   */
  async unlock(): Promise<{ unlocked_at: string; arweave_tx: string }> {
    // Implementation: post BEO_UNLOCK transaction to Arweave
    throw new Error('Not implemented — registry connection required')
  }

  /**
   * Update Social Recovery guardian configuration.
   */
  async updateRecovery(config: RecoveryConfig): Promise<{ arweave_tx: string }> {
    if (config.threshold < 1 || config.threshold > config.guardians.length) {
      throw new Error(`threshold must be between 1 and ${config.guardians.length}`)
    }
    // Implementation: sign and post RECOVERY_UPDATE transaction to Arweave
    throw new Error('Not implemented — registry connection required')
  }
}
