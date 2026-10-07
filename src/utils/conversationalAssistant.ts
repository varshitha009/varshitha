import {
  RowData,
  ConversationalOperation,
  DatasetVersion,
  ParsedDataset
} from '../types';
import { executeCleaningPipeline, TransformationStep, createNewDatasetVersion } from './cleaningEngine';

/**
 * CONVERSATIONAL AI DATA ASSISTANT
 * Understands natural language spreadsheet instructions, converts them into
 * structured deterministic operations, provides lightweight previews,
 * and immutably executes them on the real dataset.
 */

export async function interpretConversationalInstruction(
  userInstruction: string,
  rows: RowData[],
  columns: string[]
): Promise<ConversationalOperation> {
  const trimmed = userInstruction.trim();

  // Try server-side Gemini instruction parser first
  try {
    const res = await fetch('/api/ai-chat-instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInstruction: trimmed,
        columns,
        sampleRows: rows.slice(0, 3),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.usingFallback && data.operation) {
        const op = data.operation;
        if (op.is_ambiguous) {
          return {
            intent: op.understood_intent || trimmed,
            summary: op.clarification_needed || 'Could you please clarify what value or column you would like to change?',
            affectedCount: 0,
            isAmbiguous: true,
            clarificationMessage: op.clarification_needed,
            previewItems: [],
            transformationSteps: [],
          };
        }

        // Map server operation to preview items & deterministic steps
        return mapServerOperationToResult(op, rows, columns);
      }
    }
  } catch {
    // Graceful fallback to client-side pattern interpreter
  }

  // Fallback to grounded local semantic interpreter
  return interpretLocally(trimmed, rows, columns);
}

