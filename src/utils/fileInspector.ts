import * as XLSX from 'xlsx';
import { RawFileInspection, HeaderCandidate, RowData } from '../types';

/**
 * RAW FILE INSPECTION & STRUCTURE DETECTION
 * Programmatic inspection of raw binary Excel and text CSV files.
 * Detects encoding, delimiters, sheet names, header candidates, and data boundaries.
 */

export async function inspectRawFile(
  file: File,
  requestedSheetName?: string
): Promise<{
  inspection: RawFileInspection;
  rows: RowData[];
  columns: string[];
  allSheets: Record<string, { rows: RowData[]; columns: string[] }>;
}> {
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const isXls = file.name.toLowerCase().endsWith('.xls');
  const fileType: 'xlsx' | 'xls' | 'csv' = isCsv ? 'csv' : isXls ? 'xls' : 'xlsx';

  const buffer = await file.arrayBuffer();
  let detectedDelimiter = ',';

  // If CSV, handle encoding (UTF-8, UTF-8 BOM, Latin-1 fallback) and inspect delimiter
  if (isCsv) {
    let textPreview = '';
    try {
      const uint8 = new Uint8Array(buffer);
      if (uint8.length >= 3 && uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
        textPreview = new TextDecoder('utf-8').decode(buffer.slice(3, 4099));
      } else {
        textPreview = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 4096));
      }
    } catch {
      textPreview = new TextDecoder('latin1').decode(buffer.slice(0, 4096));
    }
    detectedDelimiter = detectCsvDelimiter(textPreview);
  }

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const sheets = workbook.SheetNames;
  const allSheetsMatrix: Record<string, any[][]> = {};
  const allSheets: Record<string, { rows: RowData[]; columns: string[] }> = {};

  // Inspect EVERY sheet in the workbook
  sheets.forEach((sheetName) => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: true,
    });
    allSheetsMatrix[sheetName] = matrix;

    // Parse sheet rows & columns
    const { rows: sheetRows, columns: sheetCols } = parseSheetMatrix(matrix);
    allSheets[sheetName] = { rows: sheetRows, columns: sheetCols };
  });

  // Determine selected sheet: requestedSheetName, or first sheet with data, or sheet 0
  let selectedSheet = requestedSheetName && sheets.includes(requestedSheetName)
    ? requestedSheetName
    : sheets[0] || 'Sheet1';

  // If multiple sheets exist and requested is not specified, prefer first sheet with actual data rows
  if (!requestedSheetName && sheets.length > 1) {
    const firstWithData = sheets.find((s) => (allSheets[s]?.rows.length || 0) > 0);
    if (firstWithData) selectedSheet = firstWithData;
  }

  const activeMatrix = allSheetsMatrix[selectedSheet] || [];
  const totalRawRows = activeMatrix.length;
  let totalRawCols = 0;
  activeMatrix.forEach((r) => {
    if (Array.isArray(r) && r.length > totalRawCols) {
      totalRawCols = r.length;
    }
  });

  // Evaluate candidate header rows (inspect top 10 rows of active sheet)
  const candidateLimit = Math.min(10, totalRawRows);
  const headerCandidates: HeaderCandidate[] = [];

  for (let r = 0; r < candidateLimit; r++) {
    const row = activeMatrix[r] || [];
    const nonBlankCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonBlankCells.length === 0) continue;

    const stringCount = nonBlankCells.filter((c) => typeof c === 'string' && isNaN(Number(c.trim()))).length;
    const stringDensity = nonBlankCells.length > 0 ? stringCount / nonBlankCells.length : 0;
    const uniqueStrings = new Set(nonBlankCells.map((c) => String(c).trim().toLowerCase()));
    const uniquenessRatio = nonBlankCells.length > 0 ? uniqueStrings.size / nonBlankCells.length : 0;

    const isLikelyHeader = stringDensity >= 0.7 && uniquenessRatio >= 0.8 && nonBlankCells.length >= 2;
    let reason = 'Contains standard column labels';
    if (stringDensity < 0.5) reason = 'Contains mostly data values or numbers';
    if (nonBlankCells.length === 1) reason = 'Single title or banner cell';

    headerCandidates.push({
      rowIndex: r,
      sampleCells: nonBlankCells.slice(0, 6).map((c) => String(c).trim()),
      stringDensity: Math.round(stringDensity * 100),
      uniquenessRatio: Math.round(uniquenessRatio * 100),
      isLikelyHeader,
      reason,
    });
  }

  let selectedHeaderRowIndex = 0;
  const bestCandidate = headerCandidates.find((c) => c.isLikelyHeader);
  if (bestCandidate) {
    selectedHeaderRowIndex = bestCandidate.rowIndex;
  } else if (headerCandidates.length > 0) {
    selectedHeaderRowIndex = headerCandidates[0].rowIndex;
  }

  const { rows: dataRows, columns: columnHeaders } = parseSheetMatrix(
    activeMatrix,
    selectedHeaderRowIndex,
    totalRawCols
  );

  const dataStartRowIndex = selectedHeaderRowIndex + 1;
  let trailingBlankRowsCount = 0;
  for (let r = dataStartRowIndex; r < totalRawRows; r++) {
    const rawRow = activeMatrix[r] || [];
    if (rawRow.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      trailingBlankRowsCount++;
    }
  }

  const inspection: RawFileInspection = {
    fileName: file.name,
    fileSize: file.size,
    formattedSize: formatBytes(file.size),
    fileType,
    sheets,
    selectedSheet,
    totalRawRows,
    totalRawCols,
    detectedDelimiter: isCsv ? detectedDelimiter : undefined,
    rawSampleMatrix: activeMatrix.slice(0, 15),
    allSheetsMatrix,
    headerCandidates,
    selectedHeaderRowIndex,
    dataStartRowIndex,
    trailingBlankRowsCount,
  };

  return {
    inspection,
    rows: dataRows,
    columns: columnHeaders,
    allSheets,
  };
}

