import { RowData, DataQualityIssue, ColumnMeta } from '../types';

/**
 * AI Data Quality Inspection Engine
 * Inspects real row data and detects genuine data issues without mock/synthetic results.
 * Uses plain, friendly English and explicit "AI suggestion" phrasing.
 */
export function inspectDatasetQuality(
  rows: RowData[],
  columns: string[],
  columnMetas: ColumnMeta[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const totalRows = rows.length;
  if (totalRows === 0) return issues;

  // 1. CHECK FOR DUPLICATE ROWS
  const rowHashList: string[] = [];
  const duplicateIndices: number[] = [];
  rows.forEach((row, idx) => {
    const rowStr = columns
      .map((c) => String(row[c] !== null && row[c] !== undefined ? row[c] : '').trim().toLowerCase())
      .join('||');
    const existingIdx = rowHashList.indexOf(rowStr);
    if (existingIdx !== -1) {
      duplicateIndices.push(idx);
    } else {
      rowHashList.push(rowStr);
    }
  });

  if (duplicateIndices.length > 0) {
    issues.push({
      id: 'duplicate_rows',
      category: 'safe_fix',
      affectedRowIndices: duplicateIndices,
      title: `${duplicateIndices.length} Duplicate Row${duplicateIndices.length > 1 ? 's' : ''}`,
      whatIFound: `I found ${duplicateIndices.length} row${
        duplicateIndices.length > 1 ? 's that appear to be duplicates' : ' that appears to be a duplicate'
      } of earlier rows in the file (for example, row ${duplicateIndices[0] + 1}).`,
      whyItMayMatter:
        'Duplicate records can inflate your totals, double-count orders, or exaggerate customer counts in reports.',
      suggestedAction:
        'Standardize by merging duplicates or removing the extra rows so each record is counted once.',
      aiSuggestion:
        'AI suggestion: Removing duplicate rows will keep total counts accurate and avoid double-counting.',
      fixType: 'remove_duplicates',
    });
  }

  // 2. CHECK EACH COLUMN FOR SPECIFIC CHARACTERISTICS
  columns.forEach((col) => {
    const nonNullValues = rows
      .map((r, i) => ({ val: r[col], rowIdx: i }))
      .filter(
        ({ val }) => val !== null && val !== undefined && String(val).trim() !== ''
      );

    // 2A. EMPTY COLUMN
    if (nonNullValues.length === 0) {
      issues.push({
        id: `empty_col_${col}`,
        category: 'review_needed',
        column: col,
        affectedRowIndices: [],
        title: `Empty Column: "${col}"`,
        whatIFound: `The column "${col}" contains no data across all ${totalRows} rows.`,
        whyItMayMatter:
          'Completely empty columns clutter your workspace and add no value to calculations or charts.',
        suggestedAction:
          'Consider removing this column if it will not be used, or keep it as it is for future data.',
        aiSuggestion:
          `AI suggestion: Column "${col}" has no entries. Removing it will keep your dataset clean and concise.`,
        fixType: 'custom',
      });
      return;
    }

    // 2B. PARTIAL MISSING VALUES
    const missingIndices = rows
      .map((r, i) => ({ val: r[col], rowIdx: i }))
      .filter(
        ({ val }) => val === null || val === undefined || String(val).trim() === ''
      )
      .map((x) => x.rowIdx);

    if (missingIndices.length > 0 && missingIndices.length < totalRows) {
      issues.push({
        id: `missing_values_${col}`,
        category: 'review_needed',
        column: col,
        affectedRowIndices: missingIndices,
        title: `Missing Values in "${col}" (${missingIndices.length} cell${
          missingIndices.length > 1 ? 's' : ''
        })`,
        whatIFound: `"${col}" is blank in ${missingIndices.length} row${
          missingIndices.length > 1 ? 's' : ''
        } (for example in row ${missingIndices[0] + 1}).`,
        whyItMayMatter:
          'Missing data can cause formulas, averages, or visual charts to produce incomplete numbers.',
        suggestedAction:
          'Fill with a default value (like 0 or N/A), remove the blank rows, or keep as it is.',
        aiSuggestion:
          `AI suggestion: Blank cells can disrupt averages. Consider standardizing with a placeholder like 0 or N/A, or removing the blank rows.`,
        fixType: 'fill_missing',
      });
    }

    // 2C. LEADING / TRAILING EXTRA SPACES
    const extraSpaceIndices: number[] = [];
    nonNullValues.forEach(({ val, rowIdx }) => {
      if (typeof val === 'string') {
        if (/^\s+|\s+$/.test(val) || /\s{2,}/.test(val)) {
          extraSpaceIndices.push(rowIdx);
        }
      }
    });

    if (extraSpaceIndices.length > 0) {
      const sampleVal = rows[extraSpaceIndices[0]][col];
      issues.push({
        id: `extra_spaces_${col}`,
        category: 'safe_fix',
        column: col,
        affectedRowIndices: extraSpaceIndices,
        title: `Extra Spaces in "${col}" (${extraSpaceIndices.length} row${
          extraSpaceIndices.length > 1 ? 's' : ''
        })`,
        whatIFound: `Found extra spaces in "${col}" on ${extraSpaceIndices.length} row${
          extraSpaceIndices.length > 1 ? 's' : ''
        } (for example: "${sampleVal}").`,
        whyItMayMatter:
          'Computers treat text with extra spaces as different items, which can split group totals or break searches.',
        suggestedAction:
          'Standardize by trimming unnecessary spaces from the edges and consolidating multiple spaces.',
        aiSuggestion:
          `AI suggestion: Trimming extra spaces ensures grouping, searching, and filtering will work reliably.`,
        fixType: 'trim_whitespace',
      });
    }

    // 2D. INCONSISTENT CAPITALIZATION & SPELLING
    const textGroupMap = new Map<string, Set<string>>();
    nonNullValues.forEach(({ val }) => {
      if (typeof val === 'string') {
        const clean = val.trim();
        const lower = clean.toLowerCase();
        if (!textGroupMap.has(lower)) {
          textGroupMap.set(lower, new Set());
        }
        textGroupMap.get(lower)!.add(clean);
      }
    });

    const casingConflicts: Array<{ lower: string; variations: string[] }> = [];
    textGroupMap.forEach((variations, lower) => {
      if (variations.size > 1) {
        casingConflicts.push({ lower, variations: Array.from(variations) });
      }
    });

    if (casingConflicts.length > 0) {
      const affectedIndices = nonNullValues
        .filter(({ val }) =>
          typeof val === 'string' &&
          casingConflicts.some((c) => c.lower === val.trim().toLowerCase())
        )
        .map((x) => x.rowIdx);

      const sampleConflict = casingConflicts[0];
      issues.push({
        id: `inconsistent_casing_${col}`,
        category: 'safe_fix',
        column: col,
        affectedRowIndices: affectedIndices,
        title: `Inconsistent Capitalization in "${col}"`,
        whatIFound: `Found different ways of writing capitalization in "${col}" (such as ${sampleConflict.variations
          .map((v) => `"${v}"`)
          .join(' and ')}).`,
        whyItMayMatter:
          'Charts and summaries will split this into separate categories instead of combining them into one true total.',
        suggestedAction:
          'Standardize capitalization to Title Case so all entries match uniformly.',
        aiSuggestion:
          `AI suggestion: Standardizing capitalization to Title Case will combine these into one consistent category.`,
        fixType: 'standardize_casing',
      });
    }

    // 2E. INCONSISTENT SPELLING (Near-duplicate text matching, e.g. Hyderabad vs Hydrabad)
    const uniqueStrings = Array.from(
      new Set(
        nonNullValues
          .map((x) => String(x.val).trim())
          .filter((s) => s.length >= 4 && !/^\d+$/.test(s))
      )
    );

    const spellingPairs: Array<{ str1: string; str2: string }> = [];
    for (let i = 0; i < uniqueStrings.length; i++) {
      for (let j = i + 1; j < uniqueStrings.length; j++) {
        const s1 = uniqueStrings[i];
        const s2 = uniqueStrings[j];
        if (s1.toLowerCase() !== s2.toLowerCase() && isCloseSpelling(s1, s2)) {
          spellingPairs.push({ str1: s1, str2: s2 });
        }
      }
    }

    if (spellingPairs.length > 0) {
      const pair = spellingPairs[0];
      const pairIndices = nonNullValues
        .filter(({ val }) => {
          const s = String(val).trim();
          return s === pair.str1 || s === pair.str2;
        })
        .map((x) => x.rowIdx);

      issues.push({
        id: `spelling_${col}`,
        category: 'review_needed',
        column: col,
        affectedRowIndices: pairIndices,
        title: `Inconsistent Spelling in "${col}" ("${pair.str1}" vs "${pair.str2}")`,
        whatIFound: `"${pair.str1}" and "${pair.str2}" appear in the ${col} column.`,
        whyItMayMatter:
          'Slight spelling differences split records that belong to the same category.',
        suggestedAction:
          `Standardize to "${pair.str1}" or use Fix / Change to specify your preferred spelling.`,
        aiSuggestion:
          `AI suggestion: These appear to be the same item spelled slightly differently. Standardizing to "${pair.str1}" keeps records unified.`,
        fixType: 'standardize_category',
        suggestedFixDetails: {
          targetValue: pair.str1,
          mapping: { [pair.str2]: pair.str1 },
        },
      });
    }

    // 2F. DIFFERENT DATE FORMATS
    const dateFormats = new Set<string>();
    const dateRowIndices: number[] = [];
    nonNullValues.forEach(({ val, rowIdx }) => {
      if (typeof val === 'string') {
        const str = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          dateFormats.add('YYYY-MM-DD');
          dateRowIndices.push(rowIdx);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
          dateFormats.add('MM/DD/YYYY');
          dateRowIndices.push(rowIdx);
        } else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
          dateFormats.add('DD-Mon-YYYY');
          dateRowIndices.push(rowIdx);
        }
      }
    });

    if (dateFormats.size > 1) {
      issues.push({
        id: `different_dates_${col}`,
        category: 'safe_fix',
        column: col,
        affectedRowIndices: dateRowIndices,
        title: `Different Date Formats in "${col}"`,
        whatIFound: `Different date formats found in "${col}" (${Array.from(dateFormats).join(', ')}).`,
        whyItMayMatter:
          'Mixed date formats make chronological sorting unreliable and can lead to month/day confusion.',
        suggestedAction:
          'Standardize all dates to YYYY-MM-DD format for consistency.',
        aiSuggestion:
          `AI suggestion: Standardizing all dates to YYYY-MM-DD makes sorting and timeline analysis consistent.`,
        fixType: 'standardize_dates',
      });
    }

    // 2G. MONTH NAMES & SEMANTIC EQUIVALENCES (e.g. Month column with January, Jan, June, Jun, J-U-N, JM)
    const isMonthLikeColumn =
      /month/i.test(col) ||
      nonNullValues.some(({ val }) =>
        /^(?:january|jan|june|jun|j-u-n|jm)$/i.test(String(val).trim())
      );

    if (isMonthLikeColumn) {
      const { safeEquivalents, ambiguousValues } = detectSemanticEquivalences(
        nonNullValues.map((x) => String(x.val).trim())
      );

      if (safeEquivalents.length > 0) {
        const safeIndices = nonNullValues
          .filter(({ val }) =>
            safeEquivalents.some((eq) => eq.variations.includes(String(val).trim()))
          )
          .map((x) => x.rowIdx);

        if (safeIndices.length > 0) {
          const sample = safeEquivalents[0];
          issues.push({
            id: `semantic_equivalent_${col}`,
            category: 'safe_fix',
            column: col,
            affectedRowIndices: safeIndices,
            title: `Month Name Formats in "${col}"`,
            whatIFound: `I found different ways of writing some month names (${sample.variations
              .map((v) => `"${v}"`)
              .join(', ')}).`,
            whyItMayMatter:
              'Mixing full names and abbreviations separates months that belong together.',
            suggestedAction:
              `Standardize to consistent 3-letter month names (Jan, Jun).`,
            aiSuggestion:
              'AI suggestion: These values appear to represent the same month, so standardizing them to Jan/Jun would make the column more consistent.',
            fixType: 'standardize_category',
            suggestedFixDetails: {
              targetValue: sample.standardName,
              mapping: sample.mapping,
            },
          });
        }
      }

      if (ambiguousValues.length > 0) {
        const ambIndices = nonNullValues
          .filter(({ val }) => ambiguousValues.includes(String(val).trim()))
          .map((x) => x.rowIdx);

        issues.push({
          id: `ambiguous_value_${col}`,
          category: 'review_needed',
          column: col,
          affectedRowIndices: ambIndices,
          title: `Unclear Value in "${col}" (${ambiguousValues.join(', ')})`,
          whatIFound: `I found '${ambiguousValues.join("', '")}', but I can't confidently determine what month it means.`,
          whyItMayMatter:
            'We cannot guess whether "JM" was meant to be January, June, or a specialized code.',
          suggestedAction:
            'Review needed: use Fix / Change to choose the intended month, or Keep As It Is if this is a custom code.',
          aiSuggestion:
            "AI suggestion: Because 'JM' could mean January, June, or a code, please specify your choice rather than letting AI guess.",
          fixType: 'custom',
          suggestedFixDetails: {
            originalSample: ambiguousValues[0],
          },
        });
      }
    }

    // 2H. UNUSUALLY HIGH OR LOW VALUES
    const numericVals = nonNullValues
      .map(({ val, rowIdx }) => {
        const num = parseNumber(val);
        return { num, rowIdx, raw: val };
      })
      .filter((x): x is { num: number; rowIdx: number; raw: any } => x.num !== null);

    if (numericVals.length >= 6) {
      const numbers = numericVals.map((x) => x.num).sort((a, b) => a - b);
      const median = numbers[Math.floor(numbers.length / 2)];
      const q1 = numbers[Math.floor(numbers.length * 0.25)];
      const q3 = numbers[Math.floor(numbers.length * 0.75)];
      const iqr = q3 - q1;

      if (iqr > 0) {
        const highOutliers = numericVals.filter(
          (x) => x.num > q3 + 3 * iqr && x.num > median * 4
        );

        if (highOutliers.length > 0) {
          const sample = highOutliers[0];
          issues.push({
            id: `extreme_high_${col}`,
            category: 'review_needed',
            column: col,
            affectedRowIndices: highOutliers.map((x) => x.rowIdx),
            title: `Unusually High Value in "${col}" (${sample.num.toLocaleString()})`,
            whatIFound: `One ${col} value (${sample.num.toLocaleString()} in row ${
              sample.rowIdx + 1
            }) is much higher than most other rows. It may still be correct.`,
            whyItMayMatter:
              'This could be an accidental typing mistake (such as an extra zero), or it could be a real bulk transaction.',
            suggestedAction:
              `Inspect row ${sample.rowIdx + 1} and choose whether to Keep As It Is, remove it, or adjust the number.`,
            aiSuggestion:
              `AI suggestion: This value is much higher than typical rows (${q1.toLocaleString()} - ${q3.toLocaleString()}). Check if it was a bulk transaction before deciding to keep, adjust, or remove it.`,
            fixType: 'custom',
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Recognizes high-confidence equivalent category values (e.g. January, Jan, J-U-N)
 * and distinguishes unclear / ambiguous entries like "JM" where human review is necessary.
 */
function detectSemanticEquivalences(values: string[]): {
  safeEquivalents: Array<{
    standardName: string;
    variations: string[];
    mapping: Record<string, string>;
  }>;
  ambiguousValues: string[];
} {
  const safeEquivalents: Array<{
    standardName: string;
    variations: string[];
    mapping: Record<string, string>;
  }> = [];
  const ambiguousValues: string[] = [];

  const monthStandards: Record<string, string[]> = {
    Jan: ['january', 'jan', 'jan.', 'j-a-n'],
    Feb: ['february', 'feb', 'feb.', 'f-e-b'],
    Mar: ['march', 'mar', 'mar.'],
    Apr: ['april', 'apr', 'apr.'],
    May: ['may'],
    Jun: ['june', 'jun', 'jun.', 'j-u-n'],
    Jul: ['july', 'jul', 'jul.'],
    Aug: ['august', 'aug', 'aug.'],
    Sep: ['september', 'sep', 'sept', 'sep.'],
    Oct: ['october', 'oct', 'oct.'],
    Nov: ['november', 'nov', 'nov.'],
    Dec: ['december', 'dec', 'dec.'],
  };

  const uniqueVals = Array.from(new Set(values));

  Object.entries(monthStandards).forEach(([standard, knownForms]) => {
    const foundVariations: string[] = [];
    const mapping: Record<string, string> = {};

    uniqueVals.forEach((val) => {
      const lower = val.toLowerCase().trim();
      if (knownForms.includes(lower)) {
        foundVariations.push(val);
        mapping[val] = standard;
      }
    });

    // If multiple variations found (or variation differs from standard)
    if (foundVariations.length > 1 || (foundVariations.length === 1 && foundVariations[0] !== standard)) {
      safeEquivalents.push({
        standardName: standard,
        variations: foundVariations,
        mapping,
      });
    }
  });

  // Ambiguous entries (e.g., JM, JN)
  uniqueVals.forEach((val) => {
    const clean = val.trim();
    if (/^[A-Za-z]{2}$/.test(clean)) {
      const lower = clean.toLowerCase();
      const isKnown = Object.values(monthStandards).some((forms) =>
        forms.includes(lower)
      );
      if (!isKnown) {
        ambiguousValues.push(clean);
      }
    }
  });

  return { safeEquivalents, ambiguousValues };
}

function isCloseSpelling(s1: string, s2: string): boolean {
  if (Math.abs(s1.length - s2.length) > 2) return false;
  const dist = levenshtein(s1.toLowerCase(), s2.toLowerCase());
  return dist <= 2;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function parseNumber(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;
  const clean = val.trim().replace(/^[$€£]/, '').replace(/,/g, '');
  if (clean === '' || isNaN(Number(clean))) return null;
  return Number(clean);
}

/**
 * Apply all high-confidence Safe Fixes.
 * Returns a new dataset copy (never mutating original) and a summary of applied changes.
 */
export function applySafeFixes(
  currentRows: RowData[],
  safeIssues: DataQualityIssue[]
): {
  newRows: RowData[];
  appliedChanges: string[];
} {
  const appliedChanges: string[] = [];
  let updatedRows: RowData[] = currentRows.map((r) => ({ ...r }));

  safeIssues.forEach((issue) => {
    if (issue.category !== 'safe_fix') return;

    if (issue.fixType === 'remove_duplicates') {
      const sortedIndicesToRemove = Array.from(
        new Set(issue.affectedRowIndices)
      ).sort((a, b) => b - a);

      sortedIndicesToRemove.forEach((idx) => {
        if (idx >= 0 && idx < updatedRows.length) {
          updatedRows.splice(idx, 1);
        }
      });
      appliedChanges.push(
        `Removed ${issue.affectedRowIndices.length} duplicate row(s)`
      );
    } else if (issue.fixType === 'trim_whitespace' && issue.column) {
      const col = issue.column;
      let count = 0;
      updatedRows = updatedRows.map((row) => {
        const val = row[col];
        if (typeof val === 'string') {
          const trimmed = val.trim().replace(/\s{2,}/g, ' ');
          if (trimmed !== val) {
            count++;
            return { ...row, [col]: trimmed };
          }
        }
        return row;
      });
      appliedChanges.push(`Trimmed extra spaces in "${col}" across ${count} rows`);
    } else if (issue.fixType === 'standardize_casing' && issue.column) {
      const col = issue.column;
      updatedRows = updatedRows.map((row) => {
        const val = row[col];
        if (typeof val === 'string') {
          const titleCased = toTitleCase(val.trim());
          return { ...row, [col]: titleCased };
        }
        return row;
      });
      appliedChanges.push(`Standardized capitalization to Title Case in "${col}"`);
    } else if (issue.fixType === 'standardize_dates' && issue.column) {
      const col = issue.column;
      updatedRows = updatedRows.map((row) => {
        const val = row[col];
        if (typeof val === 'string') {
          const standardized = normalizeDateString(val.trim());
          if (standardized) {
            return { ...row, [col]: standardized };
          }
        }
        return row;
      });
      appliedChanges.push(`Standardized date formats to YYYY-MM-DD in "${col}"`);
    } else if (issue.fixType === 'standardize_category' && issue.column) {
      const col = issue.column;
      const mapping = issue.suggestedFixDetails?.mapping || {};
      updatedRows = updatedRows.map((row) => {
        const val = row[col];
        if (typeof val === 'string' && mapping[val]) {
          return { ...row, [col]: mapping[val] };
        }
        return row;
      });
      appliedChanges.push(
        `Standardized equivalent abbreviations to "${issue.suggestedFixDetails?.targetValue}" in "${col}"`
      );
    }
  });

  return { newRows: updatedRows, appliedChanges };
}

/**
 * Apply an individual resolution confirmed by the user.
 */
export function applyIndividualResolution(
  currentRows: RowData[],
  issue: DataQualityIssue,
  customReplacement?: any
): {
  newRows: RowData[];
  appliedChange: string;
} {
  let updatedRows: RowData[] = currentRows.map((r) => ({ ...r }));
  let changeDescription = '';

  if (issue.column && customReplacement !== undefined) {
    const col = issue.column;
    issue.affectedRowIndices.forEach((idx) => {
      if (updatedRows[idx]) {
        updatedRows[idx] = { ...updatedRows[idx], [col]: customReplacement };
      }
    });
    changeDescription = `Updated ${issue.affectedRowIndices.length} row(s) in "${col}" to "${customReplacement}"`;
  } else if (issue.fixType === 'fill_missing' && issue.column) {
    const col = issue.column;
    const replacement = customReplacement || 'N/A';
    issue.affectedRowIndices.forEach((idx) => {
      if (updatedRows[idx]) {
        updatedRows[idx] = { ...updatedRows[idx], [col]: replacement };
      }
    });
    changeDescription = `Filled missing values in "${col}" with "${replacement}"`;
  } else {
    changeDescription = `Reviewed issue: ${issue.title}`;
  }

  return { newRows: updatedRows, appliedChange: changeDescription };
}

function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

function normalizeDateString(dateStr: string): string | null {
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const m = mdy[1].padStart(2, '0');
    const d = mdy[2].padStart(2, '0');
    const y = mdy[3];
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return null;
}
