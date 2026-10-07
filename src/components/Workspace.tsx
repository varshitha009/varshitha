import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Trash2,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  ChevronRight,
  Database,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { User, UploadedFile, NoticeData, ParsedDataset, DatasetVersion } from '../types';
import { processAndCleanFile, processAndCleanSample } from '../utils/orchestrator';

interface WorkspaceProps {
  user: User | null;
  onBackToHome: () => void;
  onShowNotice: (notice: NoticeData) => void;
  onDatasetParsed: (dataset: ParsedDataset) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  user,
  onBackToHome,
  onShowNotice,
  onDatasetParsed,
}) => {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [projectName, setProjectName] = useState('Quarterly Sales & Customer Retention');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleDatasets: Array<{
    key: string;
    name: string;
    size: string;
    type: 'csv' | 'xlsx';
    description: string;
  }> = [
    {
      key: 'sales_orders_q4',
      name: 'sales_orders_q4.csv',
      size: '4.2 KB',
      type: 'csv',
      description: 'Retail & online sales with month formats (Jan/Jun/JM) and duplicate rows',
    },
    {
      key: 'monthly_customers',
      name: 'monthly_customers.xlsx',
      size: '3.8 KB',
      type: 'xlsx',
      description: 'Customer subscription tiers, spend amounts, and region casings',
    },
    {
      key: 'product_revenue_breakdown',
      name: 'product_revenue_breakdown.csv',
      size: '2.9 KB',
      type: 'csv',
      description: 'Quarterly SKU units, pricing, whitespace, and inventory status',
    },
  ];

  const handleProcessFile = async (file: File) => {
    setIsParsing(true);
    setParsingError(null);
    try {
      const newDataset = await processAndCleanFile(file);
      setIsParsing(false);
      onDatasetParsed(newDataset);
    } catch (err: any) {
      console.error('Error parsing and cleaning file:', err);
      setIsParsing(false);
      setParsingError(
        err?.message ||
          'Failed to parse the file. Please ensure it is a valid Excel (.xlsx, .xls) or CSV file.'
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleLoadSample = async (sampleKey: string) => {
    setIsParsing(true);
    setParsingError(null);
    try {
      const newDataset = await processAndCleanSample(sampleKey);
      setIsParsing(false);
      onDatasetParsed(newDataset);
    } catch (err: any) {
      console.error('Error loading sample dataset:', err);
      setIsParsing(false);
      setParsingError('Failed to parse sample dataset.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md antialiased">
      {/* Workspace Top Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 md:px-margin py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary/50 text-on-surface-variant hover:text-on-surface text-xs font-label-md transition-all group cursor-pointer"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-primary transition-transform group-hover:-translate-x-1" />
            <span>Back to Landing Page</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-outline-variant/30 pl-4">
            <span className="text-xs text-outline font-label-sm uppercase tracking-wider">Project:</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary px-1 text-sm font-semibold text-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* User Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              onShowNotice({
                title: 'Project Settings',
                message: 'Project sharing and collaboration settings will be available in upcoming steps.',
                badge: 'Next Step',
              })
            }
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container-high text-xs text-outline hover:text-primary transition-colors border border-outline-variant/30"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workspace 01</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
            <span className="text-secondary font-medium font-data-mono">
              {user ? user.name : 'Demo Analyst'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-margin py-8 flex flex-col justify-between">
        <div>
          {/* Breadcrumb & Step Tracker */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs text-outline mb-2">
              <button onClick={onBackToHome} className="hover:text-primary transition-colors">
                AI Data Workspace
              </button>
              <span>/</span>
              <span className="text-secondary">New Data Project</span>
              <span>/</span>
              <span className="text-primary font-medium">Upload Data</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
              <div>
                <h1 className="font-headline-lg text-2xl md:text-3xl font-semibold text-on-surface">
                  Start Your Data Project
                </h1>
                <p className="font-body-md text-on-surface-variant mt-1">
                  Upload an Excel or CSV file. The file is immediately parsed and verified for data review and quality inspection.
                </p>
              </div>

              {/* Progress Pipeline Pills */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/40 font-semibold font-data-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  1. Upload
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-outline" />
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-outline border border-outline-variant/30 font-data-mono">
                  2. Review & Clean
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-outline" />
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-outline border border-outline-variant/30 font-data-mono">
                  3. Analyze
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-outline" />
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-outline border border-outline-variant/30 font-data-mono">
                  4. Output
                </div>
              </div>
            </div>
          </div>

          {parsingError && (
            <div className="mb-6 p-4 rounded-xl bg-error/15 border border-error/40 text-error text-xs flex items-center gap-3">
              <span className="font-bold">Error:</span>
              <span>{parsingError}</span>
            </div>
          )}

          {/* UPLOAD DATA SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Primary Dropzone */}
            <div className="lg:col-span-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[340px] ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : isParsing
                    ? 'border-primary/70 bg-surface-container-low animate-pulse'
                    : 'border-outline-variant/60 hover:border-primary/60 bg-surface-container/60'
                }`}
              >
                {isParsing ? (
                  <div className="space-y-4 max-w-sm text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <div>
                      <h3 className="font-headline-md text-lg font-semibold text-on-surface">
                        Parsing Spreadsheet...
                      </h3>
                      <p className="font-body-sm text-outline text-xs mt-1">
                        Extracting real columns, analyzing data types, and checking row integrity.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center mx-auto border border-outline-variant/40 shadow-inner group-hover:scale-105 transition-transform">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>

                    <div>
                      <h3 className="font-headline-md text-xl font-semibold text-on-surface">
                        Upload Your Spreadsheet
                      </h3>
                      <p className="font-body-md text-on-surface-variant mt-1 text-sm">
                        Drag and drop your Excel or CSV file here, or browse files from your computer.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-secondary font-data-mono">
                        .xlsx
                      </span>
                      <span className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-secondary font-data-mono">
                        .csv
                      </span>
                      <span className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-secondary font-data-mono">
                        .xls
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="pt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-shimmer inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold text-sm shadow-[0_0_15px_rgba(233,193,118,0.25)] hover:from-primary-fixed hover:to-primary transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Browse Computer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Sample Files & Project Guide */}
            <div className="space-y-6 text-left">
              {/* Quick Load Samples */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  <h4 className="font-title-md text-sm font-semibold text-on-surface">
                    Try with Real Datasets
                  </h4>
                </div>
                <p className="font-body-sm text-xs text-outline mb-4">
                  Select any actual spreadsheet to inspect its real rows, data types, and quality findings:
                </p>

                <div className="space-y-2">
                  {sampleDatasets.map((sample) => (
                    <button
                      key={sample.key}
                      onClick={() => handleLoadSample(sample.key)}
                      className="w-full text-left p-3 rounded-lg border border-outline-variant/30 bg-surface-container hover:border-primary/50 transition-all flex items-start justify-between group cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                          {sample.type === 'xlsx' ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="font-data-mono text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                            {sample.name}
                          </div>
                          <div className="text-[11px] text-outline leading-tight mt-0.5">
                            {sample.description}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-label-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2 mt-1">
                        Inspect →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Safety & Next Steps */}
              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/30 text-xs space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold font-label-sm uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Quality Inspection Stages</span>
                </div>
                <ul className="space-y-2 text-on-surface-variant font-body-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span>Parse actual rows & detect column data types automatically.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span>AI flags issues (spaces, casing, dates, duplicates, outliers).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span>Keep original data safe while creating versioned clean outputs.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation Bar within Workspace */}
        <div className="pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-xs text-outline gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>AI Data Workspace • Real Excel & CSV Data Review Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                onShowNotice({
                  title: 'Supported File Formats',
                  message:
                    'AI Data Workspace accepts tabular files including Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Data is parsed securely in your workspace.',
                  badge: 'Workspace Guide',
                })
              }
              className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Supported Formats</span>
            </button>
            <button
              onClick={onBackToHome}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Return to Landing Page
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