/**
 * Helper to parse a sheet matrix with header row offset and column deduplication
 */
function parseSheetMatrix(
  rawMatrix: any[][],
  headerRowIndex = 0,
  givenTotalCols?: number
): { rows: RowData[]; columns: string[] } {
  if (rawMatrix.length === 0) return { rows: [], columns: [] };

  const totalCols = givenTotalCols || Math.max(...rawMatrix.map((r) => (Array.isArray(r) ? r.length : 0)), 0);
  const rawHeaderRow = rawMatrix[headerRowIndex] || [];
  const columnHeaders: string[] = [];
  const usedColNames = new Map<string, number>();

  for (let c = 0; c < totalCols; c++) {
    let colName = rawHeaderRow[c] !== undefined ? String(rawHeaderRow[c]).trim() : '';
    if (!colName) {
      colName = `Column_${String.fromCharCode(65 + (c % 26))}${c >= 26 ? Math.floor(c / 26) : ''}`;
    }
    const lower = colName.toLowerCase();
    const count = usedColNames.get(lower) || 0;
    if (count > 0) {
      colName = `${colName}_${count + 1}`;
    }
    usedColNames.set(lower, count + 1);
    columnHeaders.push(colName);
  }

  const dataRows: RowData[] = [];
  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r] || [];
    const isRowAllBlank = rawRow.every((c) => c === null || c === undefined || String(c).trim() === '');
    if (isRowAllBlank) continue;

    const rowObj: RowData = {};
    columnHeaders.forEach((colName, colIdx) => {
      const val = rawRow[colIdx];
      rowObj[colName] = val !== undefined && val !== '' ? val : null;
    });
    dataRows.push(rowObj);
  }

  return { rows: dataRows, columns: columnHeaders };
}

/**
 * Re-parse dataset when the user selects a different sheet or changes the header row
 */
export function reparseWithHeaderRow(
  rawMatrix: any[][],
  headerRowIndex: number,
  totalRawCols: number
): { rows: RowData[]; columns: string[] } {
  const rawHeaderRow = rawMatrix[headerRowIndex] || [];
  const columnHeaders: string[] = [];
  const usedColNames = new Map<string, number>();

  for (let c = 0; c < totalRawCols; c++) {
    let colName = rawHeaderRow[c] !== undefined ? String(rawHeaderRow[c]).trim() : '';
    if (!colName) {
      colName = `Column_${String.fromCharCode(65 + (c % 26))}${c >= 26 ? Math.floor(c / 26) : ''}`;
    }
    const lower = colName.toLowerCase();
    const count = usedColNames.get(lower) || 0;
    if (count > 0) {
      colName = `${colName}_${count + 1}`;
    }
    usedColNames.set(lower, count + 1);
    columnHeaders.push(colName);
  }

  const dataRows: RowData[] = [];
  for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
    const rawRow = rawMatrix[r] || [];
    const isRowAllBlank = rawRow.every((c) => c === null || c === undefined || String(c).trim() === '');
    if (isRowAllBlank) continue;

    const rowObj: RowData = {};
    columnHeaders.forEach((colName, colIdx) => {
      const val = rawRow[colIdx];
      rowObj[colName] = val !== undefined && val !== '' ? val : null;
    });
    dataRows.push(rowObj);
  }

  return { rows: dataRows, columns: columnHeaders };
}

function detectCsvDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  const delimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let bestConsistency = -1;

  delimiters.forEach((delim) => {
    const counts = lines.map((line) => line.split(delim).length - 1);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg > 0) {
      // Check variance
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
      const consistency = avg / (1 + variance);
      if (consistency > bestConsistency) {
        bestConsistency = consistency;
        bestDelimiter = delim;
      }
    }
  });

  return bestDelimiter;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
