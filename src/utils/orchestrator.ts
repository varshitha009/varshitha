import {
  ParsedDataset,
  DatasetVersion,
  StrictCleaningPlan,
  RowData
} from '../types';
import { parseUploadedFile, parseSampleDataset } from './dataParser';
import { buildCompactDataProfile } from './dataProfiler';
import { validateCleaningPlan, generateSafeDefaultPlan } from './planValidator';
import { executeDeterministicPlan, ExecutionResult } from './deterministicCleaner';

/**
 * MASTER CLEANING ORCHESTRATOR
 * Flow:
 * UPLOAD → PARSE FILE → BUILD DATA PROFILE → GEMINI STRICT JSON PLAN →
 * VALIDATE JSON PLAN → CODE EXECUTES PLAN DETERMINISTICALLY →
 * VALIDATE RESULT → SHOW CLEANING PREVIEW + SUMMARY → DOWNLOAD CLEANED FILE
 */

export async function processAndCleanFile(file: File): Promise<ParsedDataset> {
  // 1. PARSE FILE
  const parsed = await parseUploadedFile(file);

  return runPipeline(
    parsed.rawInspection.rawSampleMatrix,
    parsed.rows,
    parsed.columns,
    {
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      fileType: parsed.fileType,
      sheetNames: parsed.rawInspection.sheets,
      activeSheet: parsed.rawInspection.selectedSheet,
      rawInspection: parsed.rawInspection,
      allSheets: parsed.allSheets,
    }
  );
}

export async function processAndCleanSample(sampleKey: string): Promise<ParsedDataset> {
  const parsed = parseSampleDataset(sampleKey);

  return runPipeline(
    parsed.rawInspection.rawSampleMatrix,
    parsed.rows,
    parsed.columns,
    {
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      fileType: parsed.fileType,
      sheetNames: parsed.rawInspection.sheets,
      activeSheet: parsed.rawInspection.selectedSheet,
      rawInspection: parsed.rawInspection,
      allSheets: { [parsed.rawInspection.selectedSheet]: { rows: parsed.rows, columns: parsed.columns } },
    }
  );
}

export async function switchDatasetSheet(
  dataset: ParsedDataset,
  newSheetName: string
): Promise<ParsedDataset> {
  const sheetData = dataset.originalWorkbookSheets?.[newSheetName];
  if (!sheetData) return dataset;

  const rawMatrix = dataset.rawInspection?.allSheetsMatrix?.[newSheetName] || [];

  const updatedRawInspection = dataset.rawInspection
    ? {
        ...dataset.rawInspection,
        selectedSheet: newSheetName,
        totalRawRows: rawMatrix.length,
        rawSampleMatrix: rawMatrix.slice(0, 15),
      }
    : undefined;

  return runPipeline(
    rawMatrix.length > 0 ? rawMatrix : [sheetData.columns],
    sheetData.rows,
    sheetData.columns,
    {
      fileName: dataset.fileName,
      fileSize: dataset.fileSize,
      fileType: dataset.fileType,
      sheetNames: dataset.rawInspection?.sheets || [newSheetName],
      activeSheet: newSheetName,
      rawInspection: updatedRawInspection,
      allSheets: dataset.originalWorkbookSheets,
    }
  );
}

async function runPipeline(
  rawMatrix: any[][],
  rows: RowData[],
  columns: string[],
  meta: {
    fileName: string;
    fileSize: string;
    fileType: 'xlsx' | 'xls' | 'csv';
    sheetNames: string[];
    activeSheet: string;
    rawInspection: any;
    allSheets?: Record<string, { rows: RowData[]; columns: string[] }>;
  }
): Promise<ParsedDataset> {
  // 2. BUILD DATA PROFILE
  const dataProfile = buildCompactDataProfile(
    rawMatrix,
    rows,
    columns,
    {
      fileName: meta.fileName,
      fileType: meta.fileType,
      fileSize: meta.fileSize,
      sheetNames: meta.sheetNames,
      activeSheet: meta.activeSheet,
    }
  );

  // 3. GEMINI RETURNS STRICT JSON CLEANING PLAN
  let rawPlan: any = null;
  try {
    const endpoint =
      typeof window !== 'undefined'
        ? '/api/ai-clean-plan'
        : 'http://localhost:3000/api/ai-clean-plan';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataProfile }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.plan) {
        rawPlan = data.plan;
      }
    }
  } catch (err) {
    console.warn('Backend Gemini API call error; using deterministic safe plan:', err);
  }

  // Fallback to grounded deterministic plan if LLM returned nothing or failed
  if (!rawPlan) {
    rawPlan = generateSafeDefaultPlan(columns, dataProfile);
  }

  // 4. VALIDATE THE GEMINI PLAN
  const validationResult = validateCleaningPlan(
    rawPlan,
    columns,
    rows.length,
    dataProfile
  );
  const strictPlan: StrictCleaningPlan = validationResult.sanitizedPlan;

  // 5. CODE EXECUTES PLAN DETERMINISTICALLY
  const execution: ExecutionResult = executeDeterministicPlan(
    rows,
    columns,
    strictPlan
  );

  // 6. VALIDATE RESULT: Only create Cleaned Version 1 if validation PASSED without rollback!
  const initialVersion: DatasetVersion = {
    id: `v_orig_${Date.now()}`,
    versionNumber: 0,
    label: 'Original Upload',
    createdAt: 'Initial file upload',
    data: rows,
    columns: columns,
    appliedChanges: [],
    changeLog: [],
    executionLogs: [],
    validationReport: execution.validationReport,
  };

  const versions: DatasetVersion[] = [initialVersion];
  let currentVersionIndex = 0;

  if (
    execution.validationReport.passed &&
    !execution.validationReport.rollback &&
    execution.changeLog.length > 0
  ) {
    const cleanedVersion: DatasetVersion = {
      id: `v_clean_${Date.now()}`,
      versionNumber: 1,
      label: 'Cleaned Version 1 — Latest',
      createdAt: 'Cleaned via Plan',
      data: execution.cleanedRows,
      columns: execution.cleanedColumns,
      appliedChanges: execution.summary.changesMade.map((c) => c.title),
      changeLog: execution.changeLog,
      executionLogs: execution.executionLogs,
      validationReport: execution.validationReport,
      summaryRowIndices: execution.summary.summaryRowIndices,
      cleaningPlan: strictPlan,
    };
    versions.push(cleanedVersion);
    currentVersionIndex = 1;
  }

  // 7. RETURN STRUCTURED DATASET (Preserving untouched original)
  return {
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    fileType: meta.fileType,
    rawInspection: meta.rawInspection,
    originalData: rows,
    originalWorkbookSheets: meta.allSheets,
    versions,
    currentVersionIndex,
    autoCleanSummary: execution.summary,
    cleaningPlan: strictPlan,
  };
}
