import { RowData, DataQualityIssue, ChangeLogItem, ValidationReport } from '../types';
import { executeCleaningPipeline, TransformationStep } from './cleaningEngine';

export type ActionType = 'keep' | 'standardize' | 'remove' | 'fix';

export interface ActionPreviewItem {
  rowNumber?: number;
  from: string;
  to: string;
  column?: string;
  description?: string;
}

export interface ActionPreview {
  action: ActionType;
  actionLabel: string;
  title: string;
  summary: string;
  whatIUnderstood?: string;
  whatWillChange?: string;
  changesPreview: ActionPreviewItem[];
  changeCount: number;
  isExecutable: boolean;
  unsupportedReason?: string;
}

/**
 * Generates an interactive confirmation preview BEFORE applying any changes.
 * Never modifies the underlying dataset until the user explicitly confirms.
 */
export function generateActionPreview(
  action: ActionType,
  issue: DataQualityIssue,
  rows: RowData[],
  customInput?: string
): ActionPreview {
  switch (action) {
    case 'keep': {
      return {
        action: 'keep',
        actionLabel: 'KEEP AS IT IS',
        title: 'Keep Data As It Is',
        summary: 'Leave the existing data unchanged.',
        whatIUnderstood: 'Keep all current values as they are without modifying the dataset.',
        whatWillChange: '0 values will change. Your data remains in its exact current state.',
        changesPreview: [],
        changeCount: 0,
        isExecutable: true,
      };
    }

    case 'standardize': {
      return buildStandardizePreview(issue, rows);
    }

    case 'remove': {
      return buildRemovePreview(issue, rows);
    }

    case 'fix': {
      return buildFixPreview(issue, rows, customInput || '');
    }
  }
}

