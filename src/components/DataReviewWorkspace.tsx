import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Table,
  CheckCircle2,
  Sparkles,
  Download,
  Eye,
  History,
  Check,
  Undo2,
  Search,
  FileCode,
  Send,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  Info,
  CornerDownLeft,
  Loader2,
  Trash2,
  Layers
} from 'lucide-react';
import {
  ParsedDataset,
  DatasetVersion,
  RowData,
  ChatMessage,
  ConversationalOperation
} from '../types';
import {
  downloadDatasetAsExcel,
  downloadDatasetAsCsv,
  downloadAuditReport
} from '../utils/dataParser';
import {
  interpretConversationalInstruction,
  applyConversationalOperation
} from '../utils/conversationalAssistant';
import { switchDatasetSheet } from '../utils/orchestrator';
import { FullDataModal } from './FullDataModal';
import { WhatChangedModal } from './WhatChangedModal';

interface DataReviewWorkspaceProps {
  dataset: ParsedDataset;
  onBackToUpload: () => void;
  onUpdateDataset: (updated: ParsedDataset) => void;
}

export const DataReviewWorkspace: React.FC<DataReviewWorkspaceProps> = ({
  dataset,
  onBackToUpload,
  onUpdateDataset,
}) => {
  // Current active dataset version
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(
    dataset.versions.length - 1
  );

  const currentVersion: DatasetVersion =
    dataset.versions[selectedVersionIdx] || dataset.versions[0];
  const originalVersion: DatasetVersion = dataset.versions[0];

  // Modals state
  const [isFullDataOpen, setIsFullDataOpen] = useState(false);
  const [isWhatChangedOpen, setIsWhatChangedOpen] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Search filter for the in-page preview table
  const [searchTerm, setSearchTerm] = useState('');

  // Conversational Assistant State
  const [inputMessage, setInputMessage] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; canUndo?: boolean } | null>(null);
  const [isSwitchingSheet, setIsSwitchingSheet] = useState(false);

  const showToast = (message: string, canUndo = false) => {
    setToast({ message, canUndo });
    setTimeout(() => setToast(null), 6000);
  };

  // Sheet switching handler (for multi-sheet Excel files)
  const handleSwitchSheet = async (sheetName: string) => {
    if (sheetName === dataset.rawInspection?.selectedSheet || isSwitchingSheet) return;
    setIsSwitchingSheet(true);
    try {
      const updated = await switchDatasetSheet(dataset, sheetName);
      onUpdateDataset(updated);
      showToast(`Switched to sheet "${sheetName}" and cleaned data.`);
    } catch (err: any) {
      console.error('Error switching sheet:', err);
      showToast(`Failed to switch sheet: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSwitchingSheet(false);
    }
  };

  // Sync selectedVersionIdx whenever versions change
  useEffect(() => {
    setSelectedVersionIdx(dataset.versions.length - 1);
  }, [dataset.versions.length]);

  // Scroll chat into view when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto clean summary from initial file processing
  const summary = dataset.autoCleanSummary || {
    originalRowCount: originalVersion.data.length,
    currentDataRowCount: currentVersion.data.length,
    summaryRowsCount: 0,
    summaryRowIndices: [],
    changesMade: [],
    leftUnchanged: [],
  };

  // 1-Click Undo / Revert
  const handleUndo = () => {
    if (selectedVersionIdx > 0) {
      const prevIdx = selectedVersionIdx - 1;
      setSelectedVersionIdx(prevIdx);
      const restoredLabel = dataset.versions[prevIdx].label;
      showToast(`Restored "${restoredLabel}"`);

      // Add system message to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `undo_${Date.now()}`,
          role: 'assistant',
          content: `Reverted to "${restoredLabel}".`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Conversational Chat submission
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isAiProcessing) return;

    setInputMessage('');

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiProcessing(true);

    try {
      const operation = await interpretConversationalInstruction(
        text,
        currentVersion.data,
        currentVersion.columns
      );

      if (operation.isAmbiguous) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            content: operation.clarificationMessage || operation.summary,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        // Show assistant preview message with [Apply Change] / [Cancel]
        setChatMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            content: operation.summary,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pendingOperation: operation,
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I ran into an issue understanding that request. Could you rephrase it?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // User confirms conversational edit
  const handleConfirmOperation = (operation: ConversationalOperation, msgId: string) => {
    const { updatedDataset, confirmationMessage } = applyConversationalOperation(
      operation,
      currentVersion,
      dataset
    );

    onUpdateDataset(updatedDataset);
    showToast(confirmationMessage, true);

    // Update message state: clear pending operation and append success confirmation
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingOperation: undefined,
              content: `${m.content} (Applied ✓)`,
            }
          : m
      ).concat({
        id: `applied_${Date.now()}`,
        role: 'assistant',
        content: `Done! ${operation.summary} Your dataset and table have been updated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
    );
  };

  // User cancels conversational edit
  const handleCancelOperation = (msgId: string) => {
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingOperation: undefined,
              content: `${m.content} (Cancelled)`,
            }
          : m
      )
    );
  };

  // Quick suggestion chips
  const quickSuggestions = [
    'Change all months to MMM',
    'Change Sat to Saturday',
    'Combine First Name and Last Name into Full Name',
    'Remove rows where Order Total is 0',
    'Rename Revenue to Sales',
    'Change JM to Jun',
  ];

  // Filtered rows for live preview table
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return currentVersion.data;
    const term = searchTerm.toLowerCase().trim();
    return currentVersion.data.filter((r) =>
      currentVersion.columns.some((c) =>
        String(r[c] ?? '').toLowerCase().includes(term)
      )
    );
  }, [currentVersion.data, currentVersion.columns, searchTerm]);

  // Dynamic column metadata for accurate type indicators (never hardcoded text!)
  const columnMetas: ColumnMeta[] = useMemo(() => {
    return currentVersion.columns.map((c) => {
      const nonNullRows = currentVersion.data.filter(
        (r) => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== ''
      );
      const vals = nonNullRows.map((r) => r[c]);
      const nonEmptyCount = vals.length;
      const nullCount = currentVersion.data.length - nonEmptyCount;
      const uniqueCount = new Set(vals).size;
      const sampleValues = vals.slice(0, 5);

      let detectedType: DetectedDataType = 'text';
      if (nonEmptyCount === 0) {
        detectedType = 'empty';
      } else if (
        vals.length > 0 &&
        vals.every((v) => typeof v === 'boolean' || /^(true|false|yes|no)$/i.test(String(v)))
      ) {
        detectedType = 'boolean';
      } else if (
        vals.length > 0 &&
        vals.every(
          (v) =>
            /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ||
            (typeof v === 'string' && !isNaN(new Date(v).getTime()) && /\d{4}/.test(v))
        )
      ) {
        detectedType = 'date';
      } else if (
        vals.length > 0 &&
        vals.every(
          (v) =>
            typeof v === 'number' ||
            (!isNaN(Number(v)) && String(v).trim() !== '') ||
            /^[-+]?\$?\s*[\d,]+(\.\d+)?$/.test(String(v))
        )
      ) {
        const isCurr = /price|revenue|cost|sales|spend|amount/i.test(c);
        if (isCurr) {
          detectedType = 'currency';
        } else {
          const allInts = vals.every((v) => Number.isInteger(Number(String(v).replace(/[$,]/g, ''))));
          detectedType = allInts ? 'integer' : 'decimal';
        }
      }

      return {
        name: c,
        detectedType,
        nonEmptyCount,
        nullCount,
        uniqueCount,
        sampleValues,
      };
    });
  }, [currentVersion.columns, currentVersion.data]);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md antialiased">
      {/* ======================================================= */}
      {/* TOP HEADER: File info, Versions, Undo, & Export         */}
      {/* ======================================================= */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 md:px-margin py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToUpload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary/50 text-on-surface-variant hover:text-on-surface text-xs font-label-md transition-all group cursor-pointer"
            title="Upload another file"
          >
            <ArrowLeft className="w-4 h-4 text-primary transition-transform group-hover:-translate-x-1" />
            <span>Upload New File</span>
          </button>

          <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              {dataset.fileType === 'xlsx' || dataset.fileType === 'xls' ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <span
                className="font-data-mono text-xs font-semibold text-on-surface block truncate max-w-[200px] sm:max-w-[320px]"
                title={dataset.fileName}
              >
                {dataset.fileName}
              </span>
              <span className="text-[10px] text-outline font-data-mono block">
                {dataset.fileSize} • {originalVersion.data.length} original rows
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Undo, Version Selector, & Export */}
        <div className="flex items-center gap-2.5">
          {/* 1-Click Undo / Revert */}
          {selectedVersionIdx > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary border border-outline-variant/40 text-xs font-semibold transition-colors cursor-pointer"
              title="Undo last change"
            >
              <Undo2 className="w-3.5 h-3.5 text-secondary" />
              <span>Undo</span>
            </button>
          )}

          {/* Immutable Version Selector */}
          <div className="relative">
            <button
              onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary/50 text-xs text-on-surface transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-primary">{currentVersion.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-outline" />
            </button>

            {versionDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-64 rounded-xl bg-surface-container-high border border-outline-variant/50 shadow-2xl p-2 z-50 text-left space-y-1"
                onClick={() => setVersionDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-label-sm uppercase text-outline tracking-wider">
                  Dataset Versions (Original Preserved)
                </div>
                {dataset.versions.map((ver, idx) => (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersionIdx(idx)}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      selectedVersionIdx === idx
                        ? 'bg-primary/20 text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <div>
                      <div className="truncate">{ver.label}</div>
                      <div className="text-[10px] text-outline">
                        {ver.data.length} rows • {ver.appliedChanges?.length || 0} change(s)
                      </div>
                    </div>
                    {selectedVersionIdx === idx && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
              className="btn-shimmer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold text-xs shadow-[0_0_12px_rgba(233,193,118,0.2)] hover:from-primary-fixed hover:to-primary transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {downloadDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-64 rounded-xl bg-surface-container-high border border-outline-variant/50 shadow-2xl p-2 z-50 text-left space-y-1"
                onClick={() => setDownloadDropdownOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] font-label-sm uppercase text-outline tracking-wider">
                  Cleaned Data ({currentVersion.label})
                </div>
                <button
                  onClick={() =>
                    downloadDatasetAsExcel(
                      currentVersion.data,
                      currentVersion.columns,
                      `${dataset.fileName}_Cleaned`,
                      dataset.originalWorkbookSheets,
                      dataset.rawInspection?.selectedSheet
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-on-surface hover:bg-surface-container hover:text-primary flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span>Download Cleaned (.xlsx)</span>
                </button>
                <button
                  onClick={() =>
                    downloadDatasetAsCsv(
                      currentVersion.data,
                      currentVersion.columns,
                      `${dataset.fileName}_Cleaned`
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-on-surface hover:bg-surface-container hover:text-secondary flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-secondary" />
                  <span>Download Cleaned (.csv)</span>
                </button>

                <div className="border-t border-outline-variant/20 my-1"></div>

                <div className="px-2 py-1 text-[10px] font-label-sm uppercase text-outline tracking-wider">
                  Original Data (Unchanged)
                </div>
                <button
                  onClick={() =>
                    downloadDatasetAsExcel(
                      originalVersion.data,
                      originalVersion.columns,
                      `${dataset.fileName}_Original`,
                      dataset.originalWorkbookSheets,
                      dataset.rawInspection?.selectedSheet
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-on-surface hover:bg-surface-container hover:text-primary flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-outline" />
                  <span>Download Original (.xlsx)</span>
                </button>
                <button
                  onClick={() =>
                    downloadDatasetAsCsv(
                      originalVersion.data,
                      originalVersion.columns,
                      `${dataset.fileName}_Original`
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-on-surface hover:bg-surface-container hover:text-secondary flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-outline" />
                  <span>Download Original (.csv)</span>
                </button>

                <div className="border-t border-outline-variant/20 my-1"></div>

                <div className="px-2 py-1 text-[10px] font-label-sm uppercase text-outline tracking-wider">
                  Audit Report
                </div>
                <button
                  onClick={() =>
                    downloadAuditReport(
                      dataset.fileName,
                      currentVersion.label,
                      currentVersion.changeLog || [],
                      currentVersion.validationReport
                    )
                  }
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-on-surface hover:bg-surface-container hover:text-primary flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-primary" />
                  <span>Export Audit Log (.txt)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="bg-primary/20 border-b border-primary/40 px-4 py-2 text-center text-xs font-semibold text-primary-fixed flex items-center justify-center gap-3 animate-fadeInUp">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>{toast.message}</span>
          {toast.canUndo && selectedVersionIdx > 0 && (
            <button
              onClick={handleUndo}
              className="ml-2 underline text-white hover:text-primary-fixed cursor-pointer font-bold"
            >
              Undo Change
            </button>
          )}
        </div>
      )}

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-margin py-8 space-y-8 text-left">
        {/* Multi-Sheet Selector (Excel workbooks with multiple sheets) */}
        {dataset.rawInspection?.sheets && dataset.rawInspection.sheets.length > 1 && (
          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider font-label-md">
                Workbook Sheets ({dataset.rawInspection.sheets.length}):
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dataset.rawInspection.sheets.map((sheet) => {
                const isActive = sheet === dataset.rawInspection?.selectedSheet;
                const sheetRows = dataset.originalWorkbookSheets?.[sheet]?.rows?.length;

                return (
                  <button
                    key={sheet}
                    type="button"
                    onClick={() => handleSwitchSheet(sheet)}
                    disabled={isSwitchingSheet}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary-container shadow-md'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
                    }`}
                  >
                    <span>{sheet}</span>
                    {sheetRows !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-black/20 text-on-primary-container font-data-mono font-bold'
                            : 'bg-surface-container text-outline font-data-mono'
                        }`}
                      >
                        {sheetRows} rows
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* SECTION 1: HERO STATUS & SUMMARY BANNER                 */}
        {/* ======================================================= */}
        <section className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-surface-container to-surface-container-low border border-primary/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>YOUR DATA IS CLEANED</span>
              </div>

              <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                Data Cleaned &amp; Ready
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-data-mono text-outline">
                <span>
                  Original rows:{' '}
                  <strong className="text-on-surface">{summary.originalRowCount}</strong>
                </span>
                <span>•</span>
                <span>
                  Current data rows:{' '}
                  <strong className="text-primary-fixed font-bold">
                    {summary.currentDataRowCount}
                  </strong>
                </span>
                {summary.summaryRowsCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-secondary font-semibold">
                      {summary.summaryRowsCount} summary row preserved
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions: [View Cleaned Data] & [What Changed] */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsFullDataOpen(true)}
                className="btn-shimmer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-semibold text-xs shadow-md hover:from-primary-fixed hover:to-primary transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Cleaned Data</span>
              </button>

              <button
                onClick={() => setIsWhatChangedOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 hover:border-primary/50 text-on-surface text-xs font-semibold transition-all cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-primary" />
                <span>What Changed</span>
                {currentVersion.changeLog && currentVersion.changeLog.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    {currentVersion.changeLog.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 2: CLEANING SUMMARY (Changes Made & Left Unchanged) */}
        {/* ======================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Changes Made Box */}
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/20">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wider font-label-md">
                  Changes Made
                </h3>
                <span className="text-[11px] text-outline">
                  High-confidence improvements applied automatically
                </span>
              </div>
            </div>

            {summary.changesMade.length === 0 ? (
              <div className="py-6 text-center text-xs text-outline space-y-1">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="font-medium text-on-surface">No automatic changes needed</p>
                <p>Your uploaded data was already clean and consistent.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.changesMade.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface-variant">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-on-surface block font-medium">
                        {item.title}
                      </strong>
                      <span className="text-[11px] text-outline leading-relaxed">
                        {item.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Not Changed / Left Unchanged Box */}
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container border border-outline-variant/30 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/20">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface uppercase tracking-wider font-label-md">
                  Left Unchanged
                </h3>
                <span className="text-[11px] text-outline">
                  Uncertain, ambiguous, or summary values left intact
                </span>
              </div>
            </div>

            {summary.leftUnchanged.length === 0 ? (
              <div className="py-6 text-center text-xs text-outline space-y-1">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="font-medium text-on-surface">No ambiguous values found</p>
                <p>All values in the dataset were unambiguous.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.leftUnchanged.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1.5"></span>
                    <div>
                      <strong className="text-on-surface block font-medium">
                        {item.title}
                      </strong>
                      <span className="text-[11px] text-outline leading-relaxed block">
                        {item.reason || item.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================= */}
        {/* SECTION 3: "WANT TO CHANGE ANYTHING ELSE?"               */}
        {/* Conversational AI Data Assistant                        */}
        {/* ======================================================= */}
        <section className="p-6 md:p-8 rounded-3xl bg-surface-container border border-outline-variant/40 space-y-6 shadow-xl text-left">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-label-sm uppercase tracking-wider text-primary font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>AI Data Assistant</span>
            </div>
            <h2 className="font-headline-lg text-xl md:text-2xl font-bold text-on-surface">
              Want to change anything else?
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant">
              Tell me what you want to change in your data. I&apos;ll prepare a preview and apply it directly to your spreadsheet.
            </p>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-label-sm uppercase tracking-wider text-outline block">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  disabled={isAiProcessing}
                  className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 hover:border-primary/40 text-xs text-on-surface transition-all cursor-pointer disabled:opacity-50 text-left"
                >
                  &ldquo;{sug}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          {chatMessages.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-outline-variant/20 max-h-96 overflow-y-auto pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-xl p-4 rounded-2xl text-xs space-y-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary/20 text-on-surface border border-primary/30 rounded-br-sm'
                        : 'bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-bl-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] text-outline">
                      <span className="font-semibold uppercase tracking-wider">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* Pending Confirmation Card */}
                    {msg.pendingOperation && (
                      <div className="mt-3 p-3.5 rounded-xl bg-surface-container border border-primary/40 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-primary">
                          <span>Preview Proposed Change</span>
                          <span className="text-[11px] font-data-mono text-outline">
                            {msg.pendingOperation.affectedCount} cell(s)
                          </span>
                        </div>

                        {/* Preview items sample */}
                        {msg.pendingOperation.previewItems.length > 0 && (
                          <div className="max-h-36 overflow-y-auto rounded-lg bg-surface-container-lowest border border-outline-variant/20 p-2 font-data-mono text-[11px] space-y-1">
                            {msg.pendingOperation.previewItems.slice(0, 4).map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between gap-2">
                                <span className="text-outline truncate">
                                  {p.rowNumber ? `Row ${p.rowNumber}: ` : ''}
                                  {p.column ? `${p.column}: ` : ''}
                                  <span className="text-error line-through">{p.from}</span>
                                </span>
                                <span className="text-primary-fixed font-bold truncate">
                                  → {p.to}
                                </span>
                              </div>
                            ))}
                            {msg.pendingOperation.previewItems.length > 4 && (
                              <div className="text-[10px] text-outline text-center pt-1">
                                + {msg.pendingOperation.previewItems.length - 4} more cell(s)
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmOperation(msg.pendingOperation!, msg.id)}
                            className="btn-shimmer px-3.5 py-1.5 rounded-lg bg-primary text-on-primary-container font-semibold text-xs shadow-sm cursor-pointer"
                          >
                            Apply Change
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOperation(msg.id)}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-outline text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Conversational Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Tell me what you want to change in your data (e.g. 'Change Sat to Saturday', 'Format Month as MMM')..."
                disabled={isAiProcessing}
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 text-xs md:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={!inputMessage.trim() || isAiProcessing}
              className="btn-shimmer px-4 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-semibold text-xs md:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              {isAiProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>
        </section>

        {/* ======================================================= */}
        {/* SECTION 4: LIVE CLEANED DATA PREVIEW TABLE              */}
        {/* ======================================================= */}
        <section className="p-6 md:p-8 rounded-3xl bg-surface-container border border-outline-variant/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-base md:text-lg font-bold text-on-surface">
                  Current Cleaned Data ({currentVersion.data.length} rows)
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Every modification was applied directly to this real dataset.
              </p>
            </div>

            {/* In-table Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest overflow-x-auto shadow-sm">
            <table className="w-full text-left font-data-mono text-xs">
              <thead className="bg-surface-container-high text-primary border-b border-outline-variant/30 sticky top-0">
                <tr>
                  <th className="p-3 w-14 text-center text-outline">#</th>
                  {currentVersion.columns.map((col) => {
                    const meta = columnMetas.find((m) => m.name === col);
                    return (
                      <th key={col} className="p-3 text-on-surface font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
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
              <tbody className="divide-y divide-outline-variant/20">
                {filteredRows.slice(0, 50).map((row, rIdx) => {
                  const isSummary =
                    summary.summaryRowIndices && summary.summaryRowIndices.includes(rIdx);
                  return (
                    <tr
                      key={rIdx}
                      className={`hover:bg-surface-container/30 transition-colors ${
                        isSummary ? 'bg-secondary/10 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 text-center text-outline font-semibold bg-surface-container-low/40">
                        {rIdx + 1}
                      </td>
                      {currentVersion.columns.map((col) => {
                        const val = row[col];
                        const meta = columnMetas.find((m) => m.name === col);
                        const isNull =
                          val === null || val === undefined || String(val).trim() === '';
                        let displayVal = isNull ? '(blank)' : String(val);
                        if (!isNull && typeof val === 'number') {
                          if (meta?.detectedType === 'currency' || /price|revenue|cost|sales|spend|amount/i.test(col)) {
                            displayVal = (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          } else {
                            displayVal = val.toLocaleString();
                          }
                        }
                        return (
                          <td
                            key={col}
                            className={`p-3 truncate max-w-[200px] ${
                              isNull
                                ? 'text-outline/40 italic'
                                : isSummary
                                ? 'text-secondary-fixed'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-outline font-data-mono pt-1">
            <span>
              Showing {Math.min(50, filteredRows.length)} of {filteredRows.length} row(s)
            </span>
            <button
              onClick={() => setIsFullDataOpen(true)}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Open Full Screen Grid →
            </button>
          </div>
        </section>
      </main>

      {/* ======================================================= */}
      {/* MODALS: Full Data Modal & What Changed Modal            */}
      {/* ======================================================= */}
      <FullDataModal
        isOpen={isFullDataOpen}
        onClose={() => setIsFullDataOpen(false)}
        rows={currentVersion.data}
        columns={currentVersion.columns}
        columnMetas={columnMetas}
        title={dataset.fileName}
        versionLabel={currentVersion.label}
        fileName={dataset.fileName}
        originalWorkbookSheets={dataset.originalWorkbookSheets}
        selectedSheetName={dataset.rawInspection?.selectedSheet}
      />

      <WhatChangedModal
        isOpen={isWhatChangedOpen}
        onClose={() => setIsWhatChangedOpen(false)}
        versionLabel={currentVersion.label}
        changeLog={currentVersion.changeLog || []}
        executionLogs={currentVersion.executionLogs || []}
      />
    </div>
  );
};
