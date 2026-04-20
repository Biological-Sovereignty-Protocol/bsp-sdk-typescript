import nacl from 'tweetnacl'

/**
 * CryptoUtils for Biological Sovereignty Protocol.
 * Handles Ed25519 key generation, deterministic signing, and signature verification.
 */
export interface KeyPair {
    /** 32-byte Ed25519 public key, hex-encoded */
    publicKey: string
    /** 64-byte Ed25519 secret key (seed + public key), hex-encoded */
    privateKey: string
    /** 32-byte random seed — store this offline as your recovery material */
    seed: string
}

export class CryptoUtils {
    /**
     * Generate a new Ed25519 key pair.
     * Keys are generated locally and never transmitted.
     * Store `seed` offline (hardware wallet, paper); store `privateKey` in .env.
     */
    static generateKeyPair(): KeyPair {
        const keypair = nacl.sign.keyPair()
        return {
            publicKey: Buffer.from(keypair.publicKey).toString('hex'),
            privateKey: Buffer.from(keypair.secretKey).toString('hex'),
            seed: Buffer.from(keypair.secretKey.slice(0, 32)).toString('hex'),
        }
    }

    /**
     * Restore a key pair from a 32-byte seed (hex-encoded).
     */
    static keyPairFromSeed(seedHex: string): KeyPair {
        const seed = Buffer.from(seedHex, 'hex')
        if (seed.length !== 32) {
            throw new Error(`Seed must be 32 bytes — got ${seed.length}`)
        }
        const keypair = nacl.sign.keyPair.fromSeed(seed)
        return {
            publicKey: Buffer.from(keypair.publicKey).toString('hex'),
            privateKey: Buffer.from(keypair.secretKey).toString('hex'),
            seed: seedHex,
        }
    }

    /**
     * Generate a cryptographically random nonce (16 bytes, hex-encoded).
     * Required for replay protection on every API request.
     */
    static generateNonce(): string {
        return Buffer.from(nacl.randomBytes(16)).toString('hex')
    }

    /**
     * Signs a JSON payload deterministically using an Ed25519 private key.
     * Uses a sorted JSON stringify to ensure signature consistency.
     * 
     * @param payload Any JavaScript object
     * @param privateKeyHex The Ed25519 private key as a hex string
     * @returns Base64 encoded signature
     */
    static signPayload(payload: Record<string, any>, privateKeyHex: string): string {
        try {
            // 1. Sort object keys deterministically
            const sortedJson = this.stringifyDeterministic(payload)
            const messageBytes = new TextEncoder().encode(sortedJson)

            // 2. Decode hex private key to bytes
            // TweetNaCl expects 64 bytes for Ed25519 signing key (seed + public key).
            const secretKeyBytes = this.hexToBytes(privateKeyHex)
            if (secretKeyBytes.length !== 64) {
                throw new Error(`Invalid private key length. Expected 64 bytes for Ed25519 secret key, got ${secretKeyBytes.length}`)
            }

            // 3. Sign
            const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes)

            // 4. Return as Base64 for transport over HTTP
            return Buffer.from(signatureBytes).toString('base64')
        } catch (error: any) {
            throw new Error(`Failed to sign payload: ${error.message}`)
        }
    }

    /**
     * Verifies a Base64 signature of a JSON payload against an Ed25519 public key.
     * This is strictly matching the deterministic stringify used in signPayload.
     * 
     * @param payload The original JavaScript object
     * @param signatureBase64 The Base64 signature provided by the client
     * @param publicKeyHex The Ed25519 public key of the BEO as a hex string
     * @returns boolean true if valid
     */
    static verifySignature(payload: Record<string, any>, signatureBase64: string, publicKeyHex: string): boolean {
        try {
            const sortedJson = this.stringifyDeterministic(payload)
            const messageBytes = new TextEncoder().encode(sortedJson)

            const signatureBytes = Buffer.from(signatureBase64, 'base64')
            const publicKeyBytes = this.hexToBytes(publicKeyHex)

            if (publicKeyBytes.length !== 32) {
                return false // Invalid public key length
            }

            return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
        } catch {
            // Any format error (bad base64, bad hex) means an invalid signature
            return false
        }
    }

    // --- Helpers ---

    /**
     * Canonical JSON stringify — public for advanced users who need to
     * produce the exact same bytes that Python would, for cross-SDK signing.
     *
     * Matches `json.dumps(obj, separators=(",", ":"), ensure_ascii=False)`
     * after recursively sorting object keys.
     *
     * We avoid `JSON.stringify(sortedObj)` because although V8 currently
     * emits no whitespace, that is not guaranteed by the spec or across
     * engines/versions. Producing the string byte-for-byte removes that risk.
     */
    static canonicalStringify(obj: unknown): string {
        if (obj === null || obj === undefined) {
            return 'null'
        }
        const t = typeof obj
        if (t === 'number') {
            if (Number.isNaN(obj as number)) {
                throw new Error('canonicalStringify: NaN values are not allowed')
            }
            if (!Number.isFinite(obj as number)) {
                throw new Error('canonicalStringify: Infinity values are not allowed')
            }
            return JSON.stringify(obj)
        }
        if (t === 'boolean' || t === 'string') {
            return JSON.stringify(obj)
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map((v) => CryptoUtils.canonicalStringify(v)).join(',') + ']'
        }
        if (t === 'object') {
            const rec = obj as Record<string, unknown>
            const sortedKeys = Object.keys(rec).sort()
            const parts = sortedKeys.map(
                (k) => JSON.stringify(k) + ':' + CryptoUtils.canonicalStringify(rec[k]),
            )
            return '{' + parts.join(',') + '}'
        }
        // bigint / symbol / function — not representable in JSON
        throw new Error(`Cannot canonicalize value of type ${t}`)
    }

    private static stringifyDeterministic(obj: Record<string, any>): string {
        return CryptoUtils.canonicalStringify(obj)
    }

    private static hexToBytes(hex: string): Uint8Array {
        const _hex = hex.replace(/^0x/i, '')
        if (_hex.length % 2 !== 0) {
            throw new Error(`Invalid hex string length: ${_hex.length} (must be even)`)
        }
        const bytes = new Uint8Array(_hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(_hex.substring(i * 2, i * 2 + 2), 16)
        }
        return bytes
    }
}