function buildStandardizePreview(
  issue: DataQualityIssue,
  rows: RowData[]
): ActionPreview {
  const col = issue.column;
  const changes: ActionPreviewItem[] = [];

  // Check if issue is ambiguous (e.g., JM) where automatic standardization is not safe
  if (
    issue.id.includes('ambiguous') ||
    issue.suggestedFixDetails?.isAmbiguous ||
    issue.whatIFound.includes('"JM"') ||
    issue.whatIFound.includes("'JM'")
  ) {
    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: 'Standardize Not Available (Ambiguous Value)',
      summary: 'Value meaning is ambiguous.',
      whatIUnderstood: "I found an ambiguous abbreviation, but I cannot confidently determine its intended meaning.",
      whatWillChange:
        "Because this value is ambiguous, automatic standardization cannot guess whether it means Jan or Jun. Please choose 'Fix / Change' to specify what you want changed.",
      changesPreview: [],
      changeCount: 0,
      isExecutable: false,
      unsupportedReason:
        "Please select 'Fix / Change' and type your intended value (for example: 'Change JM to Jun').",
    };
  }

  // Duplicate rows standardization
  if (issue.fixType === 'remove_duplicates' || issue.id.includes('duplicate')) {
    issue.affectedRowIndices.forEach((idx) => {
      changes.push({
        rowNumber: idx + 1,
        from: 'Duplicate row',
        to: 'Merged into 1 clean record',
        description: `Row ${idx + 1} will be merged`,
      });
    });

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: 'Standardize Duplicates',
      summary: 'Merge duplicate records so each row is unique.',
      whatIUnderstood: `Merge ${issue.affectedRowIndices.length} duplicate row(s) to leave only one unique copy of each record.`,
      whatWillChange: `${issue.affectedRowIndices.length} duplicate row(s) will be merged.`,
      changesPreview: changes,
      changeCount: issue.affectedRowIndices.length,
      isExecutable: true,
    };
  }

  // Missing values standardization
  if (issue.fixType === 'fill_missing' && col) {
    const isNumCol = rows.some((r) => typeof r[col] === 'number' && !isNaN(r[col]));
    const standardPlaceholder = isNumCol ? '0' : 'N/A';

    issue.affectedRowIndices.forEach((idx) => {
      changes.push({
        rowNumber: idx + 1,
        column: col,
        from: '(Blank cell)',
        to: standardPlaceholder,
      });
    });

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: `Standardize Missing Values in "${col}"`,
      summary: `Fill blank cells with standard placeholder "${standardPlaceholder}".`,
      whatIUnderstood: `Fill ${issue.affectedRowIndices.length} blank cell(s) in "${col}" with "${standardPlaceholder}".`,
      whatWillChange: `${issue.affectedRowIndices.length} blank cell(s) will be filled with "${standardPlaceholder}".`,
      changesPreview: changes,
      changeCount: issue.affectedRowIndices.length,
      isExecutable: true,
    };
  }

  // Extra spaces trimming
  if (issue.fixType === 'trim_whitespace' && col) {
    issue.affectedRowIndices.forEach((idx) => {
      const val = rows[idx]?.[col];
      if (typeof val === 'string') {
        const trimmed = val.trim().replace(/\s{2,}/g, ' ');
        if (trimmed !== val) {
          changes.push({
            rowNumber: idx + 1,
            column: col,
            from: `"${val}"`,
            to: `"${trimmed}"`,
          });
        }
      }
    });

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: `Standardize Spacing in "${col}"`,
      summary: 'Remove extra leading, trailing, and double spaces.',
      whatIUnderstood: `Trim extra spaces in "${col}" across ${changes.length} row(s).`,
      whatWillChange: `${changes.length} value(s) will be standardized with clean spacing.`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: true,
    };
  }

  // Month & Semantic Category Equivalence
  if (col && (issue.fixType === 'standardize_category' || /month/i.test(col))) {
    const monthTargetMap: Record<string, string> = {
      january: 'Jan',
      jan: 'Jan',
      'j-u-n': 'Jun',
      june: 'Jun',
      jun: 'Jun',
      february: 'Feb',
      feb: 'Feb',
      march: 'Mar',
      mar: 'Mar',
      april: 'Apr',
      apr: 'Apr',
      may: 'May',
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

    issue.affectedRowIndices.forEach((idx) => {
      const val = rows[idx]?.[col];
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        const target = monthTargetMap[lower] || issue.suggestedFixDetails?.mapping?.[val] || toTitleCase(val.trim());
        if (target && target !== val) {
          changes.push({
            rowNumber: idx + 1,
            column: col,
            from: val,
            to: target,
          });
        }
      }
    });

    if (changes.length === 0) {
      rows.forEach((r, idx) => {
        const val = r[col];
        if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          const target = monthTargetMap[lower];
          if (target && target !== val) {
            changes.push({
              rowNumber: idx + 1,
              column: col,
              from: val,
              to: target,
            });
          }
        }
      });
    }

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: `Standardize ${col} Names`,
      summary: 'Make clearly equivalent month names consistent with standard 3-letter format (Jan, Jun).',
      whatIUnderstood: `Standardize equivalent month names in "${col}" to uniform 3-letter abbreviations.`,
      whatWillChange: `${changes.length} value(s) will change.`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
    };
  }

  // Capitalization standardization
  if (issue.fixType === 'standardize_casing' && col) {
    issue.affectedRowIndices.forEach((idx) => {
      const val = rows[idx]?.[col];
      if (typeof val === 'string') {
        const titleCase = toTitleCase(val.trim());
        if (titleCase !== val) {
          changes.push({
            rowNumber: idx + 1,
            column: col,
            from: val,
            to: titleCase,
          });
        }
      }
    });

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: `Standardize Capitalization in "${col}"`,
      summary: 'Unify words to consistent Title Case.',
      whatIUnderstood: `Make all entries in "${col}" use consistent Title Case capitalization.`,
      whatWillChange: `${changes.length} value(s) will change.`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
    };
  }

  // Date format standardization
  if (issue.fixType === 'standardize_dates' && col) {
    issue.affectedRowIndices.forEach((idx) => {
      const val = rows[idx]?.[col];
      if (typeof val === 'string') {
        const stdDate = normalizeDateString(val.trim());
        if (stdDate && stdDate !== val) {
          changes.push({
            rowNumber: idx + 1,
            column: col,
            from: val,
            to: stdDate,
          });
        }
      }
    });

    return {
      action: 'standardize',
      actionLabel: 'STANDARDIZE',
      title: `Standardize Date Formats in "${col}"`,
      summary: 'Convert all dates to standard YYYY-MM-DD format.',
      whatIUnderstood: `Convert all dates in "${col}" to standard YYYY-MM-DD.`,
      whatWillChange: `${changes.length} date value(s) will change.`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
    };
  }

  // Fallback
  return {
    action: 'standardize',
    actionLabel: 'STANDARDIZE',
    title: `Standardize "${col || 'Data'}"`,
    summary: 'Make equivalent values consistent.',
    whatIUnderstood: `Standardize formatting in "${col || 'dataset'}".`,
    whatWillChange: `${issue.affectedRowIndices.length} row(s) will be standardized.`,
    changesPreview: issue.affectedRowIndices.slice(0, 5).map((idx) => ({
      rowNumber: idx + 1,
      column: col,
      from: String(rows[idx]?.[col || ''] ?? ''),
      to: 'Standard format',
    })),
    changeCount: issue.affectedRowIndices.length,
    isExecutable: true,
  };
}

