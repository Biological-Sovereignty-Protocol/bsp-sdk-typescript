/**
 * TaxonomyResolver — Validates and resolves BSP biomarker codes.
 *
 * Biomarker codes follow the format: BSP-[CATEGORY]-[NUMBER]
 * e.g. BSP-GL-001, BSP-LA-004, BSP-DV-001
 */
export class TaxonomyResolver {
  private static CODE_PATTERN = /^BSP-[A-Z0-9]{2,4}-\d{3}$/

  isValid(code: string): boolean {
    return TaxonomyResolver.CODE_PATTERN.test(code)
  }

  getCategoryCode(code: string): string | null {
    if (!this.isValid(code)) return null
    const parts = code.split('-')
    return `BSP-${parts[1]}`
  }

  getLevel(code: string): 'CORE' | 'STANDARD' | 'EXTENDED' | 'DEVICE' | null {
    const category = this.getCategoryCode(code)
    if (!category) return null
    const coreCategories = ['BSP-LA', 'BSP-RC', 'BSP-CV', 'BSP-IM', 'BSP-ME', 'BSP-NR', 'BSP-DH', 'BSP-LF', 'BSP-BC']
    const standardCategories = ['BSP-HM', 'BSP-VT', 'BSP-MN', 'BSP-HR', 'BSP-RN', 'BSP-LP', 'BSP-GL', 'BSP-LV', 'BSP-IF']
    const extendedCategories = ['BSP-FR', 'BSP-GN', 'BSP-MB', 'BSP-TX', 'BSP-IM2', 'BSP-CV2']
    if (coreCategories.includes(category)) return 'CORE'
    if (standardCategories.includes(category)) return 'STANDARD'
    if (extendedCategories.includes(category)) return 'EXTENDED'
    if (category === 'BSP-DV') return 'DEVICE'
    return null
  }
}
