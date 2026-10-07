import * as XLSX from 'xlsx';
import { RowData, ColumnMeta, RawFileInspection, ChangeLogItem, ValidationReport } from '../types';
import { inspectRawFile } from './fileInspector';

/**
 * Real Excel and CSV parser using SheetJS (XLSX).
 * Parses actual binary buffer or text into genuine row arrays.
 */
export async function parseUploadedFile(
  file: File,
  requestedSheetName?: string
): Promise<{
  rows: RowData[];
  columns: string[];
  fileName: string;
  fileSize: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  rawInspection: RawFileInspection;
  allSheets: Record<string, { rows: RowData[]; columns: string[] }>;
}> {
  const result = await inspectRawFile(file, requestedSheetName);

  return {
    rows: result.rows,
    columns: result.columns,
    fileName: file.name,
    fileSize: result.inspection.formattedSize,
    fileType: result.inspection.fileType,
    rawInspection: result.inspection,
    allSheets: result.allSheets,
  };
}

/**
 * Real embedded sample datasets with actual records, including the exact
 * semantic variations (e.g. Month with Jan, January, June, Jun, J-U-N, JM,
 * casing differences, extra spaces, and high units).
 */
export const REAL_SAMPLE_DATASETS: Record<
  string,
  {
    fileName: string;
    fileType: 'csv' | 'xlsx';
    fileSize: string;
    csvContent: string;
  }
> = {
  sales_orders_q4: {
    fileName: 'sales_orders_q4.csv',
    fileType: 'csv',
    fileSize: '4.2 KB',
    csvContent: `Order_ID,Month,Date,Customer,Channel,Units,Unit_Price,Total_Sales,Status
ORD-1001,January,2026-01-05,Acme Corp,Retail,15,450,6750,Completed
ORD-1002,Jan,2026-01-08,  Baker LLC  ,Online,22,380,8360,Completed
ORD-1003,January,2026-01-12,City Shop,Retail,8,520,4160,Completed
ORD-1004,Jan,01/15/2026,Delta Store,retail,12,410,4920,completed
ORD-1005,June,2026-06-02,Echo Inc,Online,18,450,8100,Completed
ORD-1006,Jun,2026-06-04,Foxtrot LLC,Online,30,350,10500,Completed
ORD-1007,J-U-N,06/10/2026,Golf Goods,Retail,14,480,6720,Completed
ORD-1008,JM,2026-06-15,Hotel Co,Retail,25,390,9750,Pending
ORD-1009,January,2026-01-20,India Tech,Online,19,450,8550,Completed
ORD-1010,June,2026-06-18,Juliet Store,RETAIL,16,420,6720,Completed
ORD-1011,June,2026-06-22,Kilo Supply,Online,950,450,427500,Review
ORD-1012,Jan,2026-01-25,Lima Corp,Retail,,410,,Completed
ORD-1013,June,2026-06-28,Mike Mart,Online,14,450,6300,Completed
ORD-1014,Jan,2026-01-30,November Inc,retail,20,380,7600,Completed
ORD-1014,Jan,2026-01-30,November Inc,retail,20,380,7600,Completed
ORD-1015,June,2026-06-30,Oscar LLC,Online,28,360,10080,Completed`,
  },
  monthly_customers: {
    fileName: 'monthly_customers.xlsx',
    fileType: 'xlsx',
    fileSize: '3.8 KB',
    csvContent: `Customer_ID,Customer_Name,Join_Date,Plan_Tier,Monthly_Spend,Region,Active_Status
CUST-201,Acme Corporation,2025-04-12,Enterprise,1450,West,Active
CUST-202,Baker Group,04/18/2025,enterprise,1200,West,active
CUST-203,Cascade Retail,2025-05-02,Standard,450,North,Active
CUST-204,  Delta Partners  ,2025-05-15,Standard,450,South,Active
CUST-205,Equinox Media,2025-06-01,Premium,890,East,Active
CUST-206,Frontier LLC,06/14/2025,Premium,890,east,Active
CUST-207,Global Horizons,2025-07-20,Enterprise,1500,International,Active
CUST-208,Harbor Logistics,2025-08-11,Standard,,West,Pending
CUST-209,Imperial Foods,2025-09-04,Standard,450,South,Active
CUST-209,Imperial Foods,2025-09-04,Standard,450,South,Active
CUST-210,Jupiter Labs,2025-10-18,Premium,890,North,Active
CUST-211,Keystone Systems,2025-11-09,Enterprise,18500,West,Active`,
  },
  product_revenue_breakdown: {
    fileName: 'product_revenue_breakdown.csv',
    fileType: 'csv',
    fileSize: '2.9 KB',
    csvContent: `SKU,Product_Name,Category,Quarter,Units_Sold,Price,Revenue,Inventory_Status
PRD-01,Enterprise Suite,Software,Q1,120,550,66000,In Stock
PRD-02,Analytics Add-on,Services,Q1,340,110,37400,In Stock
PRD-03,Support Tier 1,Support,Q1,95,210,19950,Active
PRD-04,Enterprise Suite,Software,Q2,145,550,79750,In Stock
PRD-05,Analytics Add-on,services,Q2,390,110,42900,in stock
PRD-06,Support Tier 1,support,Q2,105,210,22050,Active
PRD-07,Custom Integration,Services,Q2,18,1200,21600,Limited
PRD-08,Enterprise Suite,SOFTWARE,Q3,160,550,88000,In Stock
PRD-09,Analytics Add-on,Services,Q3,420,110,46200,In Stock
PRD-10,Executive Dashboard,Specialty,Q3,1,85000,85000,Custom
PRD-11,Support Tier 1,Support,Q3,115,210,24150,Active`,
  },
};