function buildRemovePreview(
  issue: DataQualityIssue,
  rows: RowData[]
): ActionPreview {
  const col = issue.column;
  const changes: ActionPreviewItem[] = [];

  // Remove duplicate rows
  if (issue.fixType === 'remove_duplicates' || issue.id.includes('duplicate')) {
    issue.affectedRowIndices.forEach((idx) => {
      changes.push({
        rowNumber: idx + 1,
        from: 'Duplicate row',
        to: '(Row removed)',
        description: `Row ${idx + 1} will be removed from the dataset`,
      });
    });

    return {
      action: 'remove',
      actionLabel: 'REMOVE',
      title: 'Remove Duplicate Rows',
      summary: `Remove ${issue.affectedRowIndices.length} duplicate row(s) completely from the dataset.`,
      whatIUnderstood: `Remove ${issue.affectedRowIndices.length} duplicate row(s). The total row count will decrease from ${rows.length} to ${rows.length - issue.affectedRowIndices.length}.`,
      whatWillChange: `${issue.affectedRowIndices.length} row(s) will be deleted.`,
      changesPreview: changes,
      changeCount: issue.affectedRowIndices.length,
      isExecutable: true,
    };
  }

  // Remove empty column
  if ((issue.fixType === 'remove_column' || issue.id.includes('empty_col')) && col) {
    return {
      action: 'remove',
      actionLabel: 'REMOVE',
      title: `Remove Empty Column "${col}"`,
      summary: `Remove the column "${col}" because it contains no data across all rows.`,
      whatIUnderstood: `Delete the empty column "${col}" from the dataset.`,
      whatWillChange: `Column "${col}" will be removed across all ${rows.length} rows.`,
      changesPreview: [
        {
          from: `Column: ${col}`,
          to: '(Column removed)',
          description: `Entire column "${col}" deleted`,
        },
      ],
      changeCount: 1,
      isExecutable: true,
    };
  }

  // Remove blank rows
  if (issue.fixType === 'fill_missing' && col) {
    issue.affectedRowIndices.forEach((idx) => {
      changes.push({
        rowNumber: idx + 1,
        column: col,
        from: `Row ${idx + 1} (${col} is blank)`,
        to: '(Row removed)',
      });
    });

    return {
      action: 'remove',
      actionLabel: 'REMOVE',
      title: `Remove Rows with Blank "${col}"`,
      summary: `Remove the ${issue.affectedRowIndices.length} row(s) where "${col}" is blank.`,
      whatIUnderstood: `Remove all rows where "${col}" is empty. The dataset will have ${rows.length - issue.affectedRowIndices.length} rows remaining.`,
      whatWillChange: `${issue.affectedRowIndices.length} row(s) will be deleted.`,
      changesPreview: changes,
      changeCount: issue.affectedRowIndices.length,
      isExecutable: true,
    };
  }

  // Remove outlier row
  if (issue.fixType === 'extreme_value' && col) {
    issue.affectedRowIndices.forEach((idx) => {
      changes.push({
        rowNumber: idx + 1,
        column: col,
        from: `Row ${idx + 1} (${col} = ${rows[idx]?.[col]})`,
        to: '(Row removed)',
      });
    });

    return {
      action: 'remove',
      actionLabel: 'REMOVE',
      title: `Remove High Value Row in "${col}"`,
      summary: `Remove row(s) with unusually high values in "${col}".`,
      whatIUnderstood: `Remove row(s) containing unusually high ${col} value(s).`,
      whatWillChange: `${issue.affectedRowIndices.length} row(s) will be deleted.`,
      changesPreview: changes,
      changeCount: issue.affectedRowIndices.length,
      isExecutable: true,
    };
  }

  // Default: clear affected cells
  issue.affectedRowIndices.forEach((idx) => {
    changes.push({
      rowNumber: idx + 1,
      column: col,
      from: String(rows[idx]?.[col || ''] ?? ''),
      to: '(Cleared / Empty)',
    });
  });

  return {
    action: 'remove',
    actionLabel: 'REMOVE',
    title: `Clear Values in "${col || 'dataset'}"`,
    summary: `Clear affected values in "${col || 'dataset'}".`,
    whatIUnderstood: `Remove or clear affected values in "${col || 'dataset'}".`,
    whatWillChange: `${changes.length} value(s) will be cleared.`,
    changesPreview: changes,
    changeCount: changes.length,
    isExecutable: true,
  };
}

