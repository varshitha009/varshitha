import { RowData, ColumnProfile, DetectedDataType } from '../types';

/**
 * DATA PROFILING ENGINE
 * Performs deep programmatic statistical and semantic profiling on rows and columns.
 * Calculates null rates, distinct counts, distributions, Tukey outlier detection,
 * casing variations, and date formats.
 */

export function profileDataset(
  rows: RowData[],
  columns: string[],
  summaryRowIndices: number[] = []
): {
  columnProfiles: ColumnProfile[];
  duplicateRowIndices: number[];
  emptyRowIndices: number[];
  emptyColumns: string[];
  overallQualityScore: number;
} {
  const totalRows = rows.length;
  const summarySet = new Set(summaryRowIndices);

  // 1. DUPLICATE & EMPTY ROWS PROFILING (Excludes summary rows)
  const rowHashList: string[] = [];
  const duplicateRowIndices: number[] = [];
  const emptyRowIndices: number[] = [];

  rows.forEach((row, idx) => {
    // Skip summary rows from duplication checks
    if (summarySet.has(idx)) return;

    let nonBlankCells = 0;
    const values = columns.map((col) => {
      const val = row[col];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        nonBlankCells++;
        return String(val).trim().toLowerCase();
      }
      return '';
    });

    if (nonBlankCells === 0) {
      emptyRowIndices.push(idx);
    } else {
      const hash = values.join('||');
      const existingIdx = rowHashList.indexOf(hash);
      if (existingIdx !== -1) {
        duplicateRowIndices.push(idx);
      } else {
        rowHashList.push(hash);
      }
    }
  });

  // 2. COLUMN-BY-COLUMN PROFILING
  const emptyColumns: string[] = [];
  const columnProfiles: ColumnProfile[] = columns.map((colName, colIndex) => {
    let nullCount = 0;
    let nonEmptyCount = 0;
    const valueCounts = new Map<any, number>();
    const samples: any[] = [];
    const numericValues: { val: number; rowIdx: number }[] = [];
    const textValues: { str: string; rowIdx: number }[] = [];
    const dateValues: { date: Date; raw: string; rowIdx: number }[] = [];

    let currencyCount = 0;
    let percentageCount = 0;
    let booleanCount = 0;
    let extraSpacesCount = 0;

    const casingCounts = { upper: 0, lower: 0, title: 0, mixed: 0 };
    const lowerGroups = new Map<string, Set<string>>();

    rows.forEach((r, rowIdx) => {
      const rawVal = r[colName];
      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
        nullCount++;
      } else {
        nonEmptyCount++;
        const strVal = String(rawVal).trim();
        valueCounts.set(strVal, (valueCounts.get(strVal) || 0) + 1);

        if (samples.length < 5 && !samples.includes(rawVal)) {
          samples.push(rawVal);
        }

        // Check extra whitespace
        if (typeof rawVal === 'string' && (/^\s+|\s+$/.test(rawVal) || /\s{2,}/.test(rawVal))) {
          extraSpacesCount++;
        }

        // Check currency ($450, €1,200, -$1200, $480,000)
        if (typeof rawVal === 'string' && /^[-+]?\s*[$€£¥]\s*[\d,]+(\.\d+)?$|^[$€£¥]\s*[-+]?[\d,]+(\.\d+)?$/.test(strVal)) {
          currencyCount++;
        }

        // Check percentage (15%, 8.5%)
        if (typeof rawVal === 'string' && /^[\d,]+(\.\d+)?\s*%$/.test(strVal)) {
          percentageCount++;
        }

        // Check boolean
        if (
          typeof rawVal === 'boolean' ||
          (typeof rawVal === 'string' &&
            ['true', 'false', 'yes', 'no'].includes(strVal.toLowerCase()))
        ) {
          booleanCount++;
        }

        // Check numeric (only for transaction rows to avoid summary distortion)
        const num = parseNumber(rawVal);
        if (num !== null && !summarySet.has(rowIdx)) {
          numericValues.push({ val: num, rowIdx });
        }

        // Check date
        const parsedDate = parseDate(rawVal);
        if (parsedDate !== null && !summarySet.has(rowIdx)) {
          dateValues.push({ date: parsedDate, raw: strVal, rowIdx });
        }

        // Text profiling
        if (typeof rawVal === 'string' && !summarySet.has(rowIdx)) {
          textValues.push({ str: strVal, rowIdx });

          // Casing
          const isUpper = strVal === strVal.toUpperCase() && /[A-Z]/.test(strVal);
          const isLower = strVal === strVal.toLowerCase() && /[a-z]/.test(strVal);
          const isTitle = isTitleCase(strVal);

          if (isUpper) casingCounts.upper++;
          else if (isLower) casingCounts.lower++;
          else if (isTitle) casingCounts.title++;
          else casingCounts.mixed++;

          // Group by lowercase to find inconsistent casing/spelling
          const lower = strVal.toLowerCase();
          if (!lowerGroups.has(lower)) {
            lowerGroups.set(lower, new Set());
          }
          lowerGroups.get(lower)!.add(strVal);
        }
      }
    });

    // Detect Type with high precision
    const isDateColName = /date|timestamp|day|time/i.test(colName);
    const isNumericColName = /revenue|sales|price|cost|units|amount|qty|spend|balance/i.test(colName);

    let detectedType: DetectedDataType = 'text';
    if (nonEmptyCount === 0) {
      detectedType = 'empty';
      emptyColumns.push(colName);
    } else if (currencyCount > 0 && currencyCount / nonEmptyCount > 0.4) {
      detectedType = 'currency';
    } else if (percentageCount > 0 && percentageCount / nonEmptyCount > 0.5) {
      detectedType = 'percentage';
    } else if (booleanCount > 0 && booleanCount === nonEmptyCount) {
      detectedType = 'boolean';
    } else if (
      dateValues.length > 0 &&
      (dateValues.length / nonEmptyCount > 0.6 || (isDateColName && dateValues.length / nonEmptyCount >= 0.4))
    ) {
      detectedType = 'date';
    } else if (
      numericValues.length > 0 &&
      (numericValues.length / nonEmptyCount > 0.6 || (isNumericColName && numericValues.length / nonEmptyCount >= 0.4))
    ) {
      if (currencyCount > 0 || /price|revenue|cost|sales|spend|amount/i.test(colName)) {
        detectedType = 'currency';
      } else {
        const allInts = numericValues.every((n) => Number.isInteger(n.val));
        detectedType = allInts ? 'integer' : 'decimal';
      }
    } else if (numericValues.length > 0 && numericValues.length / nonEmptyCount > 0.25) {
      detectedType = 'mixed';
    } else {
      detectedType = 'text';
    }

    // Top frequent values
    const topFrequentValues = Array.from(valueCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / (nonEmptyCount || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Numeric Metrics & Tukey Outliers
    let numMetrics: Partial<ColumnProfile> = {};
    if (numericValues.length > 0 && (detectedType === 'integer' || detectedType === 'decimal' || detectedType === 'currency')) {
      const sorted = [...numericValues].sort((a, b) => a.val - b.val);
      const vals = sorted.map((s) => s.val);
      const min = vals[0];
      const max = vals[vals.length - 1];
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / vals.length) * 100) / 100;
      const median = calculateMedian(vals);
      const q1 = calculateQuantile(vals, 0.25);
      const q3 = calculateQuantile(vals, 0.75);
      const iqr = q3 - q1;

      // Variance & StDev
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / vals.length;
      const stdev = Math.round(Math.sqrt(variance) * 100) / 100;

      // Tukey's fences: lowerBound = Q1 - 1.5*IQR, upperBound = Q3 + 1.5*IQR
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const outliers = sorted
        .filter((item) => (iqr > 0 && (item.val < lowerFence || item.val > upperFence)))
        .map((item) => ({ rowIndex: item.rowIdx, value: item.val }));

      numMetrics = {
        min,
        max,
        sum: Math.round(sum * 100) / 100,
        mean,
        median,
        stdev,
        q1,
        q3,
        iqr,
        outliers,
      };
    }

    // Text Metrics & Casing Inconsistencies
    let textMetrics: Partial<ColumnProfile> = {};
    if (textValues.length > 0) {
      const lengths = textValues.map((t) => t.str.length);
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

      const casingInconsistencies: Array<{ rootLower: string; variants: string[] }> = [];
      lowerGroups.forEach((variantsSet, rootLower) => {
        if (variantsSet.size > 1) {
          casingInconsistencies.push({
            rootLower,
            variants: Array.from(variantsSet),
          });
        }
      });

      textMetrics = {
        minLength,
        maxLength,
        avgLength,
        extraSpacesCount,
        casingBreakdown: casingCounts,
        casingInconsistencies,
      };
    }

    // Date Metrics
    let dateMetrics: Partial<ColumnProfile> = {};
    if (dateValues.length > 0) {
      const timestamps = dateValues.map((d) => d.date.getTime()).sort((a, b) => a - b);
      const minDate = new Date(timestamps[0]).toISOString().split('T')[0];
      const maxDate = new Date(timestamps[timestamps.length - 1]).toISOString().split('T')[0];

      // Formats used
      const formatsUsed = new Set<string>();
      dateValues.forEach((d) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d.raw)) formatsUsed.add('YYYY-MM-DD');
        else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(d.raw)) formatsUsed.add('YYYY/MM/DD');
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d.raw)) formatsUsed.add('MM/DD/YYYY');
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(d.raw)) formatsUsed.add('MM-DD-YYYY');
        else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(d.raw)) formatsUsed.add('DD-MMM-YYYY');
        else if (/[A-Za-z]{3,}\s+\d{1,2},?\s*\d{4}/.test(d.raw)) formatsUsed.add('Month DD, YYYY');
        else formatsUsed.add('Other Date Format');
      });

      dateMetrics = {
        minDate,
        maxDate,
        detectedDateFormats: Array.from(formatsUsed),
      };
    }

    // Semantic Month Check
    const monthColKeywords = /month|period|mo\b/i;
    const isNamedMonth = monthColKeywords.test(colName);
    const hasMonthValues = checkMonthValues(topFrequentValues.map((v) => String(v.value)));
    const isMonthColumn = isNamedMonth || hasMonthValues;

    const ambiguousValues: string[] = [];
    if (isMonthColumn) {
      topFrequentValues.forEach(({ value }) => {
        const str = String(value).trim().toUpperCase();
        if (str === 'JM' || str === 'M' || str === 'JU' || str === 'JA') {
          ambiguousValues.push(String(value));
        }
      });
    }

    const uniqueCount = valueCounts.size;
    const uniquenessPercentage = Math.round((uniqueCount / (nonEmptyCount || 1)) * 100);

    // Near-duplicate / category typo detection
    const catVariants = findCategoryVariants(colName, valueCounts);

    // Unusual values preservation detection (e.g. negative returns or high revenue)
    const unusualValuesPreserved: Array<{ rowIndex: number; value: any; reason: string }> = [];
    if (numericValues.length > 0) {
      numericValues.forEach(({ val, rowIdx }) => {
        if (/qty|units|quantity/i.test(colName) && val < 0) {
          unusualValuesPreserved.push({
            rowIndex: rowIdx,
            value: val,
            reason: `Negative quantity (${val}) preserved as a potential return transaction.`,
          });
        }
        if (/revenue|sales|spend|price|amount/i.test(colName) && val > 100000) {
          unusualValuesPreserved.push({
            rowIndex: rowIdx,
            value: val,
            reason: `High value (${val}) preserved as a potential enterprise transaction.`,
          });
        }
      });
    }

    return {
      name: colName,
      colIndex,
      detectedType,
      totalCount: totalRows,
      nonEmptyCount,
      nullCount,
      nullPercentage: Math.round((nullCount / (totalRows || 1)) * 100),
      uniqueCount,
      uniquenessPercentage,
      sampleValues: samples,
      topFrequentValues,
      isMonthColumn,
      ambiguousValues: ambiguousValues.length > 0 ? ambiguousValues : undefined,
      potentialCategoryVariants: catVariants.length > 0 ? catVariants : undefined,
      unusualValuesPreserved: unusualValuesPreserved.length > 0 ? unusualValuesPreserved : undefined,
      ...numMetrics,
      ...textMetrics,
      ...dateMetrics,
    };
  });

  // Calculate Overall Data Quality Score (0 - 100)
  let qualityDeductions = 0;
  if (duplicateRowIndices.length > 0) qualityDeductions += Math.min(15, duplicateRowIndices.length * 5);
  if (emptyColumns.length > 0) qualityDeductions += emptyColumns.length * 5;
  columnProfiles.forEach((p) => {
    if (p.nullPercentage > 20) qualityDeductions += 5;
    if (p.extraSpacesCount && p.extraSpacesCount > 0) qualityDeductions += 3;
    if (p.casingInconsistencies && p.casingInconsistencies.length > 0) qualityDeductions += 5;
    if (p.ambiguousValues && p.ambiguousValues.length > 0) qualityDeductions += 5;
    if (p.detectedDateFormats && p.detectedDateFormats.length > 1) qualityDeductions += 5;
  });

  const overallQualityScore = Math.max(25, 100 - qualityDeductions);

  return {
    columnProfiles,
    duplicateRowIndices,
    emptyRowIndices,
    emptyColumns,
    overallQualityScore,
  };
}