function interpretLocally(
  instruction: string,
  rows: RowData[],
  columns: string[]
): ConversationalOperation {
  const text = instruction.trim();

  // 1. "Change all months to MMM" or "Format months as MMM"
  if (/month/i.test(text) && /\bmmm\b/i.test(text)) {
    const monthCol = columns.find((c) => /month/i.test(c)) || 'Month';
    const monthMap: Record<string, string> = {
      january: 'Jan', jan: 'Jan',
      february: 'Feb', feb: 'Feb',
      march: 'Mar', mar: 'Mar',
      april: 'Apr', apr: 'Apr',
      may: 'May',
      june: 'Jun', jun: 'Jun', 'j-u-n': 'Jun',
      july: 'Jul', jul: 'Jul',
      august: 'Aug', aug: 'Aug',
      september: 'Sep', sep: 'Sep',
      october: 'Oct', oct: 'Oct',
      november: 'Nov', nov: 'Nov',
      december: 'Dec', dec: 'Dec',
    };

    const previewItems: Array<{ rowNumber: number; column: string; from: string; to: string }> = [];
    rows.forEach((r, idx) => {
      const val = r[monthCol];
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        const target = monthMap[lower];
        if (target && target !== val.trim()) {
          previewItems.push({
            rowNumber: idx + 1,
            column: monthCol,
            from: val,
            to: target,
          });
        }
      }
    });

    return {
      intent: 'Format months as 3-letter abbreviation (MMM)',
      summary: `Convert ${previewItems.length} month names to 3-letter format (Jan, Jun).`,
      affectedCount: previewItems.length,
      previewItems,
      transformationSteps: [
        {
          type: 'MAP_VALUES',
          column: monthCol,
          params: { mapping: monthMap },
          description: `Formatted months as MMM in "${monthCol}"`,
        },
      ],
    };
  }

  // 2. "Change <from> to <to>" or "Replace <from> with <to>" (e.g. "Change Sat to Saturday", "Change JM to Jun")
  const changeFromTo = text.match(
    /(?:change|replace|set)\s+["']?([^"'\s]+)["']?\s+(?:to|with)\s+["']?([^"']+)["']?/i
  );

  if (changeFromTo) {
    const fromVal = changeFromTo[1].trim();
    const toVal = changeFromTo[2].trim().replace(/[.]+$/, '');

    // Search across all columns (or target column if mentioned)
    let targetCol: string | undefined = columns.find((c) =>
      new RegExp(`\\b${c}\\b`, 'i').test(text)
    );

    const previewItems: Array<{ rowNumber: number; column: string; from: string; to: string }> = [];
    rows.forEach((r, idx) => {
      const colsToCheck = targetCol ? [targetCol] : columns;
      colsToCheck.forEach((col) => {
        const currentVal = r[col];
        if (
          currentVal !== null &&
          currentVal !== undefined &&
          String(currentVal).trim().toLowerCase() === fromVal.toLowerCase()
        ) {
          previewItems.push({
            rowNumber: idx + 1,
            column: col,
            from: String(currentVal),
            to: toVal,
          });
          if (!targetCol) targetCol = col;
        }
      });
    });

    const chosenCol = targetCol || columns[0];
    return {
      intent: `Change "${fromVal}" to "${toVal}"`,
      summary: `You want to change "${fromVal}" → "${toVal}". ${previewItems.length} cell${
        previewItems.length !== 1 ? 's' : ''
      } will change.`,
      affectedCount: previewItems.length,
      previewItems,
      transformationSteps: [
        {
          type: 'REPLACE_VALUE',
          column: chosenCol,
          params: { from: fromVal, to: toVal },
          description: `Replaced "${fromVal}" with "${toVal}" in "${chosenCol}"`,
        },
      ],
    };
  }

  // 3. "Rename <OldCol> to <NewCol>"
  const renameMatch = text.match(/rename\s+["']?([^"'\s]+)["']?\s+to\s+["']?([^"']+)["']?/i);
  if (renameMatch) {
    const oldName = renameMatch[1].trim();
    const newName = renameMatch[2].trim().replace(/[.]+$/, '');
    const actualCol = columns.find((c) => c.toLowerCase() === oldName.toLowerCase());

    if (actualCol) {
      return {
        intent: `Rename column "${actualCol}" to "${newName}"`,
        summary: `Rename column "${actualCol}" → "${newName}".`,
        affectedCount: rows.length,
        previewItems: [
          {
            column: actualCol,
            from: actualCol,
            to: newName,
          },
        ],
        transformationSteps: [
          {
            type: 'RENAME_COLUMN',
            column: actualCol,
            params: { oldName: actualCol, newName },
            description: `Renamed column "${actualCol}" to "${newName}"`,
          },
        ],
      };
    }
  }

  // 4. "Remove rows where <Col> is 0" or "Remove rows where <Col> is empty"
  const removeRowsMatch = text.match(
    /remove\s+rows?\s+where\s+["']?([^"'\s]+)["']?\s+is\s+(?:equal\s+to\s+)?["']?([^"']+)["']?/i
  );
  if (removeRowsMatch) {
    const colTerm = removeRowsMatch[1].trim();
    const valTerm = removeRowsMatch[2].trim().toLowerCase();
    const targetCol = columns.find((c) => c.toLowerCase() === colTerm.toLowerCase()) || columns[0];

    const affectedRowIndices: number[] = [];
    const previewItems: Array<{ rowNumber: number; column: string; from: string; to: string }> = [];

    rows.forEach((r, idx) => {
      const val = r[targetCol];
      const isMatch =
        valTerm === 'empty' || valTerm === 'blank'
          ? val === null || val === undefined || String(val).trim() === ''
          : String(val).trim().toLowerCase() === valTerm;

      if (isMatch) {
        affectedRowIndices.push(idx);
        previewItems.push({
          rowNumber: idx + 1,
          column: targetCol,
          from: String(val ?? '(blank)'),
          to: '(Row deleted)',
        });
      }
    });

    return {
      intent: `Remove rows where "${targetCol}" is ${valTerm}`,
      summary: `Remove ${affectedRowIndices.length} row${
        affectedRowIndices.length !== 1 ? 's' : ''
      } where "${targetCol}" is ${valTerm}.`,
      affectedCount: affectedRowIndices.length,
      previewItems,
      transformationSteps: [
        {
          type: 'REMOVE_ROWS',
          column: targetCol,
          params: { rowIndices: affectedRowIndices },
          description: `Removed ${affectedRowIndices.length} rows where "${targetCol}" is ${valTerm}`,
        },
      ],
    };
  }

  // 5. "Combine <Col1> and <Col2> into <NewCol>"
  const combineMatch = text.match(
    /combine\s+["']?([^"'\s]+)["']?\s+and\s+["']?([^"'\s]+)["']?\s+into\s+["']?([^"']+)["']?/i
  );
  if (combineMatch) {
    const col1 = columns.find((c) => c.toLowerCase() === combineMatch[1].trim().toLowerCase());
    const col2 = columns.find((c) => c.toLowerCase() === combineMatch[2].trim().toLowerCase());
    const newCol = combineMatch[3].trim();

    if (col1 && col2) {
      const previewItems = rows.slice(0, 3).map((r, idx) => ({
        rowNumber: idx + 1,
        column: newCol,
        from: `${r[col1]} + ${r[col2]}`,
        to: `${r[col1] || ''} ${r[col2] || ''}`.trim(),
      }));

      return {
        intent: `Combine "${col1}" and "${col2}" into "${newCol}"`,
        summary: `Combine "${col1}" and "${col2}" into new column "${newCol}".`,
        affectedCount: rows.length,
        previewItems,
        transformationSteps: [
          {
            type: 'COMBINE_COLUMNS',
            column: newCol,
            params: { col1, col2, newCol, separator: ' ' },
            description: `Combined "${col1}" and "${col2}" into "${newCol}"`,
          },
        ],
      };
    }
  }

  // Default / Ambiguous query
  return {
    intent: text,
    summary: `I'm not completely certain which column or values you'd like to change for "${text}".`,
    affectedCount: 0,
    isAmbiguous: true,
    clarificationMessage: `Could you specify which column and target value you want? For example: "Change Sat to Saturday" or "Format Month as MMM".`,
    previewItems: [],
    transformationSteps: [],
  };
}

