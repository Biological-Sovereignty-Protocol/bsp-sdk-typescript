import { BioRecordBuilder } from '../src/biorecord/BioRecordBuilder'

describe('BioRecordBuilder', () => {
    const IEO_DOMAIN = 'fleury.bsp'

    const buildValid = () =>
        new BioRecordBuilder(IEO_DOMAIN)
            .setBeoId('550e8400-e29b-41d4-a716-446655440000')
            .setBiomarker('BSP-HM-001')
            .setValue(13.8)
            .setUnit('g/dL')
            .setCollectionTime('2026-02-26T08:00:00Z')

    test('build() — produces valid BioRecord for known code', () => {
        const record = buildValid().build()
        expect(record.record_id).toBeTruthy()
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
                .setBeoId('some-id')
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

    test('supersedes() — marks record as correction', () => {
        const previous_id = '00000000-0000-0000-0000-000000000001'
        const record = buildValid().supersedes(previous_id).build()
        expect(record.supersedes).toBe(previous_id)
        expect(record.status).toBe('ACTIVE')
    })

    test('setRefRange() — attaches reference range', () => {
        const record = buildValid().setRefRange({
            optimal: '13.5-17.5', functional: '12.0-17.5',
            deficiency: '<12.0', toxicity: null, unit: 'g/dL',
        }).build()
        expect(record.ref_range.optimal).toBe('13.5-17.5')
    })

    test('multiple builds from same builder — independent record_ids', () => {
        const builder = buildValid()
        const r1 = builder.build()
        const r2 = new BioRecordBuilder(IEO_DOMAIN)
            .setBeoId('550e8400-e29b-41d4-a716-446655440000')
            .setBiomarker('BSP-HM-001').setValue(13.8).setUnit('g/dL')
            .setCollectionTime('2026-02-26T08:00:00Z').build()
        expect(r1.record_id).not.toBe(r2.record_id)
    })
})
