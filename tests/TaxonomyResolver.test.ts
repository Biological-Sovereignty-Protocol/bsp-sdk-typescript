import { TaxonomyResolver } from '../src/biorecord/TaxonomyResolver'

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
