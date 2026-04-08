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
     * @param privateKeyHex The Ed25519 private key as a hex string (from Arweave Wallet)
     * @returns Base64 encoded signature
     */
    static signPayload(payload: Record<string, any>, privateKeyHex: string): string {
        try {
            // 1. Sort object keys deterministically
            const sortedJson = this.stringifyDeterministic(payload)
            const messageBytes = new TextEncoder().encode(sortedJson)

            // 2. Decode hex private key to bytes
            // AO/Arweave wallet produces a raw 64-byte key or similar. TweetNaCl expects 64 bytes for signing key.
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

    private static stringifyDeterministic(obj: Record<string, any>): string {
        const sortedObj = this.sortObjectKeys(obj)
        return JSON.stringify(sortedObj)
    }

    private static sortObjectKeys(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj
        }

        if (Array.isArray(obj)) {
            return obj.map(CryptoUtils.sortObjectKeys)
        }

        const sortedKeys = Object.keys(obj).sort()
        const result: Record<string, any> = {}

        for (const key of sortedKeys) {
            result[key] = CryptoUtils.sortObjectKeys(obj[key])
        }

        return result
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
