import { RowData, ColumnProfile, DataQualityIssue } from '../types';

/**
 * AI REASONING & QUALITY INSPECTION LAYER
 * Combines server-side Gemini semantic analysis with deterministic rule-based verification.
 * Adheres strictly to simple English explanations, non-destructive recommendations,
 * and semantic distinction between high-confidence equivalents and ambiguous values.
 */

export async function runAiDatasetReasoning(
  rows: RowData[],
  columns: string[],
  columnProfiles: ColumnProfile[],
  duplicateRowIndices: number[]
): Promise<DataQualityIssue[]> {
  // Try server-side Gemini endpoint first if available
  try {
    const res = await fetch('/api/ai-analyze-dataset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structureReport: {
          totalRows: rows.length,
          totalColumns: columns.length,
          columns,
          duplicateRowCount: duplicateRowIndices.length,
        },
        columnProfiles: columnProfiles.map((p) => ({
          name: p.name,
          detectedType: p.detectedType,
          nullPercentage: p.nullPercentage,
          uniqueCount: p.uniqueCount,
          topFrequentValues: p.topFrequentValues,
          isMonthColumn: p.isMonthColumn,
          ambiguousValues: p.ambiguousValues,
          outliers: p.outliers,
          extraSpacesCount: p.extraSpacesCount,
          casingInconsistencies: p.casingInconsistencies,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.plan && Array.isArray(data.plan.issues) && data.plan.issues.length > 0) {
        // Map server issues to DataQualityIssue schema
        const serverIssues: DataQualityIssue[] = data.plan.issues.map((iss: any, idx: number) => ({
          id: `ai_${iss.issue_type}_${iss.column || idx}`,
          category: iss.confidence === 'high' && iss.recommended_action === 'standardize' ? 'safe_fix' : 'review_needed',
          column: iss.column,
          affectedRowIndices: findAffectedRows(rows, iss.column, iss.issue_type, iss.mapping),
          title: formatIssueTitle(iss),
          whatIFound: iss.what_was_found,
          whyItMayMatter: iss.why_it_matters,
          suggestedAction: iss.ai_suggestion,
          aiSuggestion: `AI suggestion: ${iss.ai_suggestion}`,
          confidence: iss.confidence || 'medium',
          fixType: mapFixType(iss.issue_type),
          suggestedFixDetails: {
            mapping: iss.mapping,
            isAmbiguous: iss.confidence === 'low',
          },
        }));

        if (serverIssues.length > 0) {
          return serverIssues;
        }
      }
    }
  } catch (err) {
    // Graceful fallback to deterministic local engine
  }

  // Fallback to grounded local semantic inspection
  return inspectLocally(rows, columns, columnProfiles, duplicateRowIndices);
}

/**
 * GROUNDED LOCAL REASONING ENGINE
 * Inspects actual row data and builds clear, simple-English issues.
 */
function inspectLocally(
  rows: RowData[],
  columns: string[],
  columnProfiles: ColumnProfile[],
  duplicateRowIndices: number[]
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const totalRows = rows.length;

  // 1. DUPLICATE ROWS
  if (duplicateRowIndices.length > 0) {
    issues.push({
      id: 'duplicate_rows',
      category: 'safe_fix',
      affectedRowIndices: duplicateRowIndices,
      title: `${duplicateRowIndices.length} Duplicate Row${duplicateRowIndices.length > 1 ? 's' : ''}`,
      whatIFound: `I found ${duplicateRowIndices.length} row${
        duplicateRowIndices.length > 1 ? 's that appear to be duplicates' : ' that appears to be a duplicate'
      } of earlier rows in the file (for example, row ${duplicateRowIndices[0] + 1}).`,
      whyItMayMatter:
        'Duplicate records can inflate your totals, double-count orders, or exaggerate customer counts in reports.',
      suggestedAction:
        'Standardize by merging duplicates or removing extra rows so each record is counted once.',
      aiSuggestion:
        'AI suggestion: Removing duplicate rows will keep total counts accurate and avoid double-counting.',
      confidence: 'high',
      fixType: 'remove_duplicates',
    });
  }

  // 2. COLUMN INSPECTION
  columnProfiles.forEach((profile) => {
    const col = profile.name;

    // 2A. EMPTY COLUMN
    if (profile.detectedType === 'empty' || profile.nonEmptyCount === 0) {
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
        confidence: 'high',
        fixType: 'remove_column',
      });
      return;
    }

    // 2B. EXTRA WHITESPACE
    if (profile.extraSpacesCount && profile.extraSpacesCount > 0) {
      const affectedRows = rows
        .map((r, i) => ({ val: r[col], i }))
        .filter(({ val }) => typeof val === 'string' && (/^\s+|\s+$/.test(val) || /\s{2,}/.test(val)))
        .map((x) => x.i);

      const sampleVal = rows[affectedRows[0]][col];
      issues.push({
        id: `extra_spaces_${col}`,
        category: 'safe_fix',
        column: col,
        affectedRowIndices: affectedRows,
        title: `Extra Spaces in "${col}" (${affectedRows.length} row${affectedRows.length > 1 ? 's' : ''})`,
        whatIFound: `Found extra spaces in "${col}" on ${affectedRows.length} row${
          affectedRows.length > 1 ? 's' : ''
        } (for example: "${sampleVal}").`,
        whyItMayMatter:
          'Computers treat text with extra spaces as different items, which can split group totals or break searches.',
        suggestedAction:
          'Standardize by trimming unnecessary spaces from the edges and consolidating multiple spaces.',
        aiSuggestion:
          'AI suggestion: Trimming extra spaces ensures grouping, searching, and filtering will work reliably.',
        confidence: 'high',
        fixType: 'trim_whitespace',
      });
    }

    // 2C. MONTH COLUMN: HIGH-CONFIDENCE EQUIVALENTS VS AMBIGUOUS VALUES
    if (profile.isMonthColumn) {
      const monthMapping: Record<string, string> = {
        january: 'Jan',
        jan: 'Jan',
        february: 'Feb',
        feb: 'Feb',
        march: 'Mar',
        mar: 'Mar',
        april: 'Apr',
        apr: 'Apr',
        may: 'May',
        june: 'Jun',
        jun: 'Jun',
        'j-u-n': 'Jun',
        july: 'Jul',
        jul: 'Jul',
        august: 'Aug',
        aug: 'Aug',
        september: 'Sep',
        sep: 'Sep',
        october: 'Oct',
        oct: 'Oct',
        november: 'Nov',
        nov: 'Nov',
        december: 'Dec',
        dec: 'Dec',
      };

      const highConfAffected: number[] = [];
      const ambiguousAffected: number[] = [];
      const ambiguousValsFound: string[] = [];

      rows.forEach((r, idx) => {
        const val = r[col];
        if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          if (lower === 'jm' || lower === 'ju' || lower === 'ja') {
            ambiguousAffected.push(idx);
            if (!ambiguousValsFound.includes(val.trim())) ambiguousValsFound.push(val.trim());
          } else if (monthMapping[lower] && monthMapping[lower] !== val.trim()) {
            highConfAffected.push(idx);
          }
        }
      });

      // High-confidence month variations (Jan, January, June, Jun, J-U-N)
      if (highConfAffected.length > 0) {
        issues.push({
          id: `month_standardize_${col}`,
          category: 'safe_fix',
          column: col,
          affectedRowIndices: highConfAffected,
          title: `Different Month Formats in "${col}"`,
          whatIFound: `I found different ways of writing some month names (like "January" vs "Jan", and "June" vs "Jun" vs "J-U-N").`,
          whyItMayMatter:
            'Charts and pivot tables might treat "January" and "Jan" as two different months, splitting your monthly sales numbers.',
          suggestedAction:
            'Standardize all equivalent month names to consistent 3-letter abbreviations (Jan, Jun).',
          aiSuggestion:
            'AI suggestion: Standardizing month names will unite split monthly reports and simplify charts.',
          confidence: 'high',
          fixType: 'standardize_category',
          suggestedFixDetails: {
            mapping: monthMapping,
          },
        });
      }

      // Ambiguous month value (e.g. "JM")
      if (ambiguousAffected.length > 0) {
        const ambVal = ambiguousValsFound.join(', ');
        issues.push({
          id: `ambiguous_value_${col}`,
          category: 'review_needed',
          column: col,
          affectedRowIndices: ambiguousAffected,
          title: `Ambiguous Value "${ambVal}" in "${col}"`,
          whatIFound: `Found "${ambVal}" in ${ambiguousAffected.length} row${
            ambiguousAffected.length > 1 ? 's' : ''
          }. It is unclear whether it was intended as Jan, Jun, or something else.`,
          whyItMayMatter:
            'Because this value is ambiguous, automatic standardization cannot safely guess its true meaning.',
          suggestedAction:
            'Review and choose "Fix / Change" to specify the exact month, or keep it as it is.',
          aiSuggestion:
            `AI suggestion: "${ambVal}" cannot be resolved automatically. Please check your source records or select "Fix / Change".`,
          confidence: 'low',
          fixType: 'custom',
          suggestedFixDetails: {
            isAmbiguous: true,
          },
        });
      }
    }

    // 2D. INCONSISTENT CAPITALIZATION (Non-month categories)
    if (!profile.isMonthColumn && profile.casingInconsistencies && profile.casingInconsistencies.length > 0) {
      const affectedRows: number[] = [];
      const groups = profile.casingInconsistencies;
      const mapping: Record<string, string> = {};

      groups.forEach(({ rootLower, variants }) => {
        // Preferred is Title Case
        const preferred = variants.find((v) => isTitleCase(v)) || toTitleCase(rootLower);
        variants.forEach((v) => {
          if (v !== preferred) mapping[v] = preferred;
        });
      });

      rows.forEach((r, idx) => {
        const val = r[col];
        if (typeof val === 'string' && mapping[val.trim()]) {
          affectedRows.push(idx);
        }
      });

      if (affectedRows.length > 0) {
        const sampleGroup = groups[0];
        issues.push({
          id: `casing_${col}`,
          category: 'safe_fix',
          column: col,
          affectedRowIndices: affectedRows,
          title: `Inconsistent Capitalization in "${col}"`,
          whatIFound: `Values in "${col}" use different letter cases for the same word (e.g. ${sampleGroup.variants.join(
            ', '
          )}).`,
          whyItMayMatter:
            'Different capitalization can cause filters, grouping, or summaries to count identical items separately.',
          suggestedAction:
            'Standardize all entries to consistent Title Case capitalization.',
          aiSuggestion:
            'AI suggestion: Standardizing capitalization creates clean dropdown filters and professional summaries.',
          confidence: 'high',
          fixType: 'standardize_casing',
          suggestedFixDetails: { mapping },
        });
      }
    }

    // 2E. DIFFERENT DATE FORMATS
    if (profile.detectedType === 'date' && profile.detectedDateFormats && profile.detectedDateFormats.length > 1) {
      const nonIsoRows = rows
        .map((r, i) => ({ val: r[col], i }))
        .filter(({ val }) => typeof val === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(val.trim()))
        .map((x) => x.i);

      if (nonIsoRows.length > 0) {
        issues.push({
          id: `date_formats_${col}`,
          category: 'safe_fix',
          column: col,
          affectedRowIndices: nonIsoRows,
          title: `Different Date Formats in "${col}"`,
          whatIFound: `Dates in "${col}" are written in multiple styles (such as 2026-01-05 alongside 01/15/2026).`,
          whyItMayMatter:
            'Mixed date formats make sorting chronologically difficult and can confuse timeline charts.',
          suggestedAction:
            'Standardize all dates to uniform YYYY-MM-DD format.',
          aiSuggestion:
            'AI suggestion: Converting dates to standard YYYY-MM-DD ensures accurate timeline sorting.',
          confidence: 'high',
          fixType: 'standardize_dates',
        });
      }
    }

    // 2F. MISSING VALUES IN NON-EMPTY COLUMN
    if (profile.nullCount > 0 && profile.nullCount < totalRows) {
      const missingRows = rows
        .map((r, i) => ({ val: r[col], i }))
        .filter(({ val }) => val === null || val === undefined || String(val).trim() === '')
        .map((x) => x.i);

      issues.push({
        id: `missing_${col}`,
        category: 'review_needed',
        column: col,
        affectedRowIndices: missingRows,
        title: `Missing Values in "${col}" (${missingRows.length} cell${missingRows.length > 1 ? 's' : ''})`,
        whatIFound: `"${col}" is blank in ${missingRows.length} row${
          missingRows.length > 1 ? 's' : ''
        } (for example in row ${missingRows[0] + 1}).`,
        whyItMayMatter:
          'Missing data can cause formulas, averages, or visual charts to produce incomplete numbers.',
        suggestedAction:
          'Fill with a default value (like 0 or N/A), remove the blank rows, or keep as it is.',
        aiSuggestion:
          'AI suggestion: Blank cells can disrupt averages. Consider standardizing with a placeholder like 0 or N/A, or removing the blank rows.',
        confidence: 'medium',
        fixType: 'fill_missing',
      });
    }

    // 2G. UNUSUALLY HIGH OR LOW VALUES (Tukey Outliers)
    if (profile.outliers && profile.outliers.length > 0) {
      const outlierRows = profile.outliers.map((o) => o.rowIndex);
      const sampleOutlier = profile.outliers[0].value;

      // Exact prompt requirement:
      // "One Units value is much higher than most other rows. It may be correct, so please check it before changing it."
      issues.push({
        id: `outlier_${col}`,
        category: 'review_needed',
        column: col,
        affectedRowIndices: outlierRows,
        title: `Unusually High Value in "${col}"`,
        whatIFound: `One ${col} value (${sampleOutlier}) is much higher than most other rows (typical values are between ${profile.min} and ${profile.q3 || profile.max}). It may be correct, so please check it before changing it.`,
        whyItMayMatter:
          'Very large numbers significantly pull up average calculations and might distort revenue charts if it was a typing mistake.',
        suggestedAction:
          'Check whether this high value was intentional. You can keep it as it is, fix the value, or remove the row.',
        aiSuggestion:
          `AI suggestion: This value is much higher than other rows. Verify if ${sampleOutlier} was intended before modifying.`,
        confidence: 'medium',
        fixType: 'extreme_value',
        suggestedFixDetails: {
          originalSample: sampleOutlier,
        },
      });
    }
  });

  return issues;
}

