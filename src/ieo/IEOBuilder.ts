import { IEO, IEOType, IEOCertification, CertLevel, BSPIntent, UUID, ISO8601, SemVer } from '../types'

export interface IEOBuilderOptions {
    domain: string
    name: string
    ieo_type: IEOType
    jurisdiction: string
    legal_id: string
    contact: string
    website?: string
    country?: string
}

export interface IEOCreateResult {
    ieo: IEO
    ieo_id: UUID
    domain: string
    arweave_tx: string
    private_key: string
    seed_phrase: string
    status: 'ACTIVE'
    warning: string
}

/**
 * IEOBuilder — Create and register Institutional Entity Objects.
 *
 * Any institution can create an IEO without approval.
 * BSP Certification is voluntary — separate step after creation.
 *
 * @example
 * ```typescript
 * const ieo = new IEOBuilder({
 *   domain:       'fleury.bsp',
 *   name:         'Fleury Laboratórios',
 *   ieo_type:     'LABORATORY',
 *   jurisdiction: 'BR',
 *   legal_id:     '60.840.055/0001-31',
 *   contact:      'bsp@fleury.com.br',
 * })
 * const result = await ieo.register()
 * // Store result.private_key in .env as BSP_IEO_PRIVATE_KEY
 * // Store result.seed_phrase offline — never digitally
 * ```
 */
export class IEOBuilder {
    private options: IEOBuilderOptions

    constructor(options: IEOBuilderOptions) {
        this.validate(options)
        this.options = options
    }

    private validate(options: IEOBuilderOptions): void {
        if (!options.domain.endsWith('.bsp')) {
            throw new Error(`IEO domain must end with .bsp — got: "${options.domain}"`)
        }
        if (!options.name || options.name.trim().length < 2) {
            throw new Error('IEO name must be at least 2 characters')
        }
        if (!options.legal_id || options.legal_id.trim().length < 5) {
            throw new Error('legal_id is required (CNPJ, EIN, VAT, etc.)')
        }
        const validTypes: IEOType[] = ['LABORATORY', 'HOSPITAL', 'WEARABLE', 'PHYSICIAN', 'INSURER', 'RESEARCH', 'PLATFORM']
        if (!validTypes.includes(options.ieo_type)) {
            throw new Error(`Invalid ieo_type: "${options.ieo_type}". Must be one of: ${validTypes.join(', ')}`)
        }
    }

    /**
     * Register the IEO on Arweave. Returns keys — store them securely.
     *
     * CRITICAL: The private_key and seed_phrase are returned ONCE.
     * If lost, there is no recovery for institutional keys.
     */
    async register(): Promise<IEOCreateResult> {
        // Implementation: generate Ed25519 key pair, register on IEORegistry (Arweave)
        throw new Error('Not implemented — registry connection required')
    }

    /**
     * Preview the IEO object that would be registered (dry run).
     */
    preview(): Omit<IEOCreateResult, 'private_key' | 'seed_phrase' | 'arweave_tx'> {
        const ieo: IEO = {
            ieo_id: 'preview-only',
            domain: this.options.domain,
            display_name: this.options.name,
            ieo_type: this.options.ieo_type,
            country: this.options.country || this.options.jurisdiction,
            jurisdiction: this.options.jurisdiction,
            legal_id: this.options.legal_id,
            public_key: 'preview-only',
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
        return { ieo, ieo_id: 'preview-only', domain: this.options.domain, status: 'ACTIVE', warning: 'PREVIEW — not registered on-chain' }
    }
}
