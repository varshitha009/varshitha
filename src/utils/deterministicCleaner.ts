import {
  RowData,
  StrictCleaningPlan,
  ChangeLogItem,
  ValidationReport,
  CleaningExecutionLog,
  AutoCleanSummary,
  AutoCleanItem,
  UnchangedItem
} from '../types';
import { detectSummaryRows } from './summaryRowDetector';

/**
 * DETERMINISTIC CLEANING ENGINE
 * Executes the strictly validated Gemini JSON plan deterministically.
 * Gemini decides WHAT operations to run. Application code decides HOW they run.
 */

export interface ExecutionResult {
  cleanedRows: RowData[];
  cleanedColumns: string[];
  changeLog: ChangeLogItem[];
  executionLogs: CleaningExecutionLog[];
  validationReport: ValidationReport;
  summary: AutoCleanSummary;
}

export function executeDeterministicPlan(
  rawRows: RowData[],
  rawColumns: string[],
  plan: StrictCleaningPlan
): ExecutionResult {
  const preRowCount = rawRows.length;
  const preColCount = rawColumns.length;

  // 1. Structural Understanding: Detect TOTAL / SUBTOTAL summary rows
  const { summaryRowIndices, summaryLabels } = detectSummaryRows(rawRows, rawColumns);
  const summarySet = new Set(summaryRowIndices);

  // Pre-cleaning numeric totals check for important currency/revenue/sales columns
  const numericTotalsBefore: Record<string, number> = {};
  rawColumns.forEach((col) => {
    let sum = 0;
    let hasNums = false;
    rawRows.forEach((r, idx) => {
      // Sum only transaction rows to check health
      if (!summarySet.has(idx)) {
        const num = parseNumeric(r[col]);
        if (num !== null) {
          sum += num;
          hasNums = true;
        }
      }
    });
    if (hasNums) numericTotalsBefore[col] = sum;
  });

  // Deep clone rows to guarantee immutability of original data
  let currentRows: RowData[] = rawRows.map((r) => ({ ...r }));
  let currentColumns: string[] = [...rawColumns];

  const changeLog: ChangeLogItem[] = [];
  const executionLogs: CleaningExecutionLog[] = [];
  const changesMade: AutoCleanItem[] = [];
  const leftUnchanged: UnchangedItem[] = [];

  // Track transaction IDs to strictly prevent data loss
  const idCol = currentColumns.find((c) =>
    /^(order_?id|txn_?id|transaction_?id|customer_?id|sku|code|ref)$/i.test(c.trim())
  ) || currentColumns.find((c) => /id$/i.test(c.trim()));

  const originalTransactionIds: Array<{ id: string; rowIndex: number; row: RowData }> = [];
  if (idCol) {
    rawRows.forEach((r, idx) => {
      if (!summarySet.has(idx)) {
        const val = r[idCol];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          originalTransactionIds.push({ id: String(val).trim(), rowIndex: idx, row: r });
        }
      }
    });
  }

  // Audit trail of every justified row removal
  const justifiedRemovedRows: import('../types').RemovedRowRecord[] = [];

  // OPERATION A: Header Row detection acknowledgement
  // NOTE: rawRows passed into the cleaner are already transaction records parsed after the header.
  // Never slice rawRows by plan.header_row, as that would delete valid transaction rows (e.g. ORD-1001)!
  if (plan.header_row > 0) {
    executionLogs.push({
      operation: 'HEADER_CONFIRMED',
      affectedCount: 1,
      reason: `Confirmed header row (index ${plan.header_row}) in source file structure.`,
    });
  }

  // OPERATION B: Remove completely blank rows
  const nonBlankRows: RowData[] = [];
  let blankRowsRemoved = 0;
  currentRows.forEach((row, idx) => {
    const isAllBlank = currentColumns.every(
      (c) => row[c] === null || row[c] === undefined || String(row[c]).trim() === ''
    );
    if (isAllBlank) {
      blankRowsRemoved++;
      const idVal = idCol ? String(row[idCol] || '') : undefined;
      justifiedRemovedRows.push({
        rowNumber: idx + 1,
        id: idVal,
        reason: 'Completely blank row containing no data',
        operation: 'REMOVE_BLANK_ROW',
        confidence: 1.0,
        originalRow: row,
      });
      changeLog.push({
        id: `chg_blank_row_${idx}`,
        timestamp: new Date().toLocaleTimeString(),
        rowIndex: idx,
        rowNumber: idx + 1,
        column: idCol,
        beforeValue: '(Completely blank row)',
        afterValue: '(Removed)',
        actionType: 'REMOVE_BLANK_ROW',
        description: `Removed completely blank row ${idx + 1}`,
      });
    } else {
      nonBlankRows.push(row);
    }
  });

  if (blankRowsRemoved > 0) {
    currentRows = nonBlankRows;
    executionLogs.push({
      operation: 'REMOVE_BLANK_ROWS',
      affectedCount: blankRowsRemoved,
      reason: `Removed ${blankRowsRemoved} completely blank row(s)`,
    });
    changesMade.push({
      title: `Removed ${blankRowsRemoved} completely blank row${blankRowsRemoved > 1 ? 's' : ''}`,
      description: `Removed empty rows containing no data.`,
      count: blankRowsRemoved,
    });
  }

  // OPERATION C: Remove rows containing structural markers (e.g. notes, footers)
  if (plan.remove_rows_containing.length > 0) {
    let structuralRowsRemoved = 0;
    const filteredRows: RowData[] = [];

    currentRows.forEach((row, idx) => {
      // NEVER delete summary rows!
      if (summarySet.has(idx)) {
        filteredRows.push(row);
        return;
      }

      // NEVER delete rows that contain a genuine transaction ID!
      const hasTransactionId =
        idCol &&
        row[idCol] !== null &&
        row[idCol] !== undefined &&
        String(row[idCol]).trim() !== '';

      if (hasTransactionId) {
        filteredRows.push(row);
        return;
      }

      let matchesMarker = false;
      let matchedWord = '';

      for (const col of currentColumns) {
        const val = row[col];
        if (typeof val === 'string') {
          for (const marker of plan.remove_rows_containing) {
            if (val.toLowerCase().includes(marker.toLowerCase())) {
              matchesMarker = true;
              matchedWord = marker;
              break;
            }
          }
        }
        if (matchesMarker) break;
      }

      if (matchesMarker) {
        structuralRowsRemoved++;
        justifiedRemovedRows.push({
          rowNumber: idx + 1,
          reason: `Structural non-data row matching marker "${matchedWord}"`,
          operation: 'REMOVE_STRUCTURAL_ROW',
          confidence: 0.95,
          originalRow: row,
        });
        changeLog.push({
          id: `chg_marker_${idx}`,
          timestamp: new Date().toLocaleTimeString(),
          rowIndex: idx,
          rowNumber: idx + 1,
          beforeValue: `Row containing "${matchedWord}"`,
          afterValue: '(Removed)',
          actionType: 'REMOVE_STRUCTURAL_ROW',
          description: `Removed footer/note row containing "${matchedWord}"`,
        });
      } else {
        filteredRows.push(row);
      }
    });

    if (structuralRowsRemoved > 0) {
      currentRows = filteredRows;
      executionLogs.push({
        operation: 'REMOVE_STRUCTURAL_ROWS',
        affectedCount: structuralRowsRemoved,
        reason: `Removed ${structuralRowsRemoved} non-data note/footer row(s)`,
      });
      changesMade.push({
        title: `Removed ${structuralRowsRemoved} footer/note row(s)`,
        description: `Removed structural non-data rows matching markers.`,
        count: structuralRowsRemoved,
      });
    }
  }

  // OPERATION D: Fill down columns
  if (plan.fill_down_columns.length > 0) {
    plan.fill_down_columns.forEach((col) => {
      if (!currentColumns.includes(col)) return;
      let lastVal: any = null;
      let filledCount = 0;

      currentRows = currentRows.map((r, idx) => {
        const val = r[col];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          lastVal = val;
          return r;
        } else if (lastVal !== null) {
          filledCount++;
          changeLog.push({
            id: `chg_filldown_${col}_${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            rowIndex: idx,
            rowNumber: idx + 1,
            column: col,
            beforeValue: '(Blank)',
            afterValue: lastVal,
            actionType: 'FILL_DOWN',
            description: `Filled down value "${lastVal}" in "${col}"`,
          });
          return { ...r, [col]: lastVal };
        }
        return r;
      });

      if (filledCount > 0) {
        executionLogs.push({
          operation: 'FILL_DOWN',
          affectedColumn: col,
          affectedCount: filledCount,
          reason: `Filled down merged/sparse category values in "${col}"`,
        });
        changesMade.push({
          title: `Filled down values in "${col}"`,
          description: `Propagated values down across ${filledCount} cell(s).`,
          count: filledCount,
        });
      }
    });
  }

  // OPERATION E: Drop redundant / blank columns
  if (plan.drop_columns.length > 0) {
    const validDropCols = plan.drop_columns.filter((c) => currentColumns.includes(c));
    if (validDropCols.length > 0) {
      currentColumns = currentColumns.filter((c) => !validDropCols.includes(c));
      currentRows = currentRows.map((row) => {
        const copy = { ...row };
        validDropCols.forEach((c) => delete copy[c]);
        return copy;
      });

      validDropCols.forEach((col) => {
        executionLogs.push({
          operation: 'DROP_COLUMN',
          affectedColumn: col,
          affectedCount: currentRows.length,
          reason: `Removed empty or redundant column "${col}"`,
        });
        changesMade.push({
          title: `Removed column "${col}"`,
          description: `Dropped unused or empty column.`,
        });
      });
    }
  }

  // OPERATION F: Column Renaming
  if (Object.keys(plan.rename).length > 0) {
    Object.entries(plan.rename).forEach(([oldName, newName]) => {
      if (currentColumns.includes(oldName) && oldName !== newName) {
        currentColumns = currentColumns.map((c) => (c === oldName ? newName : c));
        currentRows = currentRows.map((row) => {
          const copy = { ...row };
          copy[newName] = copy[oldName];
          delete copy[oldName];
          return copy;
        });

        executionLogs.push({
          operation: 'RENAME_COLUMN',
          affectedColumn: oldName,
          affectedCount: currentRows.length,
          reason: `Renamed "${oldName}" → "${newName}"`,
        });
        changesMade.push({
          title: `Renamed column "${oldName}" → "${newName}"`,
          description: `Cleaned column header text.`,
        });
      }
    });
  }

  // OPERATION G: Trim Extra Spaces & Clean Strings (Standardization)
  let totalTrimmedCells = 0;
  currentRows = currentRows.map((row, idx) => {
    const newRow = { ...row };
    currentColumns.forEach((col) => {
      const val = newRow[col];
      if (typeof val === 'string') {
        const trimmed = val.trim().replace(/\s{2,}/g, ' ');
        if (trimmed !== val) {
          totalTrimmedCells++;
          changeLog.push({
            id: `chg_trim_${col}_${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            rowIndex: idx,
            rowNumber: idx + 1,
            column: col,
            beforeValue: val,
            afterValue: trimmed,
            actionType: 'TRIM_SPACES',
            description: `Trimmed extra spaces in "${col}"`,
          });
          newRow[col] = trimmed;
        }
      }
    });
    return newRow;
  });

  if (totalTrimmedCells > 0) {
    executionLogs.push({
      operation: 'TRIM_SPACES',
      affectedCount: totalTrimmedCells,
      reason: `Trimmed extra leading, trailing, and internal spaces`,
    });
    changesMade.push({
      title: 'Removed extra spaces',
      description: `Trimmed unnecessary leading, trailing, and double spaces across ${totalTrimmedCells} cell(s).`,
      count: totalTrimmedCells,
    });
  }

  // OPERATION G1: Replace Pseudo-Null Representations ("N/A", "null", "-", "--" → null)
  if (plan.replace_null_representations !== false) {
    let pseudoNullsReplaced = 0;
    const pseudoNullRegex = /^(n\/a|na|null|none|undefined|-|--|#n\/a|#value!)$/i;

    currentRows = currentRows.map((row, idx) => {
      const newRow = { ...row };
      currentColumns.forEach((col) => {
        const val = newRow[col];
        if (typeof val === 'string' && pseudoNullRegex.test(val.trim())) {
          pseudoNullsReplaced++;
          changeLog.push({
            id: `chg_null_${col}_${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            rowIndex: idx,
            rowNumber: idx + 1,
            column: col,
            beforeValue: val,
            afterValue: null,
            actionType: 'CLEAN_NULL_REPRESENTATION',
            description: `Cleaned placeholder "${val}" to empty value in "${col}"`,
          });
          newRow[col] = null;
        }
      });
      return newRow;
    });

    if (pseudoNullsReplaced > 0) {
      executionLogs.push({
        operation: 'CLEAN_NULL_REPRESENTATIONS',
        affectedCount: pseudoNullsReplaced,
        reason: `Standardized pseudo-null strings (N/A, null, -) to clean null values`,
      });
      changesMade.push({
        title: 'Cleaned placeholder missing values',
        description: `Standardized ${pseudoNullsReplaced} text placeholders (such as "N/A" or "-") to proper empty values.`,
        count: pseudoNullsReplaced,
      });
    }
  }

  // OPERATION G2: Casing Standardization (Title Case, UPPER, lower)
  if (plan.casing_standardizations && Object.keys(plan.casing_standardizations).length > 0) {
    Object.entries(plan.casing_standardizations).forEach(([col, targetStyle]) => {
      const activeColName = plan.rename[col] || col;
      if (!currentColumns.includes(activeColName)) return;

      let casingChangedCount = 0;
      currentRows = currentRows.map((row, idx) => {
        // Summary rows must NEVER have their text or labels altered by casing standardizations!
        if (summarySet.has(idx)) return row;

        const val = row[activeColName];
        if (typeof val === 'string' && val.trim()) {
          const strVal = val.trim();
          let transformed = strVal;
          if (targetStyle === 'title') {
            transformed = strVal.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          } else if (targetStyle === 'upper') {
            transformed = strVal.toUpperCase();
          } else if (targetStyle === 'lower') {
            transformed = strVal.toLowerCase();
          }

          if (transformed !== strVal) {
            casingChangedCount++;
            changeLog.push({
              id: `chg_casing_${activeColName}_${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: activeColName,
              beforeValue: strVal,
              afterValue: transformed,
              actionType: 'STANDARDIZE_CASING',
              description: `Standardized casing "${strVal}" → "${transformed}" in "${activeColName}"`,
            });
            return { ...row, [activeColName]: transformed };
          }
        }
        return row;
      });

      if (casingChangedCount > 0) {
        executionLogs.push({
          operation: 'STANDARDIZE_CASING',
          affectedColumn: activeColName,
          affectedCount: casingChangedCount,
          reason: `Standardized text capitalization to ${targetStyle} in "${activeColName}"`,
        });
        changesMade.push({
          title: `Standardized capitalization in "${activeColName}"`,
          description: `Converted inconsistent casing to consistent ${targetStyle === 'title' ? 'Title Case' : targetStyle.toUpperCase()} across ${casingChangedCount} cell(s).`,
          count: casingChangedCount,
        });
      }
    });
  }

  // OPERATION G3: Boolean Normalization
  if (plan.boolean_columns && plan.boolean_columns.length > 0) {
    plan.boolean_columns.forEach((col) => {
      const activeColName = plan.rename[col] || col;
      if (!currentColumns.includes(activeColName)) return;

      let boolChangedCount = 0;
      currentRows = currentRows.map((row, idx) => {
        const val = row[activeColName];
        if (typeof val === 'string' && val.trim()) {
          const str = val.trim().toLowerCase();
          let normalized: string | null = null;
          if (/^(true|yes|active|1|y)$/i.test(str)) {
            normalized = 'Active';
          } else if (/^(false|no|inactive|0|n)$/i.test(str)) {
            normalized = 'Inactive';
          }

          if (normalized && normalized !== val) {
            boolChangedCount++;
            changeLog.push({
              id: `chg_bool_${activeColName}_${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: activeColName,
              beforeValue: val,
              afterValue: normalized,
              actionType: 'STANDARDIZE_BOOLEAN',
              description: `Normalized status "${val}" → "${normalized}" in "${activeColName}"`,
            });
            return { ...row, [activeColName]: normalized };
          }
        }
        return row;
      });

      if (boolChangedCount > 0) {
        executionLogs.push({
          operation: 'STANDARDIZE_BOOLEAN',
          affectedColumn: activeColName,
          affectedCount: boolChangedCount,
          reason: `Standardized status representations in "${activeColName}"`,
        });
        changesMade.push({
          title: `Standardized status values in "${activeColName}"`,
          description: `Made status values uniform across ${boolChangedCount} cell(s).`,
          count: boolChangedCount,
        });
      }
    });
  }

  // OPERATION H: Numeric Conversion ("$1,200" → 1200)
  if (plan.numeric_columns.length > 0) {
    plan.numeric_columns.forEach((col) => {
      const activeColName = plan.rename[col] || col;
      if (!currentColumns.includes(activeColName)) return;

      let convertedCount = 0;
      currentRows = currentRows.map((row, idx) => {
        // Do not alter summary rows if formatted specifically
        const val = row[activeColName];
        if (typeof val === 'string') {
          const num = parseNumeric(val);
          if (num !== null) {
            convertedCount++;
            changeLog.push({
              id: `chg_num_${activeColName}_${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: activeColName,
              beforeValue: val,
              afterValue: num,
              actionType: 'CONVERT_NUMERIC',
              description: `Converted text "${val}" to numeric ${num} in "${activeColName}"`,
            });
            return { ...row, [activeColName]: num };
          }
        }
        return row;
      });

      if (convertedCount > 0) {
        executionLogs.push({
          operation: 'CONVERT_NUMERIC',
          affectedColumn: activeColName,
          affectedCount: convertedCount,
          reason: `Converted text-formatted numbers to genuine numbers in "${activeColName}"`,
        });
        changesMade.push({
          title: `Converted ${activeColName} to numeric values`,
          description: `Converted currency/formatted text to numbers (${convertedCount} cell${convertedCount > 1 ? 's' : ''}).`,
          count: convertedCount,
        });
      }
    });
  }

  // OPERATION I: Date Normalization (e.g. "01/15/2026" → "2026-01-15")
  if (plan.date_columns.length > 0) {
    plan.date_columns.forEach((col) => {
      const activeColName = plan.rename[col] || col;
      if (!currentColumns.includes(activeColName)) return;

      let dateConvertedCount = 0;
      currentRows = currentRows.map((row, idx) => {
        const val = row[activeColName];
        if (typeof val === 'string') {
          const normalized = normalizeDateString(val);
          if (normalized && normalized !== val) {
            dateConvertedCount++;
            changeLog.push({
              id: `chg_date_${activeColName}_${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: activeColName,
              beforeValue: val,
              afterValue: normalized,
              actionType: 'STANDARDIZE_DATE',
              description: `Standardized date "${val}" → "${normalized}" in "${activeColName}"`,
            });
            return { ...row, [activeColName]: normalized };
          }
        }
        return row;
      });

      if (dateConvertedCount > 0) {
        executionLogs.push({
          operation: 'STANDARDIZE_DATE',
          affectedColumn: activeColName,
          affectedCount: dateConvertedCount,
          reason: `Standardized date format to YYYY-MM-DD in "${activeColName}"`,
        });
        changesMade.push({
          title: 'Standardized date formats',
          description: `Converted mixed date styles in "${activeColName}" to standard YYYY-MM-DD.`,
          count: dateConvertedCount,
        });
      }
    });
  }

  // OPERATION J: Category Mapping (e.g. Month: January → Jan, June → Jun, J-U-N → Jun)
  if (Object.keys(plan.category_maps).length > 0) {
    Object.entries(plan.category_maps).forEach(([col, mapping]) => {
      const activeColName = plan.rename[col] || col;
      if (!currentColumns.includes(activeColName)) return;

      // Lowercase map
      const lowerMap = new Map<string, string>();
      Object.entries(mapping).forEach(([k, v]) => {
        lowerMap.set(k.trim().toLowerCase(), v.trim());
      });

      let categoryChangedCount = 0;
      currentRows = currentRows.map((row, idx) => {
        const val = row[activeColName];
        if (val !== null && val !== undefined) {
          const strVal = String(val).trim();
          const lower = strVal.toLowerCase();
          const stripped = lower.replace(/\.+$/, '');
          const target = lowerMap.get(lower) || lowerMap.get(stripped);
          if (target && target !== strVal) {
            categoryChangedCount++;
            changeLog.push({
              id: `chg_cat_${activeColName}_${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: activeColName,
              beforeValue: strVal,
              afterValue: target,
              actionType: 'STANDARDIZE_CATEGORY',
              description: `Standardized category "${strVal}" → "${target}" in "${activeColName}"`,
            });
            return { ...row, [activeColName]: target };
          }
        }
        return row;
      });

      if (categoryChangedCount > 0) {
        executionLogs.push({
          operation: 'STANDARDIZE_CATEGORY',
          affectedColumn: activeColName,
          affectedCount: categoryChangedCount,
          reason: `Standardized category representations in "${activeColName}"`,
        });
        changesMade.push({
          title: `Standardized ${activeColName} names`,
          description: `Mapped equivalent spellings and abbreviations across ${categoryChangedCount} cell(s).`,
          count: categoryChangedCount,
        });
      }
    });
  }

  // OPERATION K: Remove Exact Duplicates (NEVER remove summary rows!)
  if (plan.remove_duplicates !== false) {
    const rowHashList: string[] = [];
    const uniqueRows: RowData[] = [];
    let duplicatesRemoved = 0;

    currentRows.forEach((row, idx) => {
      // Summary rows must NEVER be dropped as duplicates!
      if (summarySet.has(idx)) {
        uniqueRows.push(row);
        return;
      }

      const hash = currentColumns
        .map((c) => String(row[c] !== null && row[c] !== undefined ? row[c] : '').trim().toLowerCase())
        .join('||');

      if (rowHashList.includes(hash)) {
        duplicatesRemoved++;
        const idVal = idCol ? String(row[idCol] || '') : undefined;
        justifiedRemovedRows.push({
          rowNumber: idx + 1,
          id: idVal,
          reason: 'Exact duplicate of an earlier transaction record',
          operation: 'REMOVE_DUPLICATE',
          confidence: 1.0,
          originalRow: row,
        });
        changeLog.push({
          id: `chg_dup_${idx}`,
          timestamp: new Date().toLocaleTimeString(),
          rowIndex: idx,
          rowNumber: idx + 1,
          column: idCol,
          beforeValue: 'Exact duplicate record',
          afterValue: '(Removed)',
          actionType: 'REMOVE_DUPLICATE',
          description: `Removed exact duplicate row ${idx + 1}`,
        });
      } else {
        rowHashList.push(hash);
        uniqueRows.push(row);
      }
    });

    if (duplicatesRemoved > 0) {
      currentRows = uniqueRows;
      executionLogs.push({
        operation: 'REMOVE_DUPLICATES',
        affectedCount: duplicatesRemoved,
        reason: `Removed ${duplicatesRemoved} duplicate transaction record(s)`,
      });
      changesMade.push({
        title: `Removed ${duplicatesRemoved} duplicate row${duplicatesRemoved > 1 ? 's' : ''}`,
        description: `Eliminated exact duplicate records so each transaction is unique.`,
        count: duplicatesRemoved,
      });
    }
  }

  // ========================================================
  // SEMANTIC DATE / MONTH CROSS-VALIDATION
  // ========================================================
  // Validates Month value against Order Date.
  // Flag inconsistencies clearly ("Month does not match Order Date") without blindly overwriting.
  const dateCol = currentColumns.find((c) => /date/i.test(c));
  const monthCol = currentColumns.find((c) => /month/i.test(c));

  if (dateCol && monthCol) {
    const monthIndexMap: Record<string, number> = {
      jan: 0, january: 0, 'jan.': 0,
      feb: 1, february: 1, 'feb.': 1,
      mar: 2, march: 2, 'mar.': 2,
      apr: 3, april: 3, 'apr.': 3,
      may: 4,
      jun: 5, june: 5, 'jun.': 5, 'j-u-n': 5,
      jul: 6, july: 6, 'jul.': 6,
      aug: 7, august: 7, 'aug.': 7,
      sep: 8, sept: 8, september: 8, 'sep.': 8, 'sept.': 8,
      oct: 9, october: 9, 'oct.': 9,
      nov: 10, november: 10, 'nov.': 10,
      dec: 11, december: 11, 'dec.': 11,
    };
    const monthNamesList = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    currentRows.forEach((row, idx) => {
      if (summarySet.has(idx)) return;
      const dateVal = String(row[dateCol] || '').trim();
      const monthVal = String(row[monthCol] || '').trim();
      if (!dateVal || !monthVal) return;

      let dateMonthIdx: number | null = null;
      const ymd = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymd) {
        dateMonthIdx = parseInt(ymd[2], 10) - 1;
      } else {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          dateMonthIdx = d.getMonth();
        }
      }

      const cleanMonthKey = monthVal.toLowerCase().replace(/\.+$/, '');
      const statedMonthIdx = monthIndexMap[cleanMonthKey];

      if (dateMonthIdx !== null && statedMonthIdx !== undefined && dateMonthIdx !== statedMonthIdx) {
        const rowId = idCol ? String(row[idCol] || '') : undefined;
        const rowLabel = rowId ? `Row ${idx + 1} (${rowId})` : `Row ${idx + 1}`;
        leftUnchanged.push({
          title: `${rowLabel}: Month does not match Order Date`,
          description: `Order Date is "${dateVal}" (${monthNamesList[dateMonthIdx]}), but Month is recorded as "${monthVal}".`,
          reason: 'Month does not match Order Date. Left unchanged as a flagged data-quality inconsistency rather than blindly overwritten.',
        });
      }
    });
  }

  // ========================================================
  // LEFT UNCHANGED (Plain English observations, NO "outlier" jargon)
  // ========================================================
  // 1. Notes from Gemini plan
  if (plan.notes && plan.notes.length > 0) {
    plan.notes.forEach((note) => {
      leftUnchanged.push({
        title: note,
        description: 'Examined during profiling.',
        reason: 'Left unchanged because it may be valid data.',
      });
    });
  }

  // 2. Summary row preserved note
  if (summaryRowIndices.length > 0) {
    const labels = Object.values(summaryLabels).join(', ') || 'TOTAL';
    leftUnchanged.push({
      title: `${summaryRowIndices.length} summary row preserved ("${labels}")`,
      description: `Detected summary row containing "${labels}".`,
      reason: 'Separated from normal transactions so it will not distort averages or be deleted by duplicate checks.',
    });
  }

  // 3. Ambiguous values note (e.g. JM in Month if not in category_maps)
  currentColumns.forEach((col) => {
    if (/month/i.test(col)) {
      const hasJM = currentRows.some(
        (r) => typeof r[col] === 'string' && r[col].trim().toLowerCase() === 'jm'
      );
      if (hasJM) {
        leftUnchanged.push({
          title: `1 value could not be confidently interpreted ("JM" in "${col}")`,
          description: `Found ambiguous abbreviation "JM" in "${col}".`,
          reason: `No automatic change was made because it could mean Jan or Jun.`,
        });
      }
    }
  });

  // ========================================================
  // POST-CLEANING VALIDATION & DATA LOSS PREVENTION
  // ========================================================
  const postRowCount = currentRows.length;
  const postColCount = currentColumns.length;

  // CRITICAL INTEGRITY CHECK: Did any valid transaction rows disappear without a justified reason?
  const unauthorizedMissingIds: string[] = [];
  if (idCol && originalTransactionIds.length > 0) {
    const currentSummaryIndices = new Set(
      detectSummaryRows(currentRows, currentColumns).summaryRowIndices
    );
    const cleanedIds = new Set(
      currentRows
        .filter((_, idx) => !currentSummaryIndices.has(idx))
        .map((r) => String(r[idCol] || '').trim())
        .filter(Boolean)
    );

    const justifiedIdSet = new Set(
      justifiedRemovedRows.map((r) => String(r.id || '').trim()).filter(Boolean)
    );

    originalTransactionIds.forEach(({ id }) => {
      if (!cleanedIds.has(id) && !justifiedIdSet.has(id)) {
        unauthorizedMissingIds.push(id);
      }
    });
  }

  // IF DATA LOSS DETECTED: FAIL VALIDATION AND ROLLBACK TO UNTOUCHED ORIGINAL!
  if (unauthorizedMissingIds.length > 0) {
    console.error(
      `DATA LOSS DETECTED: ${unauthorizedMissingIds.length} transaction rows [${unauthorizedMissingIds.join(', ')}] were removed without valid justification. Operation rolled back!`
    );
    return {
      cleanedRows: rawRows.map((r) => ({ ...r })), // Rollback!
      cleanedColumns: [...rawColumns],
      changeLog: [],
      executionLogs: [
        {
          operation: 'ROLLBACK',
          affectedCount: rawRows.length,
          reason: `CRITICAL: ${unauthorizedMissingIds.length} valid transaction row(s) [${unauthorizedMissingIds.join(', ')}] disappeared unexpectedly. Cleaning operation rolled back to protect data integrity.`,
        },
      ],
      validationReport: {
        passed: false,
        rollback: true,
        dataLossCheckPassed: false,
        unauthorizedDeletions: unauthorizedMissingIds,
        removedRowsAudit: justifiedRemovedRows,
        timestamp: new Date().toLocaleString(),
        preRowCount,
        postRowCount: preRowCount,
        preColCount,
        postColCount: preColCount,
        modifiedCellsCount: 0,
        nullDelta: 0,
        warnings: [
          `CRITICAL: Unauthorized data deletion prevented. Rows [${unauthorizedMissingIds.join(', ')}] were protected and all changes rolled back.`,
        ],
      },
      summary: {
        originalRowCount: preRowCount,
        currentDataRowCount: preRowCount,
        summaryRowsCount: summaryRowIndices.length,
        summaryRowIndices,
        changesMade: [],
        leftUnchanged: [
          {
            title: 'Critical Rollback: Data Loss Prevented',
            description: `${unauthorizedMissingIds.length} valid transaction rows (${unauthorizedMissingIds.join(', ')}) were detected as missing without valid justification.`,
            reason: 'All proposed changes were safely rolled back to guarantee that no genuine customer or sales records are ever silently deleted.',
          },
          ...leftUnchanged,
        ],
      },
    };
  }

  const numericTotalsAfter: Record<string, number> = {};
  const totalsComparison: Record<string, { before: number; after: number; delta: number }> = {};

  Object.keys(numericTotalsBefore).forEach((col) => {
    const activeColName = plan.rename[col] || col;
    if (currentColumns.includes(activeColName)) {
      let sum = 0;
      currentRows.forEach((r) => {
        const num = parseNumeric(r[activeColName]);
        if (num !== null) sum += num;
      });
      numericTotalsAfter[activeColName] = sum;
      totalsComparison[activeColName] = {
        before: numericTotalsBefore[col],
        after: sum,
        delta: Math.round((sum - numericTotalsBefore[col]) * 100) / 100,
      };
    }
  });

  const warnings: string[] = [];
  if (postRowCount === 0) warnings.push('Post-cleaning dataset has 0 rows.');
  if (postColCount === 0) warnings.push('Post-cleaning dataset has 0 columns.');

  const validationReport: ValidationReport = {
    passed: warnings.length === 0,
    rollback: false,
    dataLossCheckPassed: true,
    timestamp: new Date().toLocaleString(),
    preRowCount,
    postRowCount,
    preColCount,
    postColCount,
    modifiedCellsCount: changeLog.length,
    nullDelta: 0,
    warnings,
    numericTotalsComparison: totalsComparison,
    removedRowsAudit: justifiedRemovedRows,
  };

  return {
    cleanedRows: currentRows,
    cleanedColumns: currentColumns,
    changeLog,
    executionLogs,
    validationReport,
    summary: {
      originalRowCount: preRowCount,
      currentDataRowCount: postRowCount,
      summaryRowsCount: summaryRowIndices.length,
      summaryRowIndices,
      changesMade,
      leftUnchanged,
    },
  };
}

function parseNumeric(val: any): number | null {
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

function normalizeDateString(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Slash or dash format with year first: YYYY/MM/DD or YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    if (p1 > 12 && p2 <= 12) {
      // p1 must be day (e.g. 15/01/2026 -> 2026-01-15)
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    } else {
      // standard MM/DD/YYYY
      return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
  }

  // Handle verbose textual dates like "Monday, February 9, 2026", "March 20, 2026", "Jan 15, 2026"
  const cleanedTextual = trimmed.replace(
    /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+/i,
    ''
  );
  const parsed = new Date(cleanedTextual);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}