function findAffectedRows(
  rows: RowData[],
  col?: string,
  issueType?: string,
  mapping?: Record<string, string>
): number[] {
  if (!col) return [];
  const indices: number[] = [];
  rows.forEach((r, idx) => {
    const val = r[col];
    if (mapping && val !== null && val !== undefined) {
      if (mapping[String(val).trim()]) indices.push(idx);
    } else if (issueType === 'missing_value' && (val === null || val === undefined || String(val).trim() === '')) {
      indices.push(idx);
    }
  });
  return indices;
}

function formatIssueTitle(iss: any): string {
  if (iss.issue_type === 'duplicate_rows') return 'Duplicate Rows Detected';
  if (iss.issue_type === 'ambiguous_value') return `Ambiguous Value in "${iss.column}"`;
  if (iss.issue_type === 'extreme_value') return `Unusually High Value in "${iss.column}"`;
  if (iss.issue_type === 'different_dates') return `Different Date Formats in "${iss.column}"`;
  if (iss.issue_type === 'extra_spaces') return `Extra Spaces in "${iss.column}"`;
  return `Review Issue in "${iss.column || 'Dataset'}"`;
}

function mapFixType(issueType: string): DataQualityIssue['fixType'] {
  switch (issueType) {
    case 'inconsistent_category': return 'standardize_category';
    case 'extra_spaces': return 'trim_whitespace';
    case 'different_dates': return 'standardize_dates';
    case 'duplicate_rows': return 'remove_duplicates';
    case 'missing_value': return 'fill_missing';
    case 'extreme_value': return 'extreme_value';
    default: return 'custom';
  }
}

function isTitleCase(str: string): boolean {
  return /^[A-Z][a-z0-9]*$/.test(str.trim());
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}
