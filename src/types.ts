export interface User {
  name: string;
  email: string;
}

export type AppView = 'landing' | 'workspace';

export type ModalType = 'none' | 'signin' | 'signup' | 'contact' | 'notice';

export interface NoticeData {
  title: string;
  message: string;
  badge?: string;
  icon?: string;
}

export interface UploadedFile {
  name: string;
  size: string;
  type: 'csv' | 'xlsx' | 'xls';
  rowsEstimated?: number;
  uploadedAt: string;
  rawFile?: File;
}

export type CellValue = string | number | boolean | null | undefined;
export type RowData = Record<string, any>;

export type DetectedDataType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'boolean'
  | 'empty'
  | 'mixed';

export interface ColumnMeta {
  name: string;
  detectedType: DetectedDataType;
  nonEmptyCount: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
}

export interface ColumnProfile {
  name: string;
  colIndex: number;
  detectedType: DetectedDataType;
  totalCount: number;
  nonEmptyCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  uniquenessPercentage: number;
  sampleValues: any[];
  topFrequentValues: Array<{ value: any; count: number; percentage: number }>;
  
  // Numeric metrics (calculated on transaction rows only, excluding summary rows!)
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  median?: number;
  stdev?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  outliers?: Array<{ rowIndex: number; value: number }>;
  
  // Text metrics
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  extraSpacesCount?: number;
  casingBreakdown?: { upper: number; lower: number; title: number; mixed: number };
  casingInconsistencies?: Array<{ rootLower: string; variants: string[] }>;
  
  // Date metrics
  minDate?: string;
  maxDate?: string;
  detectedDateFormats?: string[];
  
  // Semantic flags
  isMonthColumn?: boolean;
  ambiguousValues?: string[];
  potentialCategoryVariants?: Array<{ variant: string; canonical: string; confidence: number; reason: string }>;
  unusualValuesPreserved?: Array<{ rowIndex: number; value: any; reason: string }>;
}

export interface HeaderCandidate {
  rowIndex: number;
  sampleCells: string[];
  stringDensity: number;
  uniquenessRatio: number;
  isLikelyHeader: boolean;
  reason: string;
}

export interface RawFileInspection {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  sheets: string[];
  selectedSheet: string;
  totalRawRows: number;
  totalRawCols: number;
  detectedDelimiter?: string;
  rawSampleMatrix: any[][];
  allSheetsMatrix?: Record<string, any[][]>;
  headerCandidates: HeaderCandidate[];
  selectedHeaderRowIndex: number;
  dataStartRowIndex: number;
  trailingBlankRowsCount: number;
}

/**
 * STRICT JSON CLEANING PLAN SCHEMA
 * LLM Decides. Code Executes.
 */
export interface StrictCleaningPlan {
  header_row: number;
  drop_columns: string[];
  fill_down_columns: string[];
  remove_rows_containing: string[];
  rename: Record<string, string>;
  numeric_columns: string[];
  date_columns: string[];
  boolean_columns?: string[];
  casing_standardizations?: Record<string, 'title' | 'upper' | 'lower'>;
  replace_null_representations?: boolean;
  category_maps: Record<string, Record<string, string>>;
  remove_duplicates?: boolean;
  notes: string[];
}

export interface SheetProfile {
  sheetName: string;
  totalRows: number;
  totalCols: number;
  first30Rows: any[][];
  last5Rows: any[][];
  detectedHeaderRowCandidate: number;
  possibleTotalRows: Array<{ rowIndex: number; sampleValue: string; reason: string }>;
  possibleFooterNotes: Array<{ rowIndex: number; text: string }>;
  columns: Array<{
    name: string;
    detectedType: string;
    missingCount: number;
    uniqueCount: number;
    sampleValues: any[];
    isNumericLookingText: boolean;
    isDateLookingText: boolean;
    categoryCandidates?: string[];
  }>;
  duplicateRowsCount: number;
  blankRowsCount: number;
  blankColsCount: number;
}

export interface CompactDataProfile {
  fileName: string;
  fileType: string;
  fileSize: string;
  sheetNames: string[];
  activeSheet: string;
  totalRows: number;
  totalColumns: number;
  first30Rows: any[][];
  last5Rows: any[][];
  columnNames: string[];
  columnProfiles: ColumnProfile[];
  detectedSummaryRows: Array<{ rowIndex: number; label: string; text: string }>;
  detectedFooterNotes: Array<{ rowIndex: number; text: string }>;
  duplicateRowsCount: number;
  blankRowsCount: number;
  blankColumns: string[];
  potentialCategoryVariants?: Array<{ column: string; variant: string; canonical: string; confidence: number; reason: string }>;
  unusualValuesPreserved?: Array<{ column: string; value: any; reason: string }>;
}