function buildFixPreview(
  issue: DataQualityIssue,
  rows: RowData[],
  instruction: string
): ActionPreview {
  const col = issue.column;
  const trimmed = instruction.trim();

  if (!trimmed) {
    return {
      action: 'fix',
      actionLabel: 'FIX / CHANGE',
      title: 'Fix / Change',
      summary: 'Specify what you would like to change.',
      whatIUnderstood: 'Waiting for your instruction...',
      whatWillChange: 'Type what you want changed above to see a preview before applying.',
      changesPreview: [],
      changeCount: 0,
      isExecutable: false,
    };
  }

  const changes: ActionPreviewItem[] = [];

  // Pattern 1: "Change <from> to <to>" or "Replace <from> with <to>"
  const changeFromTo = trimmed.match(
    /(?:change|replace|set)\s+["']?([^"'\s]+)["']?\s+(?:to|with)\s+["']?([^"']+)["']?/i
  );

  if (changeFromTo) {
    const rawFrom = changeFromTo[1].trim();
    const rawTo = changeFromTo[2].trim().replace(/[.]+$/, '');
    const isThisValue = /^(?:this|the|it|value|this\s+value)$/i.test(rawFrom);

    issue.affectedRowIndices.forEach((idx) => {
      const currentVal = rows[idx]?.[col || ''];
      const strVal = String(currentVal ?? '').trim();
      if (isThisValue || strVal.toLowerCase() === rawFrom.toLowerCase() || rawFrom === '*') {
        changes.push({
          rowNumber: idx + 1,
          column: col,
          from: String(currentVal ?? ''),
          to: rawTo,
        });
      }
    });

    if (changes.length === 0 && col) {
      rows.forEach((r, idx) => {
        const currentVal = r[col];
        if (String(currentVal ?? '').trim().toLowerCase() === rawFrom.toLowerCase()) {
          changes.push({
            rowNumber: idx + 1,
            column: col,
            from: String(currentVal ?? ''),
            to: rawTo,
          });
        }
      });
    }

    return {
      action: 'fix',
      actionLabel: 'FIX / CHANGE',
      title: 'Fix / Change Preview',
      summary: `Change "${rawFrom}" to "${rawTo}".`,
      whatIUnderstood: `Change ${isThisValue ? 'affected value(s)' : `"${rawFrom}"`} in "${col || 'dataset'}" to "${rawTo}".`,
      whatWillChange: `${changes.length} value(s) will change to "${rawTo}".`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
      unsupportedReason:
        changes.length === 0
          ? `Could not find any cells matching "${rawFrom}" in ${col || 'the dataset'}.`
          : undefined,
    };
  }

  // Pattern 2: "Change this value to <to>" or "Set to <to>"
  const changeTo = trimmed.match(/(?:change|set|make)(?:\s+(?:this|the)?\s*value)?\s+to\s+["']?([^"']+)["']?/i);
  if (changeTo) {
    const rawTo = changeTo[1].trim().replace(/[.]+$/, '');
    issue.affectedRowIndices.forEach((idx) => {
      const currentVal = rows[idx]?.[col || ''];
      changes.push({
        rowNumber: idx + 1,
        column: col,
        from: String(currentVal ?? '(blank)'),
        to: rawTo,
      });
    });

    return {
      action: 'fix',
      actionLabel: 'FIX / CHANGE',
      title: 'Fix / Change Preview',
      summary: `Update value(s) to "${rawTo}".`,
      whatIUnderstood: `Set affected row(s) in "${col || 'dataset'}" to "${rawTo}".`,
      whatWillChange: `${changes.length} value(s) will change to "${rawTo}".`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
    };
  }

  // Pattern 3: "Fill with <to>"
  const fillWith = trimmed.match(/fill(?:\s+(?:blank|missing|it))?\s+with\s+["']?([^"']+)["']?/i);
  if (fillWith) {
    const rawTo = fillWith[1].trim().replace(/[.]+$/, '');
    issue.affectedRowIndices.forEach((idx) => {
      const currentVal = rows[idx]?.[col || ''];
      changes.push({
        rowNumber: idx + 1,
        column: col,
        from: String(currentVal ?? '(blank)'),
        to: rawTo,
      });
    });

    return {
      action: 'fix',
      actionLabel: 'FIX / CHANGE',
      title: 'Fill Value Preview',
      summary: `Fill missing cell(s) with "${rawTo}".`,
      whatIUnderstood: `Fill blank cells in "${col || 'dataset'}" with "${rawTo}".`,
      whatWillChange: `${changes.length} blank cell(s) will change to "${rawTo}".`,
      changesPreview: changes,
      changeCount: changes.length,
      isExecutable: changes.length > 0,
    };
  }

  // Pattern 4: Direct value replacement (e.g. user just typed "Jun", "10", "450")
  const directValue = trimmed.replace(/^["']|["']$/g, '');
  issue.affectedRowIndices.forEach((idx) => {
    const currentVal = rows[idx]?.[col || ''];
    changes.push({
      rowNumber: idx + 1,
      column: col,
      from: String(currentVal ?? '(blank)'),
      to: directValue,
    });
  });

  return {
    action: 'fix',
    actionLabel: 'FIX / CHANGE',
    title: 'Custom Value Update',
    summary: `Set value to "${directValue}".`,
    whatIUnderstood: `Set affected row(s) in "${col || 'dataset'}" to "${directValue}".`,
    whatWillChange: `${changes.length} value(s) will be updated to "${directValue}".`,
    changesPreview: changes,
    changeCount: changes.length,
    isExecutable: changes.length > 0,
  };
}

/**
 * Executes confirmed action on the real dataset IMMUTABLY using the deterministic pipeline.
 */
export function executeDatasetAction(
  action: ActionType,
  issue: DataQualityIssue,
  currentRows: RowData[],
  currentColumns: string[],
  customInstruction?: string
): {
  newRows: RowData[];
  newColumns: string[];
  changeLog: ChangeLogItem[];
  validationReport: ValidationReport;
  summaryText: string;
} {
  if (action === 'keep') {
    return {
      newRows: currentRows,
      newColumns: currentColumns,
      changeLog: [],
      validationReport: {
        passed: true,
        timestamp: new Date().toLocaleString(),
        preRowCount: currentRows.length,
        postRowCount: currentRows.length,
        preColCount: currentColumns.length,
        postColCount: currentColumns.length,
        modifiedCellsCount: 0,
        nullDelta: 0,
        warnings: [],
      },
      summaryText: `Kept data as it is for "${issue.title}". No changes made.`,
    };
  }

  const preview = generateActionPreview(action, issue, currentRows, customInstruction);
  if (!preview.isExecutable || preview.changeCount === 0) {
    return {
      newRows: currentRows,
      newColumns: currentColumns,
      changeLog: [],
      validationReport: {
        passed: true,
        timestamp: new Date().toLocaleString(),
        preRowCount: currentRows.length,
        postRowCount: currentRows.length,
        preColCount: currentColumns.length,
        postColCount: currentColumns.length,
        modifiedCellsCount: 0,
        nullDelta: 0,
        warnings: ['No modifications were applied.'],
      },
      summaryText: `No changes applied for "${issue.title}".`,
    };
  }

  // Translate confirmed action into deterministic transformation steps
  const steps: TransformationStep[] = [];

  if (action === 'standardize') {
    if (issue.fixType === 'remove_duplicates') {
      steps.push({
        type: 'REMOVE_DUPLICATES',
        description: 'Merged duplicate records',
      });
    } else if (issue.fixType === 'trim_whitespace') {
      steps.push({
        type: 'TRIM_SPACES',
        column: issue.column,
        description: `Trimmed extra spaces in "${issue.column}"`,
      });
    } else if (issue.fixType === 'standardize_casing') {
      steps.push({
        type: 'STANDARDIZE_CASING',
        column: issue.column,
        params: { casing: 'title' },
        description: `Standardized capitalization in "${issue.column}"`,
      });
    } else if (issue.fixType === 'standardize_dates') {
      steps.push({
        type: 'STANDARDIZE_DATES',
        column: issue.column,
        description: `Standardized dates in "${issue.column}" to YYYY-MM-DD`,
      });
    } else if (issue.fixType === 'standardize_category') {
      const mapping = issue.suggestedFixDetails?.mapping || {};
      steps.push({
        type: 'MAP_VALUES',
        column: issue.column,
        params: { mapping },
        description: `Standardized category representations in "${issue.column}"`,
      });
    } else if (issue.fixType === 'fill_missing') {
      const isNum = currentRows.some((r) => typeof r[issue.column || ''] === 'number');
      steps.push({
        type: 'FILL_MISSING',
        column: issue.column,
        params: { value: isNum ? 0 : 'N/A' },
        description: `Filled missing values in "${issue.column}"`,
      });
    }
  } else if (action === 'remove') {
    if (issue.fixType === 'remove_column' || issue.id.includes('empty_col')) {
      steps.push({
        type: 'REMOVE_COLUMN',
        column: issue.column,
        description: `Removed empty column "${issue.column}"`,
      });
    } else if (
      issue.fixType === 'remove_duplicates' ||
      preview.whatWillChange?.includes('deleted') ||
      preview.whatWillChange?.includes('row(s) will be deleted')
    ) {
      const indicesToRemove = preview.changesPreview
        .map((p) => (p.rowNumber !== undefined ? p.rowNumber - 1 : -1))
        .filter((i) => i >= 0);
      steps.push({
        type: 'REMOVE_ROWS',
        params: { rowIndices: indicesToRemove },
        description: `Removed ${indicesToRemove.length} row(s)`,
      });
    } else {
      // Clear cells
      preview.changesPreview.forEach((item) => {
        if (item.rowNumber !== undefined && item.column) {
          steps.push({
            type: 'REPLACE_VALUE',
            column: item.column,
            params: { rowIndices: [item.rowNumber - 1], to: null },
            description: `Cleared value in row ${item.rowNumber}`,
          });
        }
      });
    }
  } else if (action === 'fix') {
    // Apply preview replacements
    preview.changesPreview.forEach((item) => {
      if (item.rowNumber !== undefined && item.column) {
        let valToSet: any = item.to;
        if (typeof valToSet === 'string' && !isNaN(Number(valToSet)) && valToSet.trim() !== '') {
          valToSet = Number(valToSet);
        }
        steps.push({
          type: 'REPLACE_VALUE',
          column: item.column,
          params: { rowIndices: [item.rowNumber - 1], to: valToSet },
          description: `Updated value in row ${item.rowNumber} to "${valToSet}"`,
        });
      }
    });
  }

  return executeCleaningPipeline(currentRows, currentColumns, steps);
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

function normalizeDateString(dateStr: string): string | null {
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const m = mdy[1].padStart(2, '0');
    const d = mdy[2].padStart(2, '0');
    const y = mdy[3];
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}
