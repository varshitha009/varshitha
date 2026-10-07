import { RowData } from '../types';

/**
 * SUMMARY ROW DETECTION
 * Identifies summary/subtotal/total rows in the dataset (e.g. "Total", "Grand Total", "Subtotal", "Sum").
 * Ensures they are not treated as ordinary transactions during profiling, averaging, or deduplication,
 * and preserves them safely in the dataset.
 */

export interface SummaryRowInfo {
  summaryRowIndices: number[];
  transactionRowIndices: number[];
  summaryLabels: Record<number, string>;
}

const SUMMARY_KEYWORDS = [
  'total',
  'grand total',
  'subtotal',
  'sub-total',
  'sum',
  'overall total',
  'all total',
  'average total',
];

export function detectSummaryRows(rows: RowData[], columns: string[]): SummaryRowInfo {
  const summaryRowIndices: number[] = [];
  const transactionRowIndices: number[] = [];
  const summaryLabels: Record<number, string> = {};

  rows.forEach((row, idx) => {
    let isSummary = false;
    let foundLabel = '';

    // Check all column cells in the row for summary keywords
    for (const col of columns) {
      const val = row[col];
      if (val !== null && val !== undefined) {
        const strVal = String(val).trim().toLowerCase();
        for (const kw of SUMMARY_KEYWORDS) {
          if (strVal === kw || strVal.startsWith(`${kw}:`) || strVal.startsWith(`${kw} `)) {
            isSummary = true;
            foundLabel = String(val).trim();
            break;
          }
        }
      }
      if (isSummary) break;
    }

    if (isSummary) {
      summaryRowIndices.push(idx);
      summaryLabels[idx] = foundLabel;
    } else {
      transactionRowIndices.push(idx);
    }
  });

  return {
    summaryRowIndices,
    transactionRowIndices,
    summaryLabels,
  };
}