export interface CleaningExecutionLog {
  operation: string;
  affectedSheet?: string;
  affectedColumn?: string;
  affectedRows?: number[];
  affectedCount: number;
  reason: string;
  samples?: Array<{ row: number; before: any; after: any }>;
}

export interface ChangeLogItem {
  id: string;
  timestamp: string;
  rowIndex: number;
  rowNumber: number;
  column?: string;
  beforeValue: any;
  afterValue: any;
  actionType: string;
  description: string;
}

export interface RemovedRowRecord {
  rowNumber: number;
  id?: string;
  reason: string;
  operation: string;
  confidence: number;
  originalRow?: RowData;
}

export interface ValidationReport {
  passed: boolean;
  rollback?: boolean;
  timestamp: string;
  preRowCount: number;
  postRowCount: number;
  preColCount: number;
  postColCount: number;
  modifiedCellsCount: number;
  nullDelta: number;
  warnings: string[];
  numericTotalsComparison?: Record<string, { before: number; after: number; delta: number }>;
  removedRowsAudit?: RemovedRowRecord[];
  unauthorizedDeletions?: string[];
  dataLossCheckPassed?: boolean;
}

export interface DatasetVersion {
  id: string;
  versionNumber: number;
  label: string; // e.g. "Original Upload", "Cleaned Version 1"
  createdAt: string;
  data: RowData[];
  columns: string[];
  appliedChanges?: string[];
  changeLog?: ChangeLogItem[];
  executionLogs?: CleaningExecutionLog[];
  validationReport?: ValidationReport;
  summaryRowIndices?: number[];
  cleaningPlan?: StrictCleaningPlan;
}

export interface AutoCleanItem {
  title: string;
  description: string;
  count?: number;
}

export interface UnchangedItem {
  title: string;
  description: string;
  reason: string;
}

export interface AutoCleanSummary {
  originalRowCount: number;
  currentDataRowCount: number;
  summaryRowsCount: number;
  summaryRowIndices: number[];
  changesMade: AutoCleanItem[];
  leftUnchanged: UnchangedItem[];
}

export interface ParsedDataset {
  fileName: string;
  fileSize: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  rawInspection?: RawFileInspection;
  originalData: RowData[];
  originalWorkbookSheets?: Record<string, { rows: RowData[]; columns: string[] }>;
  versions: DatasetVersion[];
  currentVersionIndex: number;
  autoCleanSummary?: AutoCleanSummary;
  cleaningPlan?: StrictCleaningPlan;
}

export interface ConversationalOperation {
  intent: string;
  summary: string;
  affectedCount: number;
  isAmbiguous?: boolean;
  clarificationMessage?: string;
  previewItems: Array<{
    rowNumber?: number;
    column?: string;
    from: string;
    to: string;
  }>;
  transformationSteps: Array<{
    type:
      | 'TRIM_SPACES'
      | 'STANDARDIZE_CASING'
      | 'MAP_VALUES'
      | 'STANDARDIZE_DATES'
      | 'REMOVE_DUPLICATES'
      | 'FILL_MISSING'
      | 'REMOVE_ROWS'
      | 'REMOVE_COLUMN'
      | 'RENAME_COLUMN'
      | 'COMBINE_COLUMNS'
      | 'REPLACE_VALUE';
    column?: string;
    params?: Record<string, any>;
    description: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  pendingOperation?: ConversationalOperation;
}

export interface DataQualityIssue {
  id: string;
  category: 'safe_fix' | 'review_needed';
  column?: string;
  affectedRowIndices: number[];
  title: string;
  whatIFound: string;
  whyItMayMatter: string;
  suggestedAction: string;
  aiSuggestion?: string;
  confidence?: 'high' | 'medium' | 'low';
  fixType:
    | 'trim_whitespace'
    | 'standardize_casing'
    | 'standardize_dates'
    | 'remove_duplicates'
    | 'fill_missing'
    | 'standardize_category'
    | 'extreme_value'
    | 'remove_column'
    | 'custom';
  suggestedFixDetails?: {
    originalSample?: any;
    targetValue?: any;
    mapping?: Record<string, string>;
    isAmbiguous?: boolean;
  };
}