/**
 * Parse one of the embedded sample datasets through XLSX to guarantee genuine rows.
 */
export function parseSampleDataset(key: string): {
  rows: RowData[];
  columns: string[];
  fileName: string;
  fileSize: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  rawInspection: RawFileInspection;
} {
  const sample = REAL_SAMPLE_DATASETS[key] || REAL_SAMPLE_DATASETS['sales_orders_q4'];
  const workbook = XLSX.read(sample.csvContent, {
    type: 'string',
    cellDates: true,
    raw: false,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: null,
  });

  const columnSet = new Set<string>();
  rawRows.forEach((r) => Object.keys(r).forEach((k) => columnSet.add(k.trim())));
  const columns = Array.from(columnSet);

  const rows: RowData[] = rawRows.map((r) => {
    const normalized: RowData = {};
    columns.forEach((col) => {
      normalized[col] = r[col] !== undefined ? r[col] : null;
    });
    return normalized;
  });

  const rawInspection: RawFileInspection = {
    fileName: sample.fileName,
    fileSize: 4200,
    formattedSize: sample.fileSize,
    fileType: sample.fileType,
    sheets: ['Sheet1'],
    selectedSheet: 'Sheet1',
    totalRawRows: rows.length + 1,
    totalRawCols: columns.length,
    detectedDelimiter: ',',
    rawSampleMatrix: [columns, ...rows.slice(0, 14).map((r) => columns.map((c) => r[c]))],
    headerCandidates: [
      {
        rowIndex: 0,
        sampleCells: columns.slice(0, 5),
        stringDensity: 100,
        uniquenessRatio: 100,
        isLikelyHeader: true,
        reason: 'Detected primary header row',
      },
    ],
    selectedHeaderRowIndex: 0,
    dataStartRowIndex: 1,
    trailingBlankRowsCount: 0,
  };

  return {
    rows,
    columns,
    fileName: sample.fileName,
    fileSize: sample.fileSize,
    fileType: sample.fileType,
    rawInspection,
  };
}

