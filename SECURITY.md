# Security Policy

## Reporting a Vulnerability

The BSP team takes security seriously. If you discover a vulnerability,
please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Email: security@biologicalsovereigntyprotocol.com
PGP Key: [link to public key]

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline
- Acknowledgement: within 48 hours
- Initial assessment: within 7 days
- Fix timeline communicated: within 14 days
- Public disclosure: after fix is deployed (coordinated with reporter)

## Scope

### In Scope
- SDK cryptographic implementation (key generation, signing, verification)
- ConsentToken construction and serialization
- Key derivation (BIP39 + PBKDF2) implementation
- Ed25519 signing and verification logic
- Key export/import encryption routines

### Out of Scope
- Third-party dependencies (report to their maintainers)
- Theoretical vulnerabilities without proof-of-concept
- Social engineering attacks
- Physical access attacks

## Security Model

BSP is built on these security guarantees:
1. **Keys never leave the device** — private keys are generated and stored in IndexedDB, never transmitted
2. **Consent is cryptographic** — ConsentTokens are Ed25519-signed and verified on-chain
3. **Relayer cannot forge** — the relayer pays gas but cannot modify user-signed payloads
4. **Recovery requires threshold** — Shamir 2-of-3 guardian threshold prevents single point of failure
5. **Arweave permanence** — consent history is immutable and auditable forever

## Cryptography

- Key algorithm: Ed25519 (tweetnacl)
- Key derivation: BIP39 + PBKDF2
- Key export encryption: AES-256-GCM, PBKDF2-SHA256 (600,000 iterations)
- On-chain storage: Arweave via AO

## Bug Bounty

We do not currently have a formal bug bounty program. Responsible disclosure
is recognized in our public CHANGELOG and, for critical findings, we offer
protocol recognition as a Security Contributor.

## Known Limitations

- ConsentTokens are stored on Arweave (permanent). Revocation marks them
  revoked but does not erase them from the chain.
- The relayer wallet is a centralization point for transaction submission.
  Future protocol versions will support direct user submission.
- Guardian PII (contact info) stored on Arweave is permanent.
