import { RowData, ChangeLogItem, ValidationReport, DatasetVersion } from '../types';

/**
 * DETERMINISTIC DATA CLEANING & VALIDATION ENGINE
 * Executes structured data transformations immutably and deterministically.
 * Generates transparent audit change logs and post-execution validation reports.
 */

export interface TransformationStep {
  type:
    | 'TRIM_SPACES'
    | 'STANDARDIZE_CASING'
    | 'MAP_VALUES'
    | 'STANDARDIZE_DATES'
    | 'REMOVE_DUPLICATES'
    | 'FILL_MISSING'
    | 'REMOVE_ROWS'
    | 'REMOVE_COLUMN'
    | 'REPLACE_VALUE';
  column?: string;
  params?: Record<string, any>;
  description: string;
}

export function executeCleaningPipeline(
  originalRows: RowData[],
  originalColumns: string[],
  steps: TransformationStep[]
): {
  newRows: RowData[];
  newColumns: string[];
  changeLog: ChangeLogItem[];
  validationReport: ValidationReport;
  summaryText: string;
} {
  const preRowCount = originalRows.length;
  const preColCount = originalColumns.length;
  const preNullCount = countNulls(originalRows, originalColumns);

  // Deep clone to ensure immutability
  let currentRows: RowData[] = originalRows.map((r) => ({ ...r }));
  let currentColumns: string[] = [...originalColumns];
  const changeLog: ChangeLogItem[] = [];

  steps.forEach((step) => {
    switch (step.type) {
      case 'TRIM_SPACES': {
        const col = step.column;
        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const colsToTrim = col ? [col] : currentColumns;
          colsToTrim.forEach((c) => {
            const val = newRow[c];
            if (typeof val === 'string') {
              const trimmed = val.trim().replace(/\s{2,}/g, ' ');
              if (trimmed !== val) {
                changeLog.push({
                  id: `chg_${Date.now()}_${idx}_${c}`,
                  timestamp: new Date().toLocaleTimeString(),
                  rowIndex: idx,
                  rowNumber: idx + 1,
                  column: c,
                  beforeValue: val,
                  afterValue: trimmed,
                  actionType: 'TRIM_SPACES',
                  description: `Trimmed extra spaces in "${c}"`,
                });
                newRow[c] = trimmed;
              }
            }
          });
          return newRow;
        });
        break;
      }

      case 'STANDARDIZE_CASING': {
        const col = step.column;
        if (!col) break;
        const targetCase = step.params?.casing || 'title'; // 'title' | 'upper' | 'lower'
        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const val = newRow[col];
          if (typeof val === 'string') {
            let transformed = val;
            if (targetCase === 'title') transformed = toTitleCase(val.trim());
            else if (targetCase === 'upper') transformed = val.trim().toUpperCase();
            else if (targetCase === 'lower') transformed = val.trim().toLowerCase();

            if (transformed !== val) {
              changeLog.push({
                id: `chg_${Date.now()}_${idx}_${col}`,
                timestamp: new Date().toLocaleTimeString(),
                rowIndex: idx,
                rowNumber: idx + 1,
                column: col,
                beforeValue: val,
                afterValue: transformed,
                actionType: 'STANDARDIZE_CASING',
                description: `Standardized casing to ${targetCase} in "${col}"`,
              });
              newRow[col] = transformed;
            }
          }
          return newRow;
        });
        break;
      }

      case 'MAP_VALUES': {
        const col = step.column;
        const mapping: Record<string, string> = step.params?.mapping || {};
        if (!col || Object.keys(mapping).length === 0) break;

        // Build case-insensitive lookup
        const lowerMapping = new Map<string, string>();
        Object.entries(mapping).forEach(([k, v]) => {
          lowerMapping.set(k.trim().toLowerCase(), v);
        });

        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const val = newRow[col];
          if (val !== null && val !== undefined) {
            const strVal = String(val).trim();
            const lower = strVal.toLowerCase();
            if (lowerMapping.has(lower)) {
              const target = lowerMapping.get(lower)!;
              if (target !== strVal) {
                changeLog.push({
                  id: `chg_${Date.now()}_${idx}_${col}`,
                  timestamp: new Date().toLocaleTimeString(),
                  rowIndex: idx,
                  rowNumber: idx + 1,
                  column: col,
                  beforeValue: val,
                  afterValue: target,
                  actionType: 'MAP_VALUES',
                  description: `Standardized "${strVal}" → "${target}" in "${col}"`,
                });
                newRow[col] = target;
              }
            }
          }
          return newRow;
        });
        break;
      }

      case 'STANDARDIZE_DATES': {
        const col = step.column;
        if (!col) break;
        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const val = newRow[col];
          if (typeof val === 'string') {
            const stdDate = normalizeDate(val.trim());
            if (stdDate && stdDate !== val) {
              changeLog.push({
                id: `chg_${Date.now()}_${idx}_${col}`,
                timestamp: new Date().toLocaleTimeString(),
                rowIndex: idx,
                rowNumber: idx + 1,
                column: col,
                beforeValue: val,
                afterValue: stdDate,
                actionType: 'STANDARDIZE_DATES',
                description: `Standardized date to YYYY-MM-DD in "${col}"`,
              });
              newRow[col] = stdDate;
            }
          }
          return newRow;
        });
        break;
      }

      case 'REMOVE_DUPLICATES': {
        const rowHashList: string[] = [];
        const filtered: RowData[] = [];
        currentRows.forEach((row, idx) => {
          const hash = currentColumns
            .map((c) => String(row[c] !== null && row[c] !== undefined ? row[c] : '').trim().toLowerCase())
            .join('||');
          if (rowHashList.includes(hash)) {
            changeLog.push({
              id: `chg_${Date.now()}_${idx}_dup`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              beforeValue: 'Duplicate Record',
              afterValue: '(Removed)',
              actionType: 'REMOVE_DUPLICATES',
              description: `Removed duplicate row ${idx + 1}`,
            });
          } else {
            rowHashList.push(hash);
            filtered.push(row);
          }
        });
        currentRows = filtered;
        break;
      }

      case 'FILL_MISSING': {
        const col = step.column;
        const fillValue = step.params?.value ?? 'N/A';
        if (!col) break;

        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const val = newRow[col];
          if (val === null || val === undefined || String(val).trim() === '') {
            changeLog.push({
              id: `chg_${Date.now()}_${idx}_${col}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: col,
              beforeValue: '(blank cell)',
              afterValue: fillValue,
              actionType: 'FILL_MISSING',
              description: `Filled missing value in "${col}" with "${fillValue}"`,
            });
            newRow[col] = fillValue;
          }
          return newRow;
        });
        break;
      }

      case 'REMOVE_ROWS': {
        const indicesToRemove = new Set<number>(step.params?.rowIndices || []);
        currentRows = currentRows.filter((_, idx) => {
          if (indicesToRemove.has(idx)) {
            changeLog.push({
              id: `chg_${Date.now()}_${idx}_del`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              beforeValue: 'Data Record',
              afterValue: '(Removed)',
              actionType: 'REMOVE_ROWS',
              description: `Removed row ${idx + 1}`,
            });
            return false;
          }
          return true;
        });
        break;
      }

      case 'REMOVE_COLUMN': {
        const col = step.column;
        if (!col) break;
        currentColumns = currentColumns.filter((c) => c !== col);
        currentRows = currentRows.map((row) => {
          const copy = { ...row };
          delete copy[col];
          return copy;
        });
        changeLog.push({
          id: `chg_${Date.now()}_col_${col}`,
          timestamp: new Date().toLocaleTimeString(),
          rowIndex: -1,
          rowNumber: 0,
          column: col,
          beforeValue: `Column "${col}"`,
          afterValue: '(Removed)',
          actionType: 'REMOVE_COLUMN',
          description: `Deleted column "${col}" from dataset`,
        });
        break;
      }

      case 'REPLACE_VALUE': {
        const col = step.column;
        const targetIndices: number[] = step.params?.rowIndices || [];
        const fromVal = step.params?.from;
        const toVal = step.params?.to;
        if (!col || toVal === undefined) break;

        currentRows = currentRows.map((row, idx) => {
          const newRow = { ...row };
          const shouldUpdate =
            targetIndices.length > 0
              ? targetIndices.includes(idx)
              : fromVal !== undefined
              ? String(newRow[col] ?? '').trim().toLowerCase() === String(fromVal).trim().toLowerCase()
              : false;

          if (shouldUpdate) {
            const oldVal = newRow[col];
            changeLog.push({
              id: `chg_${Date.now()}_${idx}_${col}`,
              timestamp: new Date().toLocaleTimeString(),
              rowIndex: idx,
              rowNumber: idx + 1,
              column: col,
              beforeValue: oldVal,
              afterValue: toVal,
              actionType: 'REPLACE_VALUE',
              description: `Changed "${oldVal}" to "${toVal}" in "${col}"`,
            });
            newRow[col] = toVal;
          }
          return newRow;
        });
        break;
      }
    }
  });

  const postRowCount = currentRows.length;
  const postColCount = currentColumns.length;
  const postNullCount = countNulls(currentRows, currentColumns);
  const nullDelta = postNullCount - preNullCount;

  const warnings: string[] = [];
  if (postRowCount === 0) warnings.push('Dataset contains 0 rows after transformations.');
  if (postColCount === 0) warnings.push('All columns have been removed.');
  if (nullDelta > 0) warnings.push(`Transformation introduced ${nullDelta} additional blank cells.`);

  const validationReport: ValidationReport = {
    passed: warnings.length === 0,
    timestamp: new Date().toLocaleString(),
    preRowCount,
    postRowCount,
    preColCount,
    postColCount,
    modifiedCellsCount: changeLog.length,
    nullDelta,
    warnings,
  };

  const summaryText = `Applied ${steps.length} transformation rule(s). Modified ${changeLog.length} cell(s) across ${postRowCount} rows.`;

  return {
    newRows: currentRows,
    newColumns: currentColumns,
    changeLog,
    validationReport,
    summaryText,
  };
}

export function createNewDatasetVersion(
  label: string,
  newRows: RowData[],
  newColumns: string[],
  changeLog: ChangeLogItem[],
  validationReport: ValidationReport,
  versionNumber: number
): DatasetVersion {
  return {
    id: `v_${Date.now()}`,
    versionNumber,
    label,
    createdAt: new Date().toLocaleTimeString(),
    data: newRows,
    columns: newColumns,
    appliedChanges: changeLog.map((c) => c.description),
    changeLog,
    validationReport,
  };
}

function countNulls(rows: RowData[], cols: string[]): number {
  let count = 0;
  rows.forEach((r) => {
    cols.forEach((c) => {
      const val = r[c];
      if (val === null || val === undefined || String(val).trim() === '') {
        count++;
      }
    });
  });
  return count;
}

function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

function normalizeDate(str: string): string | null {
  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const m = mdy[1].padStart(2, '0');
    const d = mdy[2].padStart(2, '0');
    const y = mdy[3];
    return `${y}-${m}-${d}`;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
}
