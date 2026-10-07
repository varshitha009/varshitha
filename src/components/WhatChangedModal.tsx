import React, { useState, useMemo } from 'react';
import { X, Search, FileCode, CheckCircle2, ListFilter, Sliders } from 'lucide-react';
import { ChangeLogItem, CleaningExecutionLog } from '../types';

interface WhatChangedModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionLabel: string;
  changeLog: ChangeLogItem[];
  executionLogs?: CleaningExecutionLog[];
}

export const WhatChangedModal: React.FC<WhatChangedModalProps> = ({
  isOpen,
  onClose,
  versionLabel,
  changeLog,
  executionLogs = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cells' | 'operations'>('cells');

  const filteredChanges = useMemo(() => {
    if (!searchTerm.trim()) return changeLog;
    const term = searchTerm.toLowerCase().trim();
    return changeLog.filter(
      (c) =>
        (c.column && c.column.toLowerCase().includes(term)) ||
        c.description.toLowerCase().includes(term) ||
        String(c.beforeValue).toLowerCase().includes(term) ||
        String(c.afterValue).toLowerCase().includes(term) ||
        String(c.rowNumber).includes(term)
    );
  }, [changeLog, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="what-changed-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-surface-container border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-outline-variant/30 flex items-center justify-between gap-4 bg-surface-container-low shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-label-sm uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-bold">
                {versionLabel}
              </span>
              <span className="text-xs text-outline font-data-mono">
                {changeLog.length} total cell change{changeLog.length !== 1 ? 's' : ''} applied
              </span>
            </div>
            <h2 id="what-changed-title" className="font-headline-md text-xl md:text-2xl font-semibold text-on-surface">
              What Changed in Your Data
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container-high cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View mode tabs & Search Bar */}
        <div className="p-4 border-b border-outline-variant/20 bg-surface-container flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('cells')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'cells'
                  ? 'bg-primary text-on-primary-container'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Cell-by-Cell Log ({changeLog.length})
            </button>
            {executionLogs.length > 0 && (
              <button
                onClick={() => setViewMode('operations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'operations'
                    ? 'bg-primary text-on-primary-container'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Operations Summary ({executionLogs.length})
              </button>
            )}
          </div>

          {viewMode === 'cells' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search changes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1">
          {viewMode === 'operations' && executionLogs.length > 0 ? (
            <div className="space-y-3">
              {executionLogs.map((op, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-primary font-data-mono">
                        {op.operation}
                      </span>
                      {op.affectedColumn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-secondary font-data-mono">
                          {op.affectedColumn}
                        </span>
                      )}
                    </div>
                    <p className="text-on-surface-variant">{op.reason}</p>
                  </div>
                  <span className="font-data-mono text-outline font-semibold shrink-0">
                    {op.affectedCount} record(s)
                  </span>
                </div>
              ))}
            </div>
          ) : changeLog.length === 0 ? (
            <div className="p-12 text-center text-xs text-outline space-y-2">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-on-surface text-sm">No changes on this version</p>
              <p>This dataset matches the original uploaded state.</p>
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="p-8 text-center text-xs text-outline">
              No changes match your search query &quot;{searchTerm}&quot;.
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-sm">
              <table className="w-full text-left font-data-mono text-xs">
                <thead className="bg-surface-container-high text-primary border-b border-outline-variant/30">
                  <tr>
                    <th className="p-3 w-16 text-center text-outline">Row</th>
                    <th className="p-3">Column</th>
                    <th className="p-3">Old Value</th>
                    <th className="p-3">New Value</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredChanges.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3 text-center text-outline font-semibold">
                        {item.rowNumber > 0 ? item.rowNumber : '—'}
                      </td>
                      <td className="p-3 text-secondary font-semibold">
                        {item.column || 'Dataset'}
                      </td>
                      <td className="p-3 text-error line-through truncate max-w-[160px]" title={String(item.beforeValue)}>
                        {String(item.beforeValue)}
                      </td>
                      <td className="p-3 text-primary-fixed font-bold truncate max-w-[160px]" title={String(item.afterValue)}>
                        {String(item.afterValue)}
                      </td>
                      <td className="p-3 text-on-surface-variant text-[11px] leading-relaxed">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0 text-xs">
          <span className="text-outline">
            All modifications were executed deterministically and can be undone at any time.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
