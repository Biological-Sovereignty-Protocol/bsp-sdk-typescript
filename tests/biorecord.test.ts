import { BioRecordBuilder } from '../src/biorecord/BioRecordBuilder'
import { TaxonomyResolver } from '../src/biorecord/TaxonomyResolver'

// ─── TaxonomyResolver ────────────────────────────────────────────────────────

describe('TaxonomyResolver', () => {
    const resolver = new TaxonomyResolver()

    test('isValidCode — accepts valid BSP codes', () => {
        expect(resolver.isValidCode('BSP-HM-001')).toBe(true)
        expect(resolver.isValidCode('BSP-LA-003')).toBe(true)
        expect(resolver.isValidCode('BSP-DV-001')).toBe(true)
        expect(resolver.isValidCode('BSP-GL-001')).toBe(true)
    })

    test('isValidCode — rejects invalid formats', () => {
        expect(resolver.isValidCode('HM-001')).toBe(false)       // missing BSP prefix
        expect(resolver.isValidCode('BSP-HM-1')).toBe(false)     // wrong number format
        expect(resolver.isValidCode('BSP-XX-001')).toBe(false)   // unknown category
        expect(resolver.isValidCode('')).toBe(false)
        expect(resolver.isValidCode('BSP-HM')).toBe(false)       // no biomarker number
    })

    test('getLevel — returns correct level for each taxonomy tier', () => {
        expect(resolver.getLevel('BSP-LA-001')).toBe('CORE')
        expect(resolver.getLevel('BSP-CV-001')).toBe('CORE')
        expect(resolver.getLevel('BSP-HM-001')).toBe('STANDARD')
        expect(resolver.getLevel('BSP-GL-001')).toBe('STANDARD')
        expect(resolver.getLevel('BSP-GN-001')).toBe('EXTENDED')
        expect(resolver.getLevel('BSP-DV-001')).toBe('DEVICE')
    })

    test('getLevel — accepts category codes directly', () => {
        expect(resolver.getLevel('BSP-HM')).toBe('STANDARD')
        expect(resolver.getLevel('BSP-LA')).toBe('CORE')
    })

    test('getLevel — throws for unknown categories', () => {
        expect(() => resolver.getLevel('BSP-XX')).toThrow('Unknown BSP category')
    })

    test('listCategories — returns all 25 categories', () => {
        const categories = resolver.listCategories()
        expect(categories.length).toBe(25)
        expect(categories.every(c => c.code && c.level && c.name)).toBe(true)
    })

    test('listByLevel — filters by taxonomy level', () => {
        const core = resolver.listByLevel('CORE')
        const standard = resolver.listByLevel('STANDARD')
        const extended = resolver.listByLevel('EXTENDED')
        const device = resolver.listByLevel('DEVICE')

        expect(core.length).toBe(9)
        expect(standard.length).toBe(9)
        expect(extended.length).toBe(6)
        expect(device.length).toBe(1)
        expect(core.length + standard.length + extended.length + device.length).toBe(25)
    })

    test('getCategory — returns category metadata', () => {
        const cat = resolver.getCategory('BSP-HM')
        expect(cat).not.toBeNull()
        expect(cat!.level).toBe('STANDARD')
        expect(cat!.name).toBe('Hematology')
    })

    test('getCategory — returns null for unknown codes', () => {
        expect(resolver.getCategory('BSP-XX')).toBeNull()
    })
})

// ─── BioRecordBuilder ────────────────────────────────────────────────────────

describe('BioRecordBuilder', () => {
    const IEO_DOMAIN = 'fleury.bsp'
    const TEST_BEO_ID = 42n
    const PREV_RECORD_ID = 17n

    const buildValid = () =>
        new BioRecordBuilder(IEO_DOMAIN)
            .setBeoId(TEST_BEO_ID)
            .setBiomarker('BSP-HM-001')
            .setValue(13.8)
            .setUnit('g/dL')
            .setCollectionTime('2026-02-26T08:00:00Z')

    test('build() — produces valid BioRecord for known code', () => {
        const record = buildValid().build()
        expect(record.beo_id).toBe(TEST_BEO_ID)
        expect(typeof record.beo_id).toBe('bigint')
        expect(record.biomarker).toBe('BSP-HM-001')
        expect(record.category).toBe('BSP-HM')
        expect(record.level).toBe('STANDARD')
        expect(record.value).toBe(13.8)
        expect(record.unit).toBe('g/dL')
        expect(record.status).toBe('ACTIVE')
        expect(record.supersedes).toBeNull()
        expect(record.submitted_at).toBeTruthy()
    })

    test('setBiomarker() — throws for invalid BSP code', () => {
        expect(() =>
            new BioRecordBuilder(IEO_DOMAIN).setBiomarker('INVALID-CODE')
        ).toThrow('Invalid BSP biomarker code')
    })

    test('setBiomarker() — throws for unknown category', () => {
        expect(() =>
            new BioRecordBuilder(IEO_DOMAIN).setBiomarker('BSP-XX-001')
        ).toThrow('Invalid BSP biomarker code')
    })

    test('build() — throws when required fields missing', () => {
        expect(() =>
            new BioRecordBuilder(IEO_DOMAIN)
                .setBeoId(1n)
                .setBiomarker('BSP-HM-001')
                // missing value, unit, collectionTime
                .build()
        ).toThrow('missing required field')
    })

    test('setConfidence() — throws for out of range values', () => {
        expect(() => buildValid().setConfidence(1.5).build()).toThrow('confidence must be between')
        expect(() => buildValid().setConfidence(-0.1).build()).toThrow('confidence must be between')
    })

    test('setConfidence() — accepts valid range 0.0–1.0', () => {
        const record = buildValid().setConfidence(0.95).build()
        expect(record.confidence).toBe(0.95)
    })

    test('supersedes() — marks record as correction using BioRecordId bigint', () => {
        const record = buildValid().supersedes(PREV_RECORD_ID).build()
        expect(record.supersedes).toBe(PREV_RECORD_ID)
        expect(typeof record.supersedes).toBe('bigint')
        expect(record.status).toBe('ACTIVE')
    })

    test('setRefRange() — attaches reference range', () => {
        const record = buildValid().setRefRange({
            optimal: '13.5-17.5', functional: '12.0-17.5',
            deficiency: '<12.0', toxicity: null, unit: 'g/dL',
        }).build()
        expect(record.ref_range.optimal).toBe('13.5-17.5')
    })

    test('beo_id is a bigint type', () => {
        const record = buildValid().build()
        const asBig: bigint = record.beo_id
        expect(asBig).toBe(TEST_BEO_ID)
    })
})
