import React, { useState, useMemo } from 'react';
import { X, Search, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { RowData, ColumnMeta } from '../types';
import { downloadDatasetAsExcel, downloadDatasetAsCsv } from '../utils/dataParser';

interface FullDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: RowData[];
  columns: string[];
  columnMetas: ColumnMeta[];
  title: string;
  versionLabel: string;
  fileName: string;
  originalWorkbookSheets?: Record<string, { rows: RowData[]; columns: string[] }>;
  selectedSheetName?: string;
}

export const FullDataModal: React.FC<FullDataModalProps> = ({
  isOpen,
  onClose,
  rows,
  columns,
  columnMetas,
  title,
  versionLabel,
  fileName,
  originalWorkbookSheets,
  selectedSheetName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      })
    );
  }, [rows, columns, searchTerm]);

  // Pagination calculations
  const totalRows = filteredRows.length;
  const isAll = pageSize >= totalRows;
  const totalPages = isAll ? 1 : Math.ceil(totalRows / pageSize);
  const paginatedRows = useMemo(() => {
    if (isAll) return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize, isAll]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-data-title"
    >
      <div
        className="relative w-full max-w-7xl max-h-[92vh] rounded-2xl bg-surface-container border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-4 bg-surface-container-low shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-label-sm uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {versionLabel}
              </span>
              <span className="text-xs text-outline font-data-mono">
                {rows.length} total row{rows.length !== 1 ? 's' : ''} • {columns.length} columns
              </span>
            </div>
            <h2 id="full-data-title" className="font-headline-md text-xl md:text-2xl font-semibold text-on-surface">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Buttons */}
            <button
              onClick={() =>
                downloadDatasetAsExcel(
                  rows,
                  columns,
                  `${fileName}_${versionLabel}`,
                  originalWorkbookSheets,
                  selectedSheetName
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs text-on-surface border border-outline-variant/30 hover:border-primary/40 transition-colors"
              title="Download this view as Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={() => downloadDatasetAsCsv(rows, columns, `${fileName}_${versionLabel}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs text-on-surface border border-outline-variant/30 hover:border-primary/40 transition-colors"
              title="Download this view as CSV"
            >
              <FileText className="w-4 h-4 text-secondary" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface transition-colors p-2 rounded-lg hover:bg-surface-container-high ml-2"
              aria-label="Close full data view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Page size selector */}
        <div className="p-3 md:px-6 bg-surface-container border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search all ${rows.length} rows...`}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface placeholder:text-outline text-xs focus:outline-none focus:border-primary transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-outline">
            <span>Rows per page:</span>
            <div className="flex items-center gap-1">
              {[25, 50, 100, 500].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    pageSize === size && !isAll
                      ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                      : 'bg-surface-container-high hover:bg-surface-container-highest text-outline'
                  }`}
                >
                  {size}
                </button>
              ))}
              <button
                onClick={() => {
                  setPageSize(rows.length + 10);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isAll
                    ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-outline'
                }`}
              >
                Show All ({rows.length})
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Data Table Container */}
        <div className="flex-1 overflow-auto bg-surface-container-lowest relative">
          <table className="w-full text-left font-data-mono text-xs border-collapse border-spacing-0">
            <thead className="sticky top-0 z-20 bg-surface-container-high shadow-md">
              <tr className="border-b border-outline-variant/50">
                <th className="p-3 bg-surface-container-highest/60 text-outline w-16 text-center font-semibold border-r border-outline-variant/30 sticky left-0 z-30">
                  #
                </th>
                {columns.map((col) => {
                  const meta = columnMetas.find((m) => m.name === col);
                  return (
                    <th
                      key={col}
                      className="p-3 text-primary font-semibold border-r border-outline-variant/30 min-w-[130px] whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{col}</span>
                        {meta && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-secondary border border-outline-variant/30 font-normal">
                            {meta.detectedType}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, rIdx) => {
                  const globalRowIndex = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <tr
                      key={rIdx}
                      className="hover:bg-surface-container/60 transition-colors group"
                    >
                      <td className="p-2.5 text-center text-outline bg-surface-container-low border-r border-outline-variant/30 sticky left-0 group-hover:bg-surface-container-high font-mono text-[11px]">
                        {globalRowIndex}
                      </td>
                      {columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || String(val).trim() === '';
                        return (
                          <td
                            key={col}
                            className={`p-2.5 border-r border-outline-variant/20 max-w-[240px] truncate ${
                              isNull ? 'text-outline/50 italic' : 'text-on-surface'
                            }`}
                            title={val !== null && val !== undefined ? String(val) : 'Empty cell'}
                          >
                            {isNull ? 'null' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="p-12 text-center text-outline">
                    No rows match search query "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Pagination Footer */}
        <div className="p-3 md:px-6 bg-surface-container-low border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs text-outline">
          <div>
            Showing{' '}
            <span className="text-on-surface font-semibold font-data-mono">
              {totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="text-on-surface font-semibold font-data-mono">
              {Math.min(currentPage * pageSize, totalRows)}
            </span>{' '}
            of{' '}
            <span className="text-primary font-semibold font-data-mono">{totalRows}</span>{' '}
            {totalRows !== rows.length ? `(filtered from ${rows.length})` : 'rows'}
          </div>

          {!isAll && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-data-mono text-secondary">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