function parseNumber(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;
  let clean = val.trim();
  let isNegative = false;
  if (/^\(.*\)$/.test(clean)) {
    isNegative = true;
    clean = clean.slice(1, -1).trim();
  } else if (/^-\s*[$€£¥]?|[$€£¥]\s*-/.test(clean)) {
    isNegative = true;
    clean = clean.replace(/^-\s*[$€£¥]?|[$€£¥]\s*-/, '');
  }
  clean = clean.replace(/^[$€£¥]/, '').replace(/,/g, '').replace(/%$/, '').trim();
  if (clean === '') return null;
  const num = Number(clean);
  if (isNaN(num)) return null;
  return isNegative ? -num : num;
}

function parseDate(val: any): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val !== 'string') return null;
  const str = val.trim();
  if (
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(str) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(str) ||
    /^\d{1,2}-[A-Za-z]{3}-\d{2,4}/.test(str) ||
    /^(?:[A-Za-z]+,?\s+)?(?:[A-Za-z]{3,}\s+\d{1,2},?\s*\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4})/i.test(str)
  ) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function findCategoryVariants(
  colName: string,
  valueCounts: Map<string, number>
): Array<{ variant: string; canonical: string; confidence: number; reason: string }> {
  const results: Array<{ variant: string; canonical: string; confidence: number; reason: string }> = [];

  // NEVER run on identifier, numeric, date, or code columns!
  const lowerCol = colName.trim().toLowerCase();
  if (
    /^(order_?id|txn_?id|transaction_?id|customer_?id|id|sku|code|ref|number|num|date|revenue|price|qty|cost|sales|spend|amount|total)/i.test(lowerCol) ||
    /id$|_id$/i.test(lowerCol)
  ) {
    return results;
  }

  const entries = Array.from(valueCounts.entries()).filter(([v]) => v.trim() !== '');
  if (entries.length < 2 || entries.length > 25) return results;

  for (let i = 0; i < entries.length; i++) {
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue;
      const [v1, count1] = entries[i];
      const [v2, count2] = entries[j];
      const s1 = v1.trim();
      const s2 = v2.trim();

      // Only check purely alphabetic/text words (no codes, digits, or hyphens like ORD-501 or 2026-02-01)
      if (!/^[A-Za-z.]+$/.test(s1) || !/^[A-Za-z.]+$/.test(s2)) continue;

      const l1 = s1.toLowerCase();
      const l2 = s2.toLowerCase();

      if (l1 === l2) continue;

      const noVowels1 = l1.replace(/[aeiou.]/g, '');
      const noVowels2 = l2.replace(/[aeiou.]/g, '');

      // Condition 1: Missing vowel abbreviation (e.g. wst vs west) with same first and last letter
      const isMissingVowel =
        noVowels1.length >= 2 &&
        noVowels1 === noVowels2 &&
        l1.length < l2.length &&
        l1[0] === l2[0] &&
        l1.replace(/\.+$/, '').slice(-1) === l2.replace(/\.+$/, '').slice(-1) &&
        count2 >= count1;

      // Condition 2: Trailing period (e.g. Mar. vs Mar)
      const isTrailingDot = l1 === l2 + '.' || l1.replace(/\.+$/, '') === l2;

      // Condition 3: Levenshtein distance 1 for words length >= 4 with dominant canonical frequency
      const dist = levenshteinDistance(l1.replace(/\.+$/, ''), l2.replace(/\.+$/, ''));
      const isSingleEdit = dist === 1 && Math.min(l1.length, l2.length) >= 4 && count2 >= 2 * count1;

      if (isMissingVowel || isTrailingDot || isSingleEdit) {
        let canonical = count2 >= count1 ? s2 : s1;
        let variant = count2 >= count1 ? s1 : s2;
        // Never allow canonical to have trailing punctuation if a clean form exists!
        if (canonical.endsWith('.') && !variant.endsWith('.')) {
          const tmp = canonical;
          canonical = variant;
          variant = tmp;
        }
        canonical = canonical.replace(/\.+$/, '');

        if (!results.some((r) => r.variant.toLowerCase() === variant.toLowerCase())) {
          results.push({
            variant,
            canonical,
            confidence: isMissingVowel ? 0.95 : isTrailingDot ? 0.98 : 0.85,
            reason: isMissingVowel
              ? `Abbreviation/missing vowel of "${canonical}"`
              : isTrailingDot
              ? `Trailing punctuation on "${canonical}"`
              : `1-letter variation of "${canonical}"`,
          });
        }
      }
    }
  }
  return results;
}

