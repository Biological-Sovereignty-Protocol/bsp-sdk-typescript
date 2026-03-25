# Publishing @bsp/sdk

## Prerequisites

- npm account with access to the `@bsp` organization
- `NPM_TOKEN` set in GitHub Secrets (Settings → Secrets → Actions)
- Write access to the repository (for tagging)

---

## Manual publish

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Run: `npm run build`
4. Run: `npm test`
5. Commit: `git commit -m "chore: release v1.x.x"`
6. Tag: `git tag v1.x.x`
7. Push: `git push origin main --tags`
8. GitHub Actions picks up the tag and publishes automatically

To verify the publish succeeded:

```bash
npm view @bsp/sdk versions
```

---

## Automated publish (GitHub Actions)

The workflow at `.github/workflows/publish.yml` triggers on any tag matching `v*.*.*`.

It runs `npm run build && npm test && npm publish --access public` using the `NPM_TOKEN` secret.

If the publish fails, check:
- The token has not expired (npm tokens expire after 1 year by default)
- The version in `package.json` does not already exist on npm (npm rejects duplicate versions)
- The build and tests pass locally before tagging

---

## Versioning

Follow semantic versioning strictly. Consumers pin to `^1.x.x` — breaking the contract has immediate ecosystem consequences.

| Bump | When | Example |
|---|---|---|
| **Patch** `1.0.x` | Bug fixes, documentation, internal refactors with no API change | Fix wrong field name in `BioRecord` type |
| **Minor** `1.x.0` | New features that are backward compatible | Add `ExchangeClient.queryRecords()` |
| **Major** `x.0.0` | Breaking changes to public API | Rename `createBEO` to `registerBEO`, change method signatures |

When in doubt: if existing code breaks after the update, it is a major. If it just gains new capabilities, it is a minor.

---

## Pre-publish checklist

- [ ] `CHANGELOG.md` updated with date and version
- [ ] Version bumped in `package.json`
- [ ] `npm run build` passes cleanly
- [ ] `npm test` passes with no failures
- [ ] `.env.example` up to date (any new env vars added?)
- [ ] Public API changes reflected in `README.md`
- [ ] No `console.log` or debug code left in `src/`
- [ ] `dist/` excluded from git (should be in `.gitignore`, published via npm only)

---

## Canary / pre-release

For testing a release candidate before promoting to `latest`:

```bash
# Tag with pre-release identifier
git tag v1.3.0-rc.1
git push origin v1.3.0-rc.1

# Publish manually with canary tag
npm publish --tag canary --access public
```

Consumers install it explicitly:

```bash
npm install @bsp/sdk@canary
```

Promote to `latest` when stable:

```bash
npm dist-tag add @bsp/sdk@1.3.0-rc.1 latest
```

---

## Deprecating old versions

If a version has a critical bug, deprecate it — do not unpublish (npm strongly discourages unpublishing).

```bash
npm deprecate @bsp/sdk@1.2.0 "Critical bug in consent verification — upgrade to 1.2.1"
```

---

*Maintained by the Ambrósio Institute. Questions: open an issue in the repository.*
