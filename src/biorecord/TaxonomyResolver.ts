import { BioLevel } from '../types'

// Valid BSP category codes and their taxonomy levels
const TAXONOMY: Record<string, { level: BioLevel; name: string }> = {
  // Level 1 — Core Longevity
  'BSP-LA': { level: 'CORE', name: 'Longevity & Aging' },
  'BSP-RC': { level: 'CORE', name: 'Regeneration & Cellular' },
  'BSP-CV': { level: 'CORE', name: 'Cardiovascular Health' },
  'BSP-IM': { level: 'CORE', name: 'Immune Function & Inflammation' },
  'BSP-ME': { level: 'CORE', name: 'Metabolism & Cellular Energy' },
  'BSP-NR': { level: 'CORE', name: 'Neurological Health' },
  'BSP-DH': { level: 'CORE', name: 'Detoxification & Hepatic' },
  'BSP-LF': { level: 'CORE', name: 'Lymphatic System & Clearance' },
  'BSP-BC': { level: 'CORE', name: 'Biological Clock & Senescence' },
  // Level 2 — Standard Laboratory
  'BSP-HM': { level: 'STANDARD', name: 'Hematology' },
  'BSP-VT': { level: 'STANDARD', name: 'Vitamins' },
  'BSP-MN': { level: 'STANDARD', name: 'Minerals & Electrolytes' },
  'BSP-HR': { level: 'STANDARD', name: 'Hormones' },
  'BSP-RN': { level: 'STANDARD', name: 'Renal Function' },
  'BSP-LP': { level: 'STANDARD', name: 'Conventional Lipids' },
  'BSP-GL': { level: 'STANDARD', name: 'Glycemia & Metabolic' },
  'BSP-LV': { level: 'STANDARD', name: 'Hepatic Function' },
  'BSP-IF': { level: 'STANDARD', name: 'Inflammatory Markers' },
  // Level 3 — Extended / Specialized
  'BSP-GN': { level: 'EXTENDED', name: 'Genomics & Epigenomics' },
  'BSP-MB': { level: 'EXTENDED', name: 'Microbiome' },
  'BSP-PR': { level: 'EXTENDED', name: 'Proteomics' },
  'BSP-MT': { level: 'EXTENDED', name: 'Metabolomics' },
  'BSP-TX': { level: 'EXTENDED', name: 'Toxicology' },
  'BSP-CL': { level: 'EXTENDED', name: 'Clinical Assessment' },
  // Level 4 — Device
  'BSP-DV': { level: 'DEVICE', name: 'Device & Wearable' },
}

/**
 * TaxonomyResolver — Validate and look up BSP biomarker taxonomy.
 *
 * @example
 * ```typescript
 * const resolver = client.taxonomy
 *
 * resolver.isValidCode('BSP-HM-001')  // true
 * resolver.getLevel('BSP-LA-003')     // 'CORE'
 * resolver.getCategory('BSP-CV')      // { level: 'CORE', name: 'Cardiovascular Health' }
 * resolver.listCategories()           // all 25 categories with levels
 * ```
 */
export class TaxonomyResolver {

  /**
   * Returns true if the BSP code follows the format BSP-XX-NNN
   * and the category exists in the taxonomy.
   */
  isValidCode(code: string): boolean {
    const match = code.match(/^(BSP-[A-Z]{2})-(\d{3})$/)
    if (!match) return false
    return TAXONOMY[match[1]] !== undefined
  }

  /**
   * Returns the taxonomy level (CORE, STANDARD, EXTENDED, DEVICE)
   * for a given biomarker code or category code.
   */
  getLevel(code: string): BioLevel {
    const category = code.length === 6 ? code : code.split('-').slice(0, 2).join('-')
    const entry = TAXONOMY[category]
    if (!entry) throw new Error(`Unknown BSP category: "${category}"`)
    return entry.level
  }

  /**
   * Returns full metadata for a category code (e.g. BSP-HM).
   */
  getCategory(categoryCode: string): { level: BioLevel; name: string } | null {
    return TAXONOMY[categoryCode] ?? null
  }

  /**
   * Returns all 25 BSP categories with their level and name.
   */
  listCategories(): Array<{ code: string; level: BioLevel; name: string }> {
    return Object.entries(TAXONOMY).map(([code, meta]) => ({
      code,
      level: meta.level,
      name: meta.name,
    }))
  }

  /**
   * Returns all categories for a specific taxonomy level.
   */
  listByLevel(level: BioLevel): Array<{ code: string; name: string }> {
    return Object.entries(TAXONOMY)
      .filter(([, meta]) => meta.level === level)
      .map(([code, meta]) => ({ code, name: meta.name }))
  }
}