function isTitleCase(str: string): boolean {
  const words = str.trim().split(/\s+/);
  if (words.length === 0) return false;
  return words.every((w) => /^[A-Z][a-z0-9]*$/.test(w));
}

function calculateMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateQuantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function checkMonthValues(values: string[]): boolean {
  const monthKeywords = [
    'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
    'may', 'june', 'jun', 'july', 'jul', 'august', 'aug', 'september',
    'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec',
    'j-u-n', 'jm'
  ];
  const matches = values.filter((v) => monthKeywords.includes(v.toLowerCase()));
  return matches.length >= 2;
}

/**
 * BUILDS A COMPACT DATA PROFILE FOR GEMINI
 * Inspects the actual uploaded file and extracts structural metadata:
 * first 30 rows, last 5 rows, summary row markers, footer notes, column profiles.
 */
export function buildCompactDataProfile(
  rawMatrix: any[][],
  dataRows: RowData[],
  columns: string[],
  meta: {
    fileName: string;
    fileType: string;
    fileSize: string;
    sheetNames: string[];
    activeSheet?: string;
  }
): import('../types').CompactDataProfile {
  const totalRows = rawMatrix.length;
  const totalColumns = columns.length;

  const first30Rows = rawMatrix.slice(0, 30);
  const last5Rows = rawMatrix.slice(Math.max(0, totalRows - 5));

  // Detect summary rows (e.g. TOTAL, SUBTOTAL)
  const summaryRowKeywords = ['total', 'grand total', 'subtotal', 'sub-total', 'sum'];
  const detectedSummaryRows: Array<{ rowIndex: number; label: string; text: string }> = [];
  const detectedFooterNotes: Array<{ rowIndex: number; text: string }> = [];

  rawMatrix.forEach((r, idx) => {
    const nonBlank = r.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonBlank.length === 0) return;

    // Check summary rows
    const firstCell = String(nonBlank[0] || '').trim().toLowerCase();
    for (const kw of summaryRowKeywords) {
      if (firstCell === kw || firstCell.startsWith(`${kw}:`) || firstCell.startsWith(`${kw} `)) {
        detectedSummaryRows.push({
          rowIndex: idx,
          label: String(nonBlank[0]).trim(),
          text: r.map((c) => String(c ?? '')).join(' | '),
        });
        break;
      }
    }

    // Check footer/note rows (often single cell or begins with Note/Report)
    if (nonBlank.length <= 2 && idx > 5) {
      const textSample = String(nonBlank[0]).trim();
      if (/^(note|source|\*|confidential|generated\s*on|page\s*\d)/i.test(textSample)) {
        detectedFooterNotes.push({
          rowIndex: idx,
          text: textSample,
        });
      }
    }
  });

  const summaryRowIndices = detectedSummaryRows.map((s) => s.rowIndex);
  const { columnProfiles, duplicateRowIndices, emptyRowIndices, emptyColumns } = profileDataset(
    dataRows,
    columns,
    summaryRowIndices
  );

  const potentialCategoryVariants: Array<{ column: string; variant: string; canonical: string; confidence: number; reason: string }> = [];
  const unusualValuesPreserved: Array<{ column: string; value: any; reason: string }> = [];

  columnProfiles.forEach((cp) => {
    if (cp.potentialCategoryVariants) {
      cp.potentialCategoryVariants.forEach((v) => {
        potentialCategoryVariants.push({ column: cp.name, ...v });
      });
    }
    if (cp.unusualValuesPreserved) {
      cp.unusualValuesPreserved.forEach((u) => {
        unusualValuesPreserved.push({ column: cp.name, value: u.value, reason: u.reason });
      });
    }
  });

  return {
    fileName: meta.fileName,
    fileType: meta.fileType,
    fileSize: meta.fileSize,
    sheetNames: meta.sheetNames,
    activeSheet: meta.activeSheet || meta.sheetNames[0] || 'Sheet1',
    totalRows,
    totalColumns,
    first30Rows,
    last5Rows,
    columnNames: columns,
    columnProfiles,
    detectedSummaryRows,
    detectedFooterNotes,
    duplicateRowsCount: duplicateRowIndices.length,
    blankRowsCount: emptyRowIndices.length,
    blankColumns: emptyColumns,
    potentialCategoryVariants: potentialCategoryVariants.length > 0 ? potentialCategoryVariants : undefined,
    unusualValuesPreserved: unusualValuesPreserved.length > 0 ? unusualValuesPreserved : undefined,
  };
}
