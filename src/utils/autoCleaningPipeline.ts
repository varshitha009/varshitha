import {
  RowData,
  ChangeLogItem,
  ValidationReport,
  AutoCleanSummary,
  AutoCleanItem,
  UnchangedItem
} from '../types';
import { detectSummaryRows } from './summaryRowDetector';
import { profileDataset } from './dataProfiler';
import { executeCleaningPipeline, TransformationStep } from './cleaningEngine';

/**
 * AUTOMATIC HIGH-CONFIDENCE CLEANING PIPELINE
 * Automatically fixes only high-confidence, low-risk problems.
 * Leaves uncertain/unusual values unchanged and reports them with simple English.
 * Excludes summary rows from transaction analysis while safely preserving them.
 */

export interface AutoCleanResult {
  cleanedRows: RowData[];
  cleanedColumns: string[];
  changeLog: ChangeLogItem[];
  validationReport: ValidationReport;
  summary: AutoCleanSummary;
}

export function runAutomaticCleaning(
  originalRows: RowData[],
  originalColumns: string[]
): AutoCleanResult {
  const originalRowCount = originalRows.length;

  // 1. STRUCTURE DETECTION: Detect summary/total rows (e.g. Order ID = TOTAL)
  const { summaryRowIndices, summaryLabels } = detectSummaryRows(
    originalRows,
    originalColumns
  );
  const summarySet = new Set(summaryRowIndices);

  // 2. DATA PROFILING (Excludes summary rows from transaction statistics & duplicates)
  const { columnProfiles, duplicateRowIndices } = profileDataset(
    originalRows,
    originalColumns,
    summaryRowIndices
  );

  const steps: TransformationStep[] = [];
  const changesMade: AutoCleanItem[] = [];
  const leftUnchanged: UnchangedItem[] = [];

  // ========================================================
  // DETECT HIGH-CONFIDENCE CLEANING ACTIONS
  // ========================================================

  // A. Extra leading/trailing/multiple internal spaces
  columnProfiles.forEach((prof) => {
    if (prof.extraSpacesCount && prof.extraSpacesCount > 0) {
      steps.push({
        type: 'TRIM_SPACES',
        column: prof.name,
        description: `Trimmed extra spaces in "${prof.name}"`,
      });
      changesMade.push({
        title: 'Removed extra spaces',
        description: `Trimmed unnecessary leading, trailing, and double spaces in "${prof.name}".`,
        count: prof.extraSpacesCount,
      });
    }
  });

  // B. Month column equivalent representations vs Ambiguous values
  columnProfiles.forEach((prof) => {
    if (prof.isMonthColumn) {
      // Obvious high-confidence month equivalences
      const highConfidenceMonthMap: Record<string, string> = {
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

      // Check for variations in actual rows (excluding summary rows)
      let hasMonthVariations = false;
      const ambiguousValsFound = new Set<string>();

      originalRows.forEach((r, idx) => {
        if (summarySet.has(idx)) return;
        const val = r[prof.name];
        if (typeof val === 'string') {
          const lower = val.trim().toLowerCase();
          // Ambiguous values: JM, JU, JA, M, etc.
          if (lower === 'jm' || lower === 'ju' || lower === 'ja' || lower === 'm') {
            ambiguousValsFound.add(val.trim());
          } else if (highConfidenceMonthMap[lower] && highConfidenceMonthMap[lower] !== val.trim()) {
            hasMonthVariations = true;
          }
        }
      });

      if (hasMonthVariations) {
        steps.push({
          type: 'MAP_VALUES',
          column: prof.name,
          params: { mapping: highConfidenceMonthMap },
          description: `Standardized month formatting in "${prof.name}"`,
        });
        changesMade.push({
          title: 'Standardized month formatting',
          description: `Standardized clearly equivalent month names in "${prof.name}" (such as "January" → "Jan", "June" → "Jun").`,
        });
      }

      // Ambiguous values: LEAVE UNCHANGED and report
      if (ambiguousValsFound.size > 0) {
        const ambStr = Array.from(ambiguousValsFound).join(', ');
        leftUnchanged.push({
          title: `1 value could not be confidently interpreted ("${ambStr}")`,
          description: `Found "${ambStr}" in the "${prof.name}" column.`,
          reason: `No automatic change was made because it is ambiguous (it could mean Jan, Jun, or something else).`,
        });
      }
    }
  });

  // C. Inconsistent Capitalization (Non-month text categories)
  columnProfiles.forEach((prof) => {
    if (!prof.isMonthColumn && prof.casingInconsistencies && prof.casingInconsistencies.length > 0) {
      steps.push({
        type: 'STANDARDIZE_CASING',
        column: prof.name,
        params: { casing: 'title' },
        description: `Standardized capitalization in "${prof.name}"`,
      });
      changesMade.push({
        title: `Standardized capitalization in "${prof.name}"`,
        description: `Made letter case consistent (e.g. "retail" → "Retail").`,
      });
    }
  });

  // D. Date formatting inconsistencies (e.g. 2026-01-05 alongside 01/15/2026)
  columnProfiles.forEach((prof) => {
    if (prof.detectedType === 'date' && prof.detectedDateFormats && prof.detectedDateFormats.length > 1) {
      steps.push({
        type: 'STANDARDIZE_DATES',
        column: prof.name,
        description: `Standardized date formats to YYYY-MM-DD in "${prof.name}"`,
      });
      changesMade.push({
        title: `Standardized date formatting in "${prof.name}"`,
        description: `Converted mixed date styles to standard YYYY-MM-DD.`,
      });
    }
  });

  // E. Duplicate rows (Excluding summary rows)
  if (duplicateRowIndices.length > 0) {
    steps.push({
      type: 'REMOVE_DUPLICATES',
      description: `Removed ${duplicateRowIndices.length} duplicate row(s)`,
    });
    changesMade.push({
      title: `Removed ${duplicateRowIndices.length} duplicate row${
        duplicateRowIndices.length > 1 ? 's' : ''
      }`,
      description: `Removed identical duplicate records so each transaction is counted once.`,
      count: duplicateRowIndices.length,
    });
  }

  // ========================================================
  // DETECT UNCERTAIN / OBSERVATIONAL ITEMS (LEFT UNCHANGED)
  // ========================================================

  // A. Unusually High or Low Numeric Values (NEVER modify automatically; NO "outlier" jargon)
  columnProfiles.forEach((prof) => {
    if (prof.outliers && prof.outliers.length > 0) {
      const sampleVal = prof.outliers[0].value;
      leftUnchanged.push({
        title: `1 unusually high ${prof.name} value was found (${sampleVal})`,
        description: `A value of ${sampleVal} in "${prof.name}" is much higher than most other rows.`,
        reason: 'No change was made because it may be valid. You can edit it below if needed.',
      });
    }
  });

  // B. Summary rows preserved
  if (summaryRowIndices.length > 0) {
    const labels = Object.values(summaryLabels).join(', ') || 'TOTAL';
    leftUnchanged.push({
      title: `${summaryRowIndices.length} summary row preserved ("${labels}")`,
      description: `Detected summary row containing "${labels}".`,
      reason: 'Separated from normal transactions so it will not distort averages or be deleted by duplicate checks.',
    });
  }

  // ========================================================
  // EXECUTE DETERMINISTIC CLEANING
  // ========================================================
  const { newRows, newColumns, changeLog, validationReport } = executeCleaningPipeline(
    originalRows,
    originalColumns,
    steps
  );

  // If validation failed, revert to original
  if (!validationReport.passed) {
    return {
      cleanedRows: originalRows,
      cleanedColumns: originalColumns,
      changeLog: [],
      validationReport: {
        ...validationReport,
        warnings: ['Validation warning encountered. Reverted to original upload.'],
      },
      summary: {
        originalRowCount,
        currentDataRowCount: originalRowCount,
        summaryRowsCount: summaryRowIndices.length,
        summaryRowIndices,
        changesMade: [],
        leftUnchanged: [
          {
            title: 'Automatic cleaning reverted',
            description: 'A validation warning was triggered during cleaning.',
            reason: 'Original dataset restored safely.',
          },
        ],
      },
    };
  }

  const currentDataRowCount = newRows.length;

  return {
    cleanedRows: newRows,
    cleanedColumns: newColumns,
    changeLog,
    validationReport,
    summary: {
      originalRowCount,
      currentDataRowCount,
      summaryRowsCount: summaryRowIndices.length,
      summaryRowIndices,
      changesMade,
      leftUnchanged,
    },
  };
}