function mapServerOperationToResult(
  op: any,
  rows: RowData[],
  columns: string[]
): ConversationalOperation {
  const type = op.operation_type;
  const params = op.parameters || {};

  if (type === 'replace_values') {
    const col = params.column || columns[0];
    const fromVal = params.from;
    const toVal = params.to;

    const previewItems: Array<{ rowNumber: number; column: string; from: string; to: string }> = [];
    rows.forEach((r, idx) => {
      const current = r[col];
      if (String(current ?? '').trim().toLowerCase() === String(fromVal).trim().toLowerCase()) {
        previewItems.push({
          rowNumber: idx + 1,
          column: col,
          from: String(current),
          to: String(toVal),
        });
      }
    });

    return {
      intent: op.understood_intent || `Change "${fromVal}" to "${toVal}" in ${col}`,
      summary: `You want to change: ${fromVal} → ${toVal}. ${previewItems.length} cells will change.`,
      affectedCount: previewItems.length,
      previewItems,
      transformationSteps: [
        {
          type: 'REPLACE_VALUE',
          column: col,
          params: { from: fromVal, to: toVal },
          description: `Changed "${fromVal}" to "${toVal}" in "${col}"`,
        },
      ],
    };
  }

  if (type === 'rename_column') {
    return {
      intent: `Rename "${params.old_name}" to "${params.new_name}"`,
      summary: `Rename column "${params.old_name}" to "${params.new_name}".`,
      affectedCount: rows.length,
      previewItems: [
        {
          column: params.old_name,
          from: params.old_name,
          to: params.new_name,
        },
      ],
      transformationSteps: [
        {
          type: 'RENAME_COLUMN',
          column: params.old_name,
          params: { oldName: params.old_name, newName: params.new_name },
          description: `Renamed column "${params.old_name}" to "${params.new_name}"`,
        },
      ],
    };
  }

  return interpretLocally(op.understood_intent || '', rows, columns);
}

/**
 * Applies confirmed conversational operation to the dataset immutably
 */
export function applyConversationalOperation(
  operation: ConversationalOperation,
  currentVersion: DatasetVersion,
  dataset: ParsedDataset
): {
  updatedDataset: ParsedDataset;
  confirmationMessage: string;
} {
  let updatedRows: RowData[] = currentVersion.data.map((r) => ({ ...r }));
  let updatedCols: string[] = [...currentVersion.columns];

  // Execute special steps like RENAME_COLUMN or COMBINE_COLUMNS
  const standardSteps: TransformationStep[] = [];

  operation.transformationSteps.forEach((step) => {
    if (step.type === 'RENAME_COLUMN') {
      const oldName = step.params?.oldName;
      const newName = step.params?.newName;
      if (oldName && newName) {
        updatedCols = updatedCols.map((c) => (c === oldName ? newName : c));
        updatedRows = updatedRows.map((r) => {
          const copy = { ...r };
          copy[newName] = copy[oldName];
          delete copy[oldName];
          return copy;
        });
      }
    } else if (step.type === 'COMBINE_COLUMNS') {
      const col1 = step.params?.col1;
      const col2 = step.params?.col2;
      const newCol = step.params?.newCol;
      const sep = step.params?.separator || ' ';
      if (col1 && col2 && newCol) {
        if (!updatedCols.includes(newCol)) updatedCols.push(newCol);
        updatedRows = updatedRows.map((r) => ({
          ...r,
          [newCol]: `${r[col1] ?? ''}${sep}${r[col2] ?? ''}`.trim(),
        }));
      }
    } else {
      standardSteps.push(step as TransformationStep);
    }
  });

  const { newRows, newColumns, changeLog, validationReport } = executeCleaningPipeline(
    updatedRows,
    updatedCols,
    standardSteps
  );

  const newVersionNumber = dataset.versions.length;
  const newVersionLabel = `Cleaned Version ${newVersionNumber} — Latest`;

  const updatedVersions = dataset.versions.map((v) => ({
    ...v,
    label: v.label.replace(' — Latest', ''),
  }));

  const newVersion = createNewDatasetVersion(
    newVersionLabel,
    newRows,
    newColumns,
    changeLog,
    validationReport,
    newVersionNumber
  );

  const newVersionsList = [...updatedVersions, newVersion];
  const updatedDataset: ParsedDataset = {
    ...dataset,
    versions: newVersionsList,
    currentVersionIndex: newVersionsList.length - 1,
  };

  const confirmationMessage = `Done! Applied "${operation.intent}". Created "${newVersionLabel}". You can undo this change anytime.`;

  return {
    updatedDataset,
    confirmationMessage,
  };
}
