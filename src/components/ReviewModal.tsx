import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Edit3,
  Trash2,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { DataQualityIssue, RowData } from '../types';
import {
  ActionType,
  generateActionPreview,
  ActionPreview
} from '../utils/actionProcessor';

interface ReviewModalProps {
  issue: DataQualityIssue | null;
  rows: RowData[];
  columns: string[];
  onClose: () => void;
  onApplyAction: (action: ActionType, customInstruction?: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  issue,
  rows,
  columns,
  onClose,
  onApplyAction,
}) => {
  if (!issue) return null;

  // Selected action: keep | standardize | remove | fix
  const [selectedAction, setSelectedAction] = useState<ActionType>('standardize');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>('');

  // Default natural language suggestions based on issue
  const suggestions = useMemo(() => {
    const list: string[] = [];
    const sample = issue.suggestedFixDetails?.originalSample;
    const col = issue.column || 'this';

    if (sample === 'JM' || issue.whatIFound.includes("'JM'")) {
      list.push('Change JM to Jun');
      list.push('Change JM to January');
    } else if (issue.id.includes('extreme_high')) {
      list.push('Change this value to 50');
      list.push('Change this value to 100');
    } else if (issue.fixType === 'fill_missing') {
      list.push('Fill with 0');
      list.push('Fill with N/A');
    } else if (issue.fixType === 'standardize_dates') {
      list.push('Make all these dates DD-MM-YYYY');
      list.push('Make all these dates YYYY-MM-DD');
    } else if (col) {
      list.push(`Make all ${col} Title Case`);
    }
    return list;
  }, [issue]);

  // Set default action for ambiguous value: default to 'fix'
  useEffect(() => {
    if (
      issue.id.includes('ambiguous_value') ||
      issue.whatIFound.includes("'JM'") ||
      issue.whatIFound.includes('"JM"')
    ) {
      setSelectedAction('fix');
      setNaturalLanguageInput('Change JM to Jun');
    } else if (issue.fixType === 'remove_duplicates') {
      setSelectedAction('standardize');
      setNaturalLanguageInput('');
    } else {
      setSelectedAction('standardize');
      setNaturalLanguageInput('');
    }
  }, [issue]);

  // Generate live preview before changing anything
  const preview: ActionPreview = useMemo(() => {
    return generateActionPreview(
      selectedAction,
      issue,
      rows,
      naturalLanguageInput
    );
  }, [selectedAction, issue, rows, naturalLanguageInput]);

  // Sample affected rows preview from the REAL uploaded dataset
  const affectedRows = issue.affectedRowIndices.slice(0, 5).map((idx) => ({
    idx: idx + 1,
    row: rows[idx],
  }));

  const handleApply = () => {
    onApplyAction(selectedAction, naturalLanguageInput);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] rounded-2xl bg-surface-container border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-outline-variant/30 flex items-start justify-between gap-4 bg-surface-container-low shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30 mt-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-label-sm uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Your Choice
                </span>
                {issue.column && (
                  <span className="text-xs font-data-mono text-outline">
                    Column: <strong className="text-secondary">{issue.column}</strong>
                  </span>
                )}
              </div>
              <h2 id="review-modal-title" className="font-headline-md text-xl md:text-2xl font-semibold text-on-surface mt-1">
                {issue.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container-high cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Finding & AI Suggestion Callout */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2.5 text-sm">
            <div>
              <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline block font-semibold mb-0.5">
                WHAT I FOUND
              </span>
              <p className="text-on-surface leading-relaxed">{issue.whatIFound}</p>
            </div>

            {issue.aiSuggestion && (
              <div className="pt-2 border-t border-outline-variant/20 flex items-start gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-primary-fixed leading-relaxed font-medium">
                  {issue.aiSuggestion}
                </p>
              </div>
            )}
          </div>

          {/* Real Affected Rows Preview */}
          {affectedRows.length > 0 && (
            <div>
              <div className="text-xs font-label-sm text-outline uppercase tracking-wider mb-2">
                AFFECTED ROWS IN ACTUAL DATASET ({issue.affectedRowIndices.length} total):
              </div>
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
                <table className="w-full text-left font-data-mono text-xs">
                  <thead className="bg-surface-container-high text-primary border-b border-outline-variant/30">
                    <tr>
                      <th className="p-2.5 w-16 text-center">Row</th>
                      {issue.column && <th className="p-2.5 text-primary">{issue.column}</th>}
                      {columns
                        .filter((c) => c !== issue.column)
                        .slice(0, 3)
                        .map((c) => (
                          <th key={c} className="p-2.5 text-outline">
                            {c}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {affectedRows.map(({ idx, row }) => (
                      <tr key={idx} className="hover:bg-surface-container/40">
                        <td className="p-2.5 text-center text-outline font-semibold">{idx}</td>
                        {issue.column && (
                          <td className="p-2.5 text-primary-fixed font-bold bg-primary/10">
                            {String(row[issue.column] ?? '(blank)')}
                          </td>
                        )}
                        {columns
                          .filter((c) => c !== issue.column)
                          .slice(0, 3)
                          .map((c) => (
                            <td key={c} className="p-2.5 text-on-surface-variant truncate max-w-[140px]">
                              {String(row[c] ?? '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* THE FOUR USER ACTIONS: Keep / Standardize / Remove / Fix */}
          {/* ======================================================= */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-label-sm text-outline uppercase tracking-wider font-semibold">
                YOUR CHOICE:
              </span>
              <span className="text-[11px] text-outline">
                Choose an action to preview before applying
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Choice 1: KEEP AS IT IS */}
              <button
                type="button"
                onClick={() => setSelectedAction('keep')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                  selectedAction === 'keep'
                    ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(233,193,118,0.2)]'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-outline" />
                <span className="font-label-md text-xs font-semibold block">
                  KEEP AS IT IS
                </span>
                <span className="text-[10px] text-outline block leading-tight">
                  Leave unchanged
                </span>
              </button>

              {/* Choice 2: STANDARDIZE */}
              <button
                type="button"
                onClick={() => setSelectedAction('standardize')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                  selectedAction === 'standardize'
                    ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(233,193,118,0.2)]'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <RefreshCw className="w-5 h-5 text-primary" />
                <span className="font-label-md text-xs font-semibold block">
                  STANDARDIZE
                </span>
                <span className="text-[10px] text-outline block leading-tight">
                  Unify formats
                </span>
              </button>

              {/* Choice 3: REMOVE */}
              <button
                type="button"
                onClick={() => setSelectedAction('remove')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                  selectedAction === 'remove'
                    ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(233,193,118,0.2)]'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <Trash2 className="w-5 h-5 text-error" />
                <span className="font-label-md text-xs font-semibold block">
                  REMOVE
                </span>
                <span className="text-[10px] text-outline block leading-tight">
                  Delete affected items
                </span>
              </button>

              {/* Choice 4: FIX / CHANGE */}
              <button
                type="button"
                onClick={() => setSelectedAction('fix')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                  selectedAction === 'fix'
                    ? 'border-primary bg-primary/15 text-primary shadow-[0_0_15px_rgba(233,193,118,0.2)]'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-outline hover:text-on-surface'
                }`}
              >
                <Edit3 className="w-5 h-5 text-secondary" />
                <span className="font-label-md text-xs font-semibold block">
                  FIX / CHANGE
                </span>
                <span className="text-[10px] text-outline block leading-tight">
                  Specify change
                </span>
              </button>
            </div>
          </div>

          {/* Natural Language Input for FIX / CHANGE */}
          {selectedAction === 'fix' && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-primary/40 space-y-3">
              <label className="block text-xs font-label-sm uppercase tracking-wider text-primary font-semibold" htmlFor="fix-instruction-input">
                WHAT WOULD YOU LIKE TO CHANGE?
              </label>

              <div className="relative">
                <input
                  id="fix-instruction-input"
                  type="text"
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="e.g. Change JM to Jun, or Change this value to 10"
                  className="w-full h-11 px-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              {/* Helpful Quick Suggestion Chips */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-outline">
                  <span>Quick suggestions:</span>
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNaturalLanguageInput(sug)}
                      className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-secondary border border-outline-variant/30 hover:border-primary/40 transition-colors text-xs font-medium cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* CONFIRMATION PREVIEW BEFORE APPLYING ANY CHANGE        */}
          {/* ======================================================= */}
          <div className="p-4 md:p-5 rounded-xl bg-surface-container-lowest border-2 border-primary/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <span className="font-label-sm text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>CONFIRMATION PREVIEW</span>
              </span>
              <span className="text-[11px] font-data-mono text-outline">
                {preview.changeCount} change(s) proposed
              </span>
            </div>

            {/* WHAT I UNDERSTOOD */}
            {preview.whatIUnderstood && (
              <div className="space-y-1">
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline block font-semibold">
                  WHAT I UNDERSTOOD:
                </span>
                <p className="text-sm font-medium text-on-surface bg-surface-container p-2.5 rounded-lg border border-outline-variant/20">
                  {preview.whatIUnderstood}
                </p>
              </div>
            )}

            {/* WHAT WILL CHANGE */}
            {preview.whatWillChange && (
              <div className="space-y-1">
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline block font-semibold">
                  WHAT WILL CHANGE:
                </span>
                <p className="text-xs text-on-surface-variant">
                  {preview.whatWillChange}
                </p>
              </div>
            )}

            {/* Changes list preview (e.g. January → Jan, JAN → Jan) */}
            {preview.changesPreview.length > 0 ? (
              <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-high/40 max-h-48 overflow-y-auto">
                <table className="w-full text-left font-data-mono text-xs">
                  <thead className="bg-surface-container-high text-outline text-[11px] border-b border-outline-variant/20">
                    <tr>
                      <th className="p-2 w-14 text-center">Row</th>
                      <th className="p-2">Current Value</th>
                      <th className="p-2 w-8 text-center">→</th>
                      <th className="p-2 text-primary font-semibold">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {preview.changesPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-container">
                        <td className="p-2 text-center text-outline">
                          {item.rowNumber ?? '-'}
                        </td>
                        <td className="p-2 text-outline line-through">
                          {item.from}
                        </td>
                        <td className="p-2 text-center text-outline">→</td>
                        <td className="p-2 text-primary font-bold">
                          {item.to}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : selectedAction === 'keep' ? (
              <div className="p-3 rounded-lg bg-surface-container text-xs text-outline text-center">
                Existing data values will remain exactly as they are.
              </div>
            ) : preview.unsupportedReason ? (
              <div className="p-3 rounded-lg bg-surface-container text-xs text-error text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-error" />
                <span>{preview.unsupportedReason}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 md:px-6 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-outline hidden sm:block">
            {selectedAction === 'keep'
              ? 'Click Confirm to keep original values unchanged.'
              : 'Underlying dataset will only update after you click Apply Changes.'}
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-sm text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={selectedAction !== 'keep' && (!preview.isExecutable || preview.changeCount === 0)}
              className="btn-shimmer px-5 py-2 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold text-sm hover:from-primary-fixed hover:to-primary transition-all shadow-[0_0_15px_rgba(233,193,118,0.25)] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>
                {selectedAction === 'keep' ? 'Confirm (Keep As It Is)' : 'Apply Changes'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
