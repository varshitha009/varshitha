import { StrictCleaningPlan, CompactDataProfile } from '../types';

/**
 * PLAN VALIDATOR
 * Strictly validates the JSON cleaning plan returned by Gemini.
 * Rejects unknown operations, invalid columns, out-of-bounds row indexes,
 * or arbitrary code.
 */

export interface PlanValidationResult {
  isValid: boolean;
  sanitizedPlan: StrictCleaningPlan;
  warnings: string[];
  errors: string[];
}

export function validateCleaningPlan(
  rawPlan: any,
  columns: string[],
  totalRows: number,
  dataProfile?: CompactDataProfile
): PlanValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!rawPlan || typeof rawPlan !== 'object' || Array.isArray(rawPlan)) {
    return {
      isValid: false,
      sanitizedPlan: generateSafeDefaultPlan(columns, dataProfile),
      warnings: [],
      errors: ['Plan is not a valid JSON object.'],
    };
  }

  const existingColSet = new Set(columns.map((c) => c.toLowerCase()));
  const exactColMap = new Map(columns.map((c) => [c.toLowerCase(), c]));

  // 1. Validate header_row
  let header_row = 0;
  if (typeof rawPlan.header_row === 'number') {
    if (rawPlan.header_row >= 0 && rawPlan.header_row < Math.min(50, totalRows)) {
      header_row = Math.floor(rawPlan.header_row);
    } else {
      warnings.push(`header_row ${rawPlan.header_row} out of valid bounds [0, 50); default to 0.`);
    }
  }

  // 2. Validate drop_columns
  const drop_columns: string[] = [];
  if (Array.isArray(rawPlan.drop_columns)) {
    rawPlan.drop_columns.forEach((col: any) => {
      if (typeof col === 'string') {
        const matched = exactColMap.get(col.trim().toLowerCase());
        if (matched) drop_columns.push(matched);
      }
    });
  }

  // 3. Validate fill_down_columns
  const fill_down_columns: string[] = [];
  if (Array.isArray(rawPlan.fill_down_columns)) {
    rawPlan.fill_down_columns.forEach((col: any) => {
      if (typeof col === 'string') {
        const matched = exactColMap.get(col.trim().toLowerCase());
        if (matched) fill_down_columns.push(matched);
      }
    });
  }

  // 4. Validate remove_rows_containing
  const remove_rows_containing: string[] = [];
  if (Array.isArray(rawPlan.remove_rows_containing)) {
    rawPlan.remove_rows_containing.forEach((marker: any) => {
      if (typeof marker === 'string' && marker.trim()) {
        const cleanMarker = marker.trim();
        // Critical safety rule: NEVER allow deleting summary rows!
        if (/^(total|subtotal|grand\s*total|sum)$/i.test(cleanMarker)) {
          warnings.push(`Blocked removal of summary marker "${cleanMarker}". Summary rows are preserved.`);
        } else {
          remove_rows_containing.push(cleanMarker);
        }
      }
    });
  }

  // 5. Validate rename
  const rename: Record<string, string> = {};
  if (rawPlan.rename && typeof rawPlan.rename === 'object') {
    Object.entries(rawPlan.rename).forEach(([oldName, newName]) => {
      if (typeof newName === 'string' && newName.trim()) {
        const matchedOld = exactColMap.get(oldName.trim().toLowerCase());
        if (matchedOld && matchedOld !== newName.trim()) {
          rename[matchedOld] = newName.trim();
        }
      }
    });
  }

  // 6. Validate numeric_columns
  const numeric_columns: string[] = [];
  if (Array.isArray(rawPlan.numeric_columns)) {
    rawPlan.numeric_columns.forEach((col: any) => {
      if (typeof col === 'string') {
        const matched = exactColMap.get(col.trim().toLowerCase());
        if (matched && !numeric_columns.includes(matched)) {
          numeric_columns.push(matched);
        }
      }
    });
  }

  // 7. Validate date_columns
  const date_columns: string[] = [];
  if (Array.isArray(rawPlan.date_columns)) {
    rawPlan.date_columns.forEach((col: any) => {
      if (typeof col === 'string') {
        const matched = exactColMap.get(col.trim().toLowerCase());
        if (matched && !date_columns.includes(matched)) {
          date_columns.push(matched);
        }
      }
    });
  }

  // 8. Validate category_maps
  const category_maps: Record<string, Record<string, string>> = {};
  if (rawPlan.category_maps && typeof rawPlan.category_maps === 'object') {
    Object.entries(rawPlan.category_maps).forEach(([colName, mapping]) => {
      const matchedCol = exactColMap.get(colName.trim().toLowerCase());
      if (matchedCol && mapping && typeof mapping === 'object' && !Array.isArray(mapping)) {
        const cleanMap: Record<string, string> = {};
        Object.entries(mapping).forEach(([fromVal, toVal]) => {
          if (typeof fromVal === 'string' && typeof toVal === 'string' && fromVal.trim() && toVal.trim()) {
            cleanMap[fromVal.trim()] = toVal.trim();
          }
        });
        if (Object.keys(cleanMap).length > 0) {
          category_maps[matchedCol] = cleanMap;
        }
      }
    });
  }

  // 9. Validate boolean_columns
  const boolean_columns: string[] = [];
  if (Array.isArray(rawPlan.boolean_columns)) {
    rawPlan.boolean_columns.forEach((col: any) => {
      if (typeof col === 'string') {
        const matched = exactColMap.get(col.trim().toLowerCase());
        if (matched && !boolean_columns.includes(matched)) {
          boolean_columns.push(matched);
        }
      }
    });
  }

  // 10. Validate casing_standardizations
  const casing_standardizations: Record<string, 'title' | 'upper' | 'lower'> = {};
  if (rawPlan.casing_standardizations && typeof rawPlan.casing_standardizations === 'object') {
    Object.entries(rawPlan.casing_standardizations).forEach(([colName, style]) => {
      const matchedCol = exactColMap.get(colName.trim().toLowerCase());
      if (matchedCol && typeof style === 'string') {
        const lowerStyle = style.toLowerCase();
        if (lowerStyle === 'title' || lowerStyle === 'upper' || lowerStyle === 'lower') {
          casing_standardizations[matchedCol] = lowerStyle as 'title' | 'upper' | 'lower';
        }
      }
    });
  }

  // 11. Validate replace_null_representations
  const replace_null_representations = rawPlan.replace_null_representations !== false;

  // 12. Notes
  const notes: string[] = [];
  if (Array.isArray(rawPlan.notes)) {
    rawPlan.notes.forEach((n: any) => {
      if (typeof n === 'string' && n.trim()) {
        // Anti-AI jargon: replace "outlier" with "unusually high/low value"
        const cleanNote = n.trim().replace(/\boutliers?\b/gi, 'unusually high or low value');
        notes.push(cleanNote);
      }
    });
  }

  const sanitizedPlan: StrictCleaningPlan = {
    header_row,
    drop_columns,
    fill_down_columns,
    remove_rows_containing,
    rename,
    numeric_columns,
    date_columns,
    boolean_columns,
    casing_standardizations,
    replace_null_representations,
    category_maps,
    remove_duplicates: rawPlan.remove_duplicates !== false,
    notes,
  };

  return {
    isValid: errors.length === 0,
    sanitizedPlan,
    warnings,
    errors,
  };
}