/**
 * Download real Excel workbook (.xlsx) using SheetJS
 * Preserves all relevant sheets (e.g. Sales Data, Reference) instead of silently discarding them!
 */
export function downloadDatasetAsExcel(
  rows: RowData[],
  columns: string[],
  fileName: string,
  workbookSheets?: Record<string, { rows: RowData[]; columns: string[] }>,
  currentSheetName?: string
) {
  const workbook = XLSX.utils.book_new();
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '');

  if (workbookSheets && Object.keys(workbookSheets).length > 0) {
    // Preserve all sheets from original workbook
    const sheetNames = Object.keys(workbookSheets);
    sheetNames.forEach((sheetName) => {
      let sheetRows = workbookSheets[sheetName]?.rows || [];
      let sheetCols = workbookSheets[sheetName]?.columns || [];

      // For the active/cleaned sheet, write the cleaned rows and columns
      if (currentSheetName && sheetName === currentSheetName) {
        sheetRows = rows;
        sheetCols = columns;
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: sheetCols });
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  } else {
    // Single sheet workbook: preserve genuine sheet name
    const targetSheetName = currentSheetName || 'Sheet1';
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    XLSX.utils.book_append_sheet(workbook, worksheet, targetSheetName);
  }

  XLSX.writeFile(workbook, `${cleanBaseName}.xlsx`);
}

/**
 * Download real CSV (.csv) using SheetJS
 */
export function downloadDatasetAsCsv(
  rows: RowData[],
  columns: string[],
  fileName: string
) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '');
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${cleanBaseName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download Cleaning Audit Report (Text Summary)
 */
export function downloadAuditReport(
  fileName: string,
  versionLabel: string,
  changeLog: ChangeLogItem[],
  validationReport?: ValidationReport
) {
  const lines: string[] = [
    `==================================================`,
    `AI DATA WORKSPACE - CLEANING AUDIT REPORT`,
    `==================================================`,
    `Dataset File: ${fileName}`,
    `Version: ${versionLabel}`,
    `Generated At: ${new Date().toLocaleString()}`,
    `Total Changes Executed: ${changeLog.length}`,
    ``,
    `--------------------------------------------------`,
    `POST-EXECUTION VALIDATION STATUS`,
    `--------------------------------------------------`,
    `Passed Validation: ${validationReport?.passed ? 'YES' : 'WARNINGS ENCOUNTERED'}`,
    `Rows: ${validationReport?.preRowCount ?? 'N/A'} → ${validationReport?.postRowCount ?? 'N/A'}`,
    `Columns: ${validationReport?.preColCount ?? 'N/A'} → ${validationReport?.postColCount ?? 'N/A'}`,
    `Cells Modified: ${validationReport?.modifiedCellsCount ?? changeLog.length}`,
    `Net Null Cells Delta: ${validationReport?.nullDelta ?? 0}`,
  ];

  if (validationReport?.warnings && validationReport.warnings.length > 0) {
    lines.push(``, `Warnings:`);
    validationReport.warnings.forEach((w) => lines.push(` - ${w}`));
  }

  lines.push(
    ``,
    `--------------------------------------------------`,
    `CHANGE LOG & AUDIT TRAIL`,
    `--------------------------------------------------`
  );

  if (changeLog.length === 0) {
    lines.push(`No modifications recorded (Original Upload state).`);
  } else {
    changeLog.forEach((item, idx) => {
      lines.push(
        `[${idx + 1}] ${item.timestamp} | ${item.description}` +
          (item.column ? ` | Column: ${item.column}` : '') +
          (item.rowNumber ? ` | Row ${item.rowNumber}` : '') +
          ` | "${item.beforeValue}" → "${item.afterValue}"`
      );
    });
  }

  lines.push(``, `==================================================`, `END OF AUDIT REPORT`);

  const reportText = lines.join('\n');
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '');
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${cleanBaseName}_cleaning_audit_report.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