/**
 * Generates a safe deterministic fallback plan when LLM is unavailable or offline
 */
export function generateSafeDefaultPlan(
  columns: string[],
  dataProfile?: CompactDataProfile
): StrictCleaningPlan {
  const numeric_columns: string[] = [];
  const date_columns: string[] = [];
  const category_maps: Record<string, Record<string, string>> = {};
  const notes: string[] = [];

  const monthMap: Record<string, string> = {
    january: 'Jan', jan: 'Jan', 'jan.': 'Jan',
    february: 'Feb', feb: 'Feb', 'feb.': 'Feb',
    march: 'Mar', mar: 'Mar', 'mar.': 'Mar',
    april: 'Apr', apr: 'Apr', 'apr.': 'Apr',
    may: 'May', 'may.': 'May',
    june: 'Jun', jun: 'Jun', 'jun.': 'Jun', 'j-u-n': 'Jun',
    july: 'Jul', jul: 'Jul', 'jul.': 'Jul',
    august: 'Aug', aug: 'Aug', 'aug.': 'Aug',
    september: 'Sep', sep: 'Sep', 'sep.': 'Sep', 'sept.': 'Sep',
    october: 'Oct', oct: 'Oct', 'oct.': 'Oct',
    november: 'Nov', nov: 'Nov', 'nov.': 'Nov',
    december: 'Dec', dec: 'Dec', 'dec.': 'Dec',
  };

  const boolean_columns: string[] = [];
  const casing_standardizations: Record<string, 'title' | 'upper' | 'lower'> = {};

  const colProfileMap = new Map<string, any>();
  if (dataProfile?.columnProfiles) {
    dataProfile.columnProfiles.forEach((cp) => colProfileMap.set(cp.name, cp));
  }

  columns.forEach((col) => {
    const lower = col.toLowerCase();
    const cp = colProfileMap.get(col);

    // Numeric columns
    const isNumType = cp && (cp.detectedType === 'integer' || cp.detectedType === 'decimal' || cp.detectedType === 'currency');
    const isNumName = /revenue|sales|price|cost|units|amount|qty|spend|balance/i.test(lower);
    if (isNumType || isNumName) {
      numeric_columns.push(col);
    }

    // Date columns
    const isDateType = cp && cp.detectedType === 'date';
    const isDateName = /date|timestamp|day|time/i.test(lower);
    if (isDateType || isDateName) {
      date_columns.push(col);
    }

    // Boolean columns
    const isBoolType = cp && cp.detectedType === 'boolean';
    const isBoolName = /status|active|verified|flag|is_/i.test(lower);
    if (isBoolType || isBoolName) {
      boolean_columns.push(col);
    }

    // Casing standardization: columns with mixed casing or entity/product/category names
    const hasCasingInconsistency = cp?.casingInconsistencies && cp.casingInconsistencies.length > 0;
    const isEntityCol = /product|item|name|category|region|channel|tier|type/i.test(lower);
    if (hasCasingInconsistency || isEntityCol) {
      casing_standardizations[col] = 'title';
    }

    // Month columns
    const isMonthCol = cp?.isMonthColumn || /month|period|mo\b/i.test(lower);
    if (isMonthCol) {
      category_maps[col] = { ...monthMap };
    }
  });

  // Apply detected category variants (e.g. Wst -> West in Region)
  if (dataProfile?.potentialCategoryVariants) {
    dataProfile.potentialCategoryVariants.forEach((v) => {
      if (columns.includes(v.column)) {
        if (!category_maps[v.column]) {
          category_maps[v.column] = {};
        }
        category_maps[v.column][v.variant.toLowerCase()] = v.canonical;
        category_maps[v.column][v.variant.toLowerCase().replace(/\.+$/, '')] = v.canonical;
      }
    });
  }

  // Summary row notes
  if (dataProfile?.detectedSummaryRows && dataProfile.detectedSummaryRows.length > 0) {
    notes.push(`${dataProfile.detectedSummaryRows.length} summary row(s) detected and preserved.`);
  }

  // Preserved unusual values notes
  if (dataProfile?.unusualValuesPreserved) {
    dataProfile.unusualValuesPreserved.forEach((u) => {
      notes.push(u.reason);
    });
  }

  return {
    header_row: 0,
    drop_columns: dataProfile?.blankColumns || [],
    fill_down_columns: [],
    remove_rows_containing: [],
    rename: {},
    numeric_columns,
    date_columns,
    boolean_columns,
    casing_standardizations,
    replace_null_representations: true,
    category_maps,
    remove_duplicates: true,
    notes,
  };
}
