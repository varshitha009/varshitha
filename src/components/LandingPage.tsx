import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  PlayCircle,
  Database,
  Brain,
  Download,
  Payments,
  TrendingUp,
  AutoAwesome,
  AddCircle,
  Pause,
  Play,
  Chat,
  SmartToy,
  CheckCircle,
  Cancel,
  UploadFile,
  FactCheck,
  HelpCenter,
  AutoStories,
  Presentation
} from '../components/Icons';
import { NoticeData, User } from '../types';

interface LandingPageProps {
  user: User | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onGetStarted: () => void;
  onShowNotice: (notice: NoticeData) => void;
  onOpenContact: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onOpenSignIn,
  onOpenSignUp,
  onGetStarted,
  onShowNotice,
  onOpenContact,
}) => {
  // 1. Hero Dynamic Capability Loop
  const capabilities = [
    { text: 'Clean Data', icon: 'cleaning_services' },
    { text: 'Dashboards', icon: 'dashboard' },
    { text: 'AI Insights', icon: 'lightbulb' },
    { text: 'Business Reports', icon: 'description' },
    { text: 'Presentation Slides', icon: 'slideshow' },
    { text: 'Simple Analysis', icon: 'query_stats' },
  ];
  const [capabilityIndex, setCapabilityIndex] = useState(4); // Start with Presentation Slides as in Stitch

  useEffect(() => {
    const timer = setInterval(() => {
      setCapabilityIndex((prev) => (prev + 1) % capabilities.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [capabilities.length]);

  // 2. Cinematic Interactive Journey Controller (7 Stages)
  const stageHeadings = [
    '1. Your Data — Upload your Excel or CSV file.',
    '2. Clean Data — AI finds missing values, duplicates and errors.',
    '3. Analyze — Find trends, compare results and see what is changing.',
    '4. AI Insights — AI explains what is happening in your data.',
    '5. Dashboard — See your important numbers and charts in one place.',
    '6. Report — Get a clear report about your data.',
    '7. Presentation — Turn your data into presentation slides.',
  ];

  const stageTips = [
    'Upload your Excel or CSV file to get started.',
    'Let AI inspect and resolve missing values and double entries.',
    'See total sales, orders count, and trends across all quarters.',
    'Review clear explanations of what changed in your numbers.',
    'View clean cards and charts all in one place.',
    'Get a simple report ready to share with your team.',
    'Turn your data directly into presentation slides for meetings.',
  ];

  const [currentStage, setCurrentStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const journeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % 7);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Chart tooltip state
  const [chartTooltip, setChartTooltip] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const jumpToJourneyStage = (stageIdx: number) => {
    setCurrentStage(stageIdx);
    setIsPlaying(false);
    scrollToSection('features');
  };

  return (
    <div className="w-full bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* NAVIGATION HEADER */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_16px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="h-20 max-w-7xl mx-auto px-4 md:px-margin flex items-center justify-between gap-space-md">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 shrink-0 group cursor-pointer"
          >
            <div className="h-10 w-10 shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <img
                alt="AI Data Workspace"
                className="w-8 h-8 rounded-md object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1Xz-46ccNuFutz5CyIlkIh5zv4YKpnFZofbNMGplskyWjV5sdYdUtJ8DkUDFXflG6Hesnnqno5M1UKpbuwa05QG-FNb2K1jXLog71Q7L6NhrvCSDTcydir_LaGT3VWIDo19BpHN_i1WBD67IcmkGILlFUDSuGkgK5GJ5fX5rZ_oGZmItUJwUTqzmcwsuAVCxS9LGDR2WvWUB2vu6jjnsl5vpvFGLwliLMXFOH63eJ9M3DXUexh0pAuqNIU"
                onError={(e) => {
                  // Fallback if image blocked
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="hidden w-8 h-8 rounded-md bg-gradient-to-tr from-primary to-primary-fixed items-center justify-center text-on-primary font-bold text-sm">
                AI
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface group-hover:text-primary transition-colors">
                AI Data Workspace
              </span>
              <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary">
                SIMPLE DATA TOOLS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-space-lg">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="nav-link-item nav-link-active transition-colors duration-200 text-primary font-bold font-label-md text-label-md py-1"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="nav-link-item font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 py-1"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="nav-link-item font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 py-1"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('overview')}
              className="nav-link-item font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 py-1"
            >
              Overview
            </button>
          </nav>

          <div className="flex items-center gap-space-md shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onGetStarted}
                  className="font-label-md text-label-md text-secondary hover:text-primary transition-colors hidden sm:inline"
                >
                  Workspace
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-shimmer font-label-md text-label-md bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold px-space-md py-space-sm rounded-lg border border-primary-fixed shadow-[0_0_15px_rgba(233,193,118,0.25)] hover:shadow-[0_0_24px_rgba(233,193,118,0.45)] hover:from-primary-fixed hover:to-primary hover:text-on-primary-fixed transition-all"
                >
                  Open Workspace
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenSignIn}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors px-space-sm py-space-xs cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-shimmer font-label-md text-label-md bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold px-space-md py-space-sm rounded-lg border border-primary-fixed shadow-[0_0_15px_rgba(233,193,118,0.25)] hover:shadow-[0_0_24px_rgba(233,193,118,0.45)] hover:from-primary-fixed hover:to-primary hover:text-on-primary-fixed transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-background min-h-screen">
        <div className="flex flex-col w-full">
          {/* Ambient Glow Canvas Elements */}
          <div className="relative w-full overflow-hidden">
            <div className="ambient-glow-mesh absolute top-8 left-1/2 -translate-x-1/2 w-[840px] h-[400px] bg-primary/15 rounded-full blur-[140px] pointer-events-none -z-10"></div>
            <div
              className="absolute top-[46rem] right-10 w-[460px] h-[460px] bg-primary-container/10 rounded-full blur-[170px] pointer-events-none -z-10 animate-pulse"
              style={{ animationDuration: '8s' }}
            ></div>

            {/* HERO SECTION */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin pt-14 pb-space-xl text-center flex flex-col items-center">
              {/* Overline Pill */}
              <div className="animate-entrance-1 inline-flex items-center gap-space-sm px-space-md py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 shadow-sm mb-space-lg hover:border-primary/50 transition-colors">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                  Simple Data Workspace
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="animate-entrance-2 font-display-lg text-4xl sm:text-5xl md:text-display-lg max-w-4xl text-on-surface tracking-tight mb-space-md">
                Turn Your Data{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-fixed-dim to-secondary">
                  Into Decisions.
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="animate-entrance-3 font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-center mb-space-xl">
                Upload your data, tell AI what you need, and turn it into dashboards, insights, reports, and presentations.
              </p>

              {/* Action Buttons */}
              <div className="animate-entrance-4 flex flex-wrap items-center justify-center gap-space-md mb-space-xl">
                <button
                  onClick={onGetStarted}
                  className="btn-shimmer inline-flex items-center gap-2 font-label-md text-label-md bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-semibold px-space-xl py-space-sm rounded-lg shadow-xl shadow-primary/20 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group"
                >
                  <span>Get Started</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="inline-flex items-center gap-2 font-label-md text-label-md bg-surface-container-high text-on-surface px-space-lg py-space-sm rounded-lg hover:bg-surface-container-highest hover:-translate-y-0.5 transition-all shadow-md cursor-pointer border border-outline-variant/30 hover:border-outline-variant"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">play_circle</span>
                  <span>See How It Works</span>
                </button>
              </div>

              {/* FLOATING HERO CAPABILITY ANIMATION (Your Data -> AI -> Useful Results) */}
              <div className="w-full max-w-4xl p-space-md md:p-space-lg rounded-xl bg-surface-container-low/95 border border-outline-variant/50 shadow-2xl hero-float-card relative hover:border-primary/40 transition-colors">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-surface-container-high border border-primary/40 text-[11px] font-label-sm text-primary uppercase tracking-widest shadow-md">
                  How Data Moves
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-space-md pt-space-xs">
                  {/* Step 1: Your Data */}
                  <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container border border-outline-variant/40 min-w-[170px] w-full md:w-auto hover:border-primary/30 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[22px]">database</span>
                    </div>
                    <div className="text-left">
                      <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Step 1</div>
                      <div className="font-title-md text-title-md text-on-surface font-semibold">Your Data</div>
                    </div>
                  </div>

                  {/* Stream connector 1 */}
                  <div className="hidden md:flex items-center flex-1 px-space-sm">
                    <div className="h-[2px] w-full bg-surface-container-highest relative overflow-hidden rounded-full">
                      <div className="absolute inset-0 bg-primary/80 w-1/3 slide-line-anim"></div>
                    </div>
                    <span className="material-symbols-outlined text-primary/70 text-[18px] -ml-2">chevron_right</span>
                  </div>

                  {/* Step 2: AI Workspace */}
                  <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container-high border border-primary/30 shadow-inner min-w-[170px] w-full md:w-auto relative group">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[22px] animate-pulse">psychology</span>
                    </div>
                    <div className="text-left">
                      <div className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Step 2</div>
                      <div className="font-title-md text-title-md text-on-surface font-semibold">AI Workspace</div>
                    </div>
                  </div>

                  {/* Stream connector 2 */}
                  <div className="hidden md:flex items-center flex-1 px-space-sm">
                    <div className="h-[2px] w-full bg-surface-container-highest relative overflow-hidden rounded-full">
                      <div className="absolute inset-0 bg-primary/80 w-1/3 slide-line-anim" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="material-symbols-outlined text-primary/70 text-[18px] -ml-2">chevron_right</span>
                  </div>

                  {/* Dynamic Cycling Capability Output */}
                  <div
                    onClick={onGetStarted}
                    className="flex items-center gap-space-sm px-space-lg py-space-sm rounded-lg bg-primary/10 border border-primary/60 transition-all duration-500 min-w-[240px] w-full md:w-auto shadow-[0_0_18px_rgba(233,193,118,0.15)] cursor-pointer hover:bg-primary/20"
                    title="Click to start in workspace"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[22px] transition-all duration-300">
                        {capabilities[capabilityIndex].icon}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="font-label-sm text-label-sm text-primary uppercase tracking-wider">Useful Result</div>
                      <div className="font-title-md text-title-md text-primary-fixed transition-all duration-300 font-semibold">
                        {capabilities[capabilityIndex].text}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline status footnote */}
                <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-outline font-body-sm text-[12px] gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Easy path: Raw Data → AI → Useful Results
                  </span>
                  <span className="text-on-surface-variant font-label-sm tracking-wide">Excel • CSV Files</span>
                </div>
              </div>
            </section>

            {/* GENERAL BUSINESS ANALYTICS DASHBOARD PREVIEW */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin mb-space-xl" id="overview">
              <div className="rounded-xl bg-surface-container border border-outline-variant/40 shadow-2xl p-space-md md:p-space-lg transition-all">
                {/* Dashboard Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-md mb-space-lg border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-title-md text-title-md text-on-surface font-semibold">
                          Business Performance Dashboard
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-highest text-secondary font-label-sm text-[11px] tracking-wide border border-outline-variant/30">
                          Live View
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-outline mt-0.5">
                        Sales, Customers, Orders, and Revenue Performance
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm text-body-sm">
                    <span className="font-data-mono text-outline px-space-sm py-1 bg-surface-container-low rounded border border-outline-variant/30">
                      This Quarter
                    </span>
                    <button
                      onClick={() =>
                        onShowNotice({
                          title: 'Download Dashboard',
                          message:
                            'Exporting dashboards to PDF, CSV, and formatted Excel sheets will be available in the next step.',
                          badge: 'Coming Next',
                        })
                      }
                      className="flex items-center gap-1 px-space-sm py-1 bg-surface-container-high rounded text-on-surface hover:text-primary hover:border-primary/40 transition-colors text-label-md font-label-md border border-outline-variant/30 active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* 4 Specific Metrics KPI Cards with Hover Lift */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg text-left">
                  {/* Metric 1: Total Sales */}
                  <div className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_8px_20px_rgba(233,193,118,0.12)]">
                    <div className="flex items-center justify-between text-outline mb-1">
                      <span className="font-label-sm text-label-sm uppercase">Total Sales</span>
                      <span className="material-symbols-outlined text-[18px] text-primary transition-transform group-hover:scale-110">
                        payments
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm">
                      <span className="font-headline-lg text-headline-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                        $128,450
                      </span>
                      <span className="font-data-mono text-body-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        +14%
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[14px]">trending_up</span>
                      <span>+14% compared to last month</span>
                    </div>
                  </div>

                  {/* Metric 2: Customers */}
                  <div className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_8px_20px_rgba(233,193,118,0.12)]">
                    <div className="flex items-center justify-between text-outline mb-1">
                      <span className="font-label-sm text-label-sm uppercase">Customers</span>
                      <span className="material-symbols-outlined text-[18px] text-secondary transition-transform group-hover:scale-110">
                        group
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm">
                      <span className="font-headline-lg text-headline-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                        2,840
                      </span>
                      <span className="font-data-mono text-body-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        +8.6%
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                      Consistent repeat buyers
                    </div>
                  </div>

                  {/* Metric 3: Avg. Order Value */}
                  <div className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_8px_20px_rgba(233,193,118,0.12)]">
                    <div className="flex items-center justify-between text-outline mb-1">
                      <span className="font-label-sm text-label-sm uppercase">Average Order Value</span>
                      <span className="material-symbols-outlined text-[18px] text-primary transition-transform group-hover:scale-110">
                        shopping_bag
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm">
                      <span className="font-headline-lg text-headline-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                        $452
                      </span>
                      <span className="font-data-mono text-body-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        +5.1%
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                      Orders are getting slightly larger
                    </div>
                  </div>

                  {/* Metric 4: Customers Who Stayed */}
                  <div className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_8px_20px_rgba(233,193,118,0.12)]">
                    <div className="flex items-center justify-between text-outline mb-1">
                      <span className="font-label-sm text-label-sm uppercase">Customers Who Stayed</span>
                      <span className="material-symbols-outlined text-[18px] text-secondary transition-transform group-hover:scale-110">
                        loyalty
                      </span>
                    </div>
                    <div className="flex items-baseline gap-space-sm">
                      <span className="font-headline-lg text-headline-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                        94.2%
                      </span>
                      <span className="font-data-mono text-body-sm text-secondary bg-surface-container-highest px-1.5 py-0.5 rounded">
                        Steady
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                      Most customers keep buying
                    </div>
                  </div>
                </div>

                {/* Chart & Performance Breakdown Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg mb-space-md">
                  {/* Primary Chart: Sales by Month & Quarter */}
                  <div className="lg:col-span-2 p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-between relative text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-space-sm">
                      <div>
                        <span className="font-title-md text-title-md text-on-surface font-semibold">
                          Sales by Month & Quarter
                        </span>
                        <p className="font-body-sm text-body-sm text-outline">
                          Compare quarterly sales across Q1 to Q4 (Hover over bars to see numbers)
                        </p>
                      </div>
                      <div className="flex items-center gap-space-sm text-body-sm text-outline">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-primary shadow-sm shadow-primary/30"></span> Total Sales
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-secondary-container"></span> Target
                        </span>
                      </div>
                    </div>

                    {/* Live Dynamic Tooltip Bar */}
                    <div
                      className={`text-xs font-data-mono text-primary bg-surface-container px-2 py-1 rounded border border-outline-variant/30 w-fit mb-1 transition-opacity duration-200 ${
                        chartTooltip ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {chartTooltip || 'Hover over a bar to see numbers'}
                    </div>

                    {/* Clean Bar & Line SVG Chart */}
                    <div className="w-full h-60 mt-space-sm relative">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 560 190">
                        <line className="text-on-surface" stroke="currentColor" strokeOpacity="0.06" x1="0" x2="560" y1="40" y2="40"></line>
                        <line className="text-on-surface" stroke="currentColor" strokeOpacity="0.06" x1="0" x2="560" y1="90" y2="90"></line>
                        <line className="text-on-surface" stroke="currentColor" strokeOpacity="0.06" x1="0" x2="560" y1="140" y2="140"></line>

                        {/* Q1 */}
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q1 Target: $50,000')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#534832"
                          fillOpacity="0.5"
                          height="50"
                          rx="3"
                          width="36"
                          x="50"
                          y="110"
                        ></rect>
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q1 Actual Sales: $72,400 (+11%)')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#e9c176"
                          fillOpacity="0.85"
                          height="70"
                          rx="3"
                          width="36"
                          x="94"
                          y="90"
                        ></rect>

                        {/* Q2 */}
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q2 Target: $65,000')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#534832"
                          fillOpacity="0.5"
                          height="65"
                          rx="3"
                          width="36"
                          x="180"
                          y="95"
                        ></rect>
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q2 Actual Sales: $92,800 (+15%)')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#e9c176"
                          fillOpacity="0.85"
                          height="90"
                          rx="3"
                          width="36"
                          x="224"
                          y="70"
                        ></rect>

                        {/* Q3 */}
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q3 Target: $80,000')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#534832"
                          fillOpacity="0.5"
                          height="80"
                          rx="3"
                          width="36"
                          x="310"
                          y="80"
                        ></rect>
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q3 Actual Sales: $114,200 (+19%)')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#e9c176"
                          fillOpacity="0.85"
                          height="110"
                          rx="3"
                          width="36"
                          x="354"
                          y="50"
                        ></rect>

                        {/* Q4 */}
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q4 Target: $95,000')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#534832"
                          fillOpacity="0.5"
                          height="95"
                          rx="3"
                          width="36"
                          x="440"
                          y="65"
                        ></rect>
                        <rect
                          className="chart-bar"
                          onMouseEnter={() => setChartTooltip('Q4 Actual Sales: $128,450 (+22%)')}
                          onMouseLeave={() => setChartTooltip(null)}
                          fill="#e9c176"
                          fillOpacity="0.95"
                          height="130"
                          rx="3"
                          width="36"
                          x="484"
                          y="30"
                        ></rect>

                        {/* Trend line */}
                        <path
                          d="M112 90 L242 70 L372 50 L502 30"
                          fill="none"
                          filter="drop-shadow(0 0 6px rgba(255,222,165,0.4))"
                          stroke="#ffdea5"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        ></path>
                        <circle cx="112" cy="90" fill="#ffdea5" r="3.5" className="transition-transform hover:scale-150 cursor-pointer"></circle>
                        <circle cx="242" cy="70" fill="#ffdea5" r="3.5" className="transition-transform hover:scale-150 cursor-pointer"></circle>
                        <circle cx="372" cy="50" fill="#ffdea5" r="3.5" className="transition-transform hover:scale-150 cursor-pointer"></circle>
                        <circle cx="502" cy="30" fill="#ffdea5" r="4.5" className="transition-transform hover:scale-150 cursor-pointer animate-pulse"></circle>
                      </svg>
                    </div>
                    <div className="flex items-center justify-around pt-space-xs text-outline font-data-mono text-body-sm">
                      <span className="hover:text-primary transition-colors cursor-default">Q1 (Jan–Mar)</span>
                      <span className="hover:text-primary transition-colors cursor-default">Q2 (Apr–Jun)</span>
                      <span className="hover:text-primary transition-colors cursor-default">Q3 (Jul–Sep)</span>
                      <span className="hover:text-primary transition-colors cursor-default font-semibold text-primary">
                        Q4 (Oct–Dec)
                      </span>
                    </div>
                  </div>

                  {/* Category Revenue Distribution */}
                  <div className="p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
                    <div>
                      <span className="font-title-md text-title-md text-on-surface font-semibold">Sales by Product</span>
                      <p className="font-body-sm text-body-sm text-outline mb-space-md">Sales breakdown across what you sell</p>
                      <div className="space-y-space-md">
                        <div className="group cursor-default">
                          <div className="flex justify-between font-label-md text-label-md mb-1">
                            <span className="text-on-surface group-hover:text-primary transition-colors">Main Product</span>
                            <span className="font-data-mono text-primary">$68,200 (53%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: '53%' }}></div>
                          </div>
                        </div>
                        <div className="group cursor-default">
                          <div className="flex justify-between font-label-md text-label-md mb-1">
                            <span className="text-on-surface group-hover:text-secondary transition-colors">Add-on Services</span>
                            <span className="font-data-mono text-secondary">$39,800 (31%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full transition-all duration-700 ease-out" style={{ width: '31%' }}></div>
                          </div>
                        </div>
                        <div className="group cursor-default">
                          <div className="flex justify-between font-label-md text-label-md mb-1">
                            <span className="text-on-surface group-hover:text-outline transition-colors">Support Plans</span>
                            <span className="font-data-mono text-outline">$20,450 (16%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-surface-bright rounded-full transition-all duration-700 ease-out" style={{ width: '16%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-space-sm rounded bg-surface-container-high border border-outline-variant/30 text-body-sm text-on-surface-variant flex items-center gap-space-sm mt-space-md hover:border-primary/40 transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-primary">insights</span>
                      <span>Add-on services had the biggest sales increase this quarter.</span>
                    </div>
                  </div>
                </div>

                {/* AI Quick Insight Banner with Breathing Glow */}
                <div className="p-space-md rounded-lg bg-surface-container-lowest border border-primary/40 shadow-lg glow-insight-box">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md text-left">
                    <div className="flex items-start gap-space-md">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                        <span className="material-symbols-outlined text-[24px] animate-spin" style={{ animationDuration: '12s' }}>
                          auto_awesome
                        </span>
                      </div>
                      <div>
                        <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                          <span>QUICK NOTE</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface mt-0.5">
                          Sales went up <strong className="text-primary-fixed">14.2%</strong> this month, mainly because existing customers ordered more.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-sm shrink-0">
                      <button
                        onClick={() =>
                          onShowNotice({
                            title: 'Report Builder',
                            message: 'Adding custom annotations and charts to the executive report will be available in the next step.',
                            badge: 'Coming Next',
                          })
                        }
                        className="btn-shimmer px-space-md py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-fixed hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(233,193,118,0.2)] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Add to Report</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CINEMATIC INTERACTIVE "AI DATA JOURNEY" (7 Stages) */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin py-space-xl" id="features">
              <div className="text-center max-w-3xl mx-auto mb-space-lg">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">See How It Works</span>
                <h2 className="font-headline-xl text-3xl sm:text-headline-xl text-on-surface mt-space-xs mb-space-sm">
                  The AI Data Journey
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  From an Excel file to simple dashboards, insights, reports, and presentation slides. Click any step to see what happens.
                </p>
              </div>

              {/* 7-Stage Journey Container */}
              <div
                ref={journeyRef}
                className="rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xl p-space-md md:p-space-lg relative overflow-hidden"
              >
                {/* Top Stage Timeline Navigation */}
                <div className="relative mb-space-lg pb-space-xs">
                  {/* Subtle connecting line behind stage buttons */}
                  <div className="hidden lg:block absolute top-1/2 left-6 right-6 h-[2px] bg-surface-container-highest -translate-y-1/2 -z-0">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-primary-fixed to-secondary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(233,193,118,0.5)]"
                      style={{ width: `${Math.round(((currentStage + 1) / 7) * 100)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 relative z-10">
                    {[
                      { idx: 0, title: '1. Your Data', sub: 'Upload File', icon: 'table_view' },
                      { idx: 1, title: '2. Clean Data', sub: 'Fix Errors', icon: 'cleaning_services' },
                      { idx: 2, title: '3. Analyze', sub: 'Trends & Sales', icon: 'query_stats' },
                      { idx: 3, title: '4. AI Insights', sub: 'Simple Explanations', icon: 'auto_awesome' },
                      { idx: 4, title: '5. Dashboard', sub: 'All in One Place', icon: 'dashboard' },
                      { idx: 5, title: '6. Report', sub: 'Clear Summary', icon: 'description' },
                      { idx: 6, title: '7. Presentation', sub: 'Simple Slides', icon: 'slideshow' },
                    ].map((stg) => {
                      const isActive = currentStage === stg.idx;
                      return (
                        <button
                          key={stg.idx}
                          type="button"
                          onClick={() => {
                            setCurrentStage(stg.idx);
                            setIsPlaying(false);
                          }}
                          className={`stage-nav-btn flex flex-col items-center text-center p-space-xs md:p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                            isActive
                              ? 'active bg-surface-container-high border-2 border-primary text-primary shadow-[0_0_15px_rgba(233,193,118,0.2)] scale-[1.02]'
                              : 'bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-outline hover:scale-[1.01]'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-[18px] ${
                              isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-outline'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">{stg.icon}</span>
                          </div>
                          <span className="font-label-sm text-[12px] font-semibold text-on-surface">{stg.title}</span>
                          <span className={`text-[10px] hidden sm:inline ${isActive ? 'text-primary/80' : 'text-outline'}`}>
                            {stg.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Stage Interactive Stage Display Viewport */}
                <div className="min-h-[420px] rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-space-md md:p-space-lg flex flex-col justify-between relative shadow-inner">
                  {/* Stage Notification / Context Header */}
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-outline-variant/20 mb-space-md">
                    <div className="flex items-center gap-space-sm text-left">
                      <span className="px-2 py-0.5 rounded text-[11px] font-label-sm uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
                        Step {currentStage + 1} of 7
                      </span>
                      <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                        {stageHeadings[currentStage]}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-outline flex items-center gap-1.5 font-body-sm">
                        <span className={`w-2 h-2 rounded-full bg-primary ${isPlaying ? 'animate-pulse' : ''}`}></span>
                        <span>{isPlaying ? 'Playing walkthrough' : 'Paused'}</span>
                      </span>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="px-2.5 py-1 rounded bg-surface-container-high text-xs text-on-surface border border-outline-variant/30 hover:text-primary transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Stage Dynamic Pane Content */}
                  <div className="flex-1 flex flex-col justify-center transition-opacity duration-300">
                    {/* Stage 0: Your Data View */}
                    {currentStage === 0 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">upload_file</span>
                            Upload Your File
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            Upload your Excel or CSV file.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Just drop in your sales, customer, or order file. You do not need to do any technical setup.
                          </p>
                          <div className="p-space-sm rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-outline space-y-1">
                            <div className="text-on-surface font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span> monthly_sales.xlsx
                            </div>
                            <div>5,420 rows loaded • Ready to view</div>
                            <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1.5">
                              <div className="bg-primary h-full rounded-full w-full transition-all duration-1000"></div>
                            </div>
                          </div>
                        </div>

                        {/* Miniature Excel / CSV dataset grid */}
                        <div className="w-full lg:w-2/3 rounded-xl border border-primary/30 bg-surface-container-low p-space-md shadow-xl relative overflow-hidden group">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/30">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded bg-primary/20 text-primary flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">description</span>
                              </div>
                              <span className="font-data-mono text-xs font-semibold text-on-surface">sales_orders_q4.csv</span>
                              <span className="text-[10px] text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded font-data-mono">
                                Excel Sheet
                              </span>
                            </div>
                            <div className="text-[11px] font-label-sm text-primary flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                              Raw Data → AI Workspace
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-lowest/80">
                            <table className="w-full text-left font-data-mono text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-outline-variant/40 bg-surface-container/60 text-primary">
                                  <th className="p-2 font-semibold">Orders #</th>
                                  <th className="p-2 font-semibold">Date</th>
                                  <th className="p-2 font-semibold">Customers</th>
                                  <th className="p-2 text-right font-semibold">Sales</th>
                                  <th className="p-2 text-center font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody className="text-on-surface divide-y divide-outline-variant/20">
                                <tr className="hover:bg-surface-container/60 transition-colors">
                                  <td className="p-2 text-secondary">#ORD-1041</td>
                                  <td className="p-2 text-outline">2026-03-01</td>
                                  <td className="p-2 text-on-surface font-medium">Acme Corp</td>
                                  <td className="p-2 text-right font-semibold text-primary">$42,800</td>
                                  <td className="p-2 text-center">
                                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] text-secondary">
                                      Ready
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-surface-container/60 transition-colors">
                                  <td className="p-2 text-secondary">#ORD-1042</td>
                                  <td className="p-2 text-outline">2026-03-02</td>
                                  <td className="p-2 text-on-surface font-medium">Baker LLC</td>
                                  <td className="p-2 text-right font-semibold text-primary">$31,450</td>
                                  <td className="p-2 text-center">
                                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] text-secondary">
                                      Ready
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-surface-container/60 transition-colors bg-primary/5">
                                  <td className="p-2 text-primary font-medium">#ORD-1043</td>
                                  <td className="p-2 text-outline">2026-03-03</td>
                                  <td className="p-2 text-on-surface font-medium">City Shop</td>
                                  <td className="p-2 text-right font-semibold text-primary">$18,200</td>
                                  <td className="p-2 text-center">
                                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-fixed text-[10px]">
                                      Loaded
                                    </span>
                                  </td>
                                </tr>
                                <tr className="hover:bg-surface-container/60 transition-colors">
                                  <td className="p-2 text-secondary">#ORD-1044</td>
                                  <td className="p-2 text-outline">2026-03-04</td>
                                  <td className="p-2 text-on-surface font-medium">Delta Store</td>
                                  <td className="p-2 text-right font-semibold text-primary">$36,000</td>
                                  <td className="p-2 text-center">
                                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] text-secondary">
                                      Ready
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 1: Clean Data View */}
                    {currentStage === 1 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">cleaning_services</span>
                            Automatic Fixes
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            AI finds missing values, duplicates and errors.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Messy cells, double entries, and blank spots are found and fixed automatically so your numbers are accurate.
                          </p>
                          <div className="p-space-sm rounded-lg bg-surface-container border border-outline-variant/30 text-xs space-y-1">
                            <div className="text-primary font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">verified</span> What AI Fixed
                            </div>
                            <div className="text-on-surface-variant flex items-center gap-1">
                              <span className="text-primary">✓</span> Removed 14 duplicate rows
                            </div>
                            <div className="text-on-surface-variant flex items-center gap-1">
                              <span className="text-primary">✓</span> Fixed 8 empty cells
                            </div>
                            <div className="text-on-surface-variant flex items-center gap-1">
                              <span className="text-primary">✓</span> Formatted dates consistently
                            </div>
                          </div>
                        </div>

                        <div className="w-full lg:w-2/3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-space-md shadow-xl space-y-3 text-left">
                          <div className="text-xs font-label-sm text-outline flex items-center justify-between pb-1 border-b border-outline-variant/20">
                            <span className="text-secondary font-medium tracking-wide">MESSY DATA → CLEAN DATA</span>
                            <span className="text-primary font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] animate-spin" style={{ animationDuration: '8s' }}>
                                auto_fix_high
                              </span>
                              100% Cleaned
                            </span>
                          </div>
                          <div className="space-y-2 font-data-mono text-xs">
                            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-error/40 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-error/20 text-error text-[10px] font-bold">MESSY</span>
                                <span className="line-through text-outline">2026/03/01 , Acme Corp , [empty cell] , $42800</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-error/15 text-error text-[10px] font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">warning</span> Missing Orders
                              </span>
                            </div>

                            <div className="flex items-center justify-center gap-2 py-0.5 text-primary text-[11px] font-label-sm">
                              <span className="h-[1px] w-12 bg-primary/40"></span>
                              <span className="flex items-center gap-1 text-primary-fixed">
                                <span className="material-symbols-outlined text-[14px]">sparkles</span> AI Auto-Correction Applied
                              </span>
                              <span className="h-[1px] w-12 bg-primary/40"></span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-surface-container border border-primary/50 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-fixed text-[10px] font-bold">CLEAN</span>
                                <span className="text-on-surface font-medium">2026-03-01 | Acme Corp | Orders: 14 | Sales: $42,800</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-fixed text-[10px] font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span> Fixed
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-surface-container border border-primary/50 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-fixed text-[10px] font-bold">CLEAN</span>
                                <span className="text-on-surface font-medium">2026-03-02 | Baker LLC | Orders: 28 | Sales: $31,450</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-fixed text-[10px] font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span> Aligned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 2: Analyze Data View */}
                    {currentStage === 2 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">query_stats</span>
                            Simple Numbers
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            Find trends, compare results and see what is changing.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            See total sales, how many orders came in, and how your business grew from quarter to quarter.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="px-2 py-1 rounded bg-surface-container text-xs text-secondary border border-outline-variant/30">
                              Sales Growth
                            </span>
                            <span className="px-2 py-1 rounded bg-surface-container text-xs text-secondary border border-outline-variant/30">
                              Total Orders
                            </span>
                          </div>
                        </div>

                        <div className="w-full lg:w-2/3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-space-md shadow-xl space-y-space-sm text-left">
                          <div className="flex items-center justify-between text-xs text-outline pb-1 border-b border-outline-variant/20">
                            <span className="font-label-sm text-primary uppercase tracking-wide">Numbers → Charts → Results</span>
                            <span className="font-data-mono text-[11px] text-secondary">Q1 - Q4 Analysis</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-colors">
                              <div className="text-[10px] text-outline uppercase">TOTAL SALES</div>
                              <div className="text-title-md font-semibold text-primary font-data-mono">$128,450</div>
                              <div className="text-[10px] text-primary/80">+14% growth</div>
                            </div>
                            <div className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-colors">
                              <div className="text-[10px] text-outline uppercase">ORDERS</div>
                              <div className="text-title-md font-semibold text-on-surface font-data-mono">2,840</div>
                              <div className="text-[10px] text-outline">Across 4 quarters</div>
                            </div>
                            <div className="p-2 rounded bg-surface-container border border-outline-variant/30 hover:border-primary/40 transition-colors">
                              <div className="text-[10px] text-outline uppercase">AVERAGE ORDER</div>
                              <div className="text-title-md font-semibold text-secondary font-data-mono">$452</div>
                              <div className="text-[10px] text-secondary/80">+5.1% avg</div>
                            </div>
                          </div>
                          <div className="h-32 rounded bg-surface-container-lowest p-2 border border-outline-variant/20 relative flex flex-col justify-end">
                            <svg className="w-full h-24" preserveAspectRatio="none" viewBox="0 0 400 90">
                              <line stroke="currentColor" strokeOpacity="0.08" x1="0" x2="400" y1="20" y2="20"></line>
                              <line stroke="currentColor" strokeOpacity="0.08" x1="0" x2="400" y1="50" y2="50"></line>
                              <line stroke="currentColor" strokeOpacity="0.08" x1="0" x2="400" y1="80" y2="80"></line>
                              <rect fill="#534832" height="35" opacity="0.8" rx="3" width="30" x="35" y="45"></rect>
                              <rect fill="#c5a059" height="48" opacity="0.75" rx="3" width="30" x="135" y="32"></rect>
                              <rect fill="#e9c176" height="60" opacity="0.85" rx="3" width="30" x="235" y="20"></rect>
                              <rect fill="#ffdea5" height="70" opacity="0.95" rx="3" width="30" x="335" y="10"></rect>
                              <path d="M50 42 L150 30 L250 18 L350 8" fill="none" stroke="#e9c176" strokeLinecap="round" strokeWidth="2"></path>
                              <circle cx="50" cy="42" fill="#f2e0c3" r="3.5" stroke="#e9c176" strokeWidth="1.5"></circle>
                              <circle cx="150" cy="30" fill="#f2e0c3" r="3.5" stroke="#e9c176" strokeWidth="1.5"></circle>
                              <circle cx="250" cy="18" fill="#f2e0c3" r="3.5" stroke="#e9c176" strokeWidth="1.5"></circle>
                              <circle className="animate-pulse" cx="350" cy="8" fill="#ffffff" r="4.5" stroke="#e9c176" strokeWidth="2"></circle>
                            </svg>
                            <div className="flex justify-around text-[10px] font-data-mono text-outline pt-1">
                              <span>Q1 ($72k)</span>
                              <span>Q2 ($92k)</span>
                              <span>Q3 ($114k)</span>
                              <span className="text-primary font-bold">Q4 ($128k)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 3: AI Insights View */}
                    {currentStage === 3 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
                            Simple Explanations
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            AI explains what is happening in your data.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Get clear sentences that tell you what went up, what went down, and what you should pay attention to.
                          </p>
                        </div>
                        <div className="w-full lg:w-2/3 space-y-3 text-left">
                          <div
                            className="p-space-md rounded-xl bg-surface-container border-2 border-primary/60 shadow-[0_0_24px_rgba(233,193,118,0.18)] relative overflow-hidden group hover:border-primary transition-all animate-pulse"
                            style={{ animationDuration: '4s' }}
                          >
                            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/15 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase font-label-sm">
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                <span>Key AI Findings</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-fixed text-[10px] font-data-mono font-medium">
                                Confidence: 99.4%
                              </span>
                            </div>
                            <p className="text-body-md text-on-surface font-medium leading-relaxed mb-3">
                              “<span className="text-primary-fixed font-semibold">Sales increased this month</span>. Product A had the highest sales, bringing in more than half of all quarterly revenue. Existing customers placed larger repeat orders.”
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30 text-xs">
                              <div className="flex items-center gap-1.5 text-secondary">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span>Product A: 53% revenue</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-secondary">
                                <span className="w-2 h-2 rounded-full bg-primary"></span>
                                <span>Average order: +5.1%</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-secondary text-[16px]">trending_up</span>
                              Product A had the highest sales and continues to be your top seller.
                            </span>
                            <span className="text-primary font-data-mono font-medium">Verified Note</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 4: Dashboard View */}
                    {currentStage === 4 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">dashboard</span>
                            Easy Visuals
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            See your important numbers and charts in one place.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Clear cards and clean charts let you check total sales, order volume, and top products at a glance.
                          </p>
                        </div>
                        <div className="w-full lg:w-2/3 p-space-sm rounded-xl bg-surface-container border border-outline-variant/40 shadow-xl space-y-2 text-left">
                          <div className="flex items-center justify-between px-2 py-1 text-xs text-outline border-b border-outline-variant/20">
                            <span className="font-label-sm text-on-surface font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary"></span> Live Dashboard Preview
                            </span>
                            <span className="text-[10px] text-primary font-data-mono">All-in-One</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-all">
                              <div className="text-[10px] text-outline uppercase font-label-sm">Total Sales</div>
                              <div className="text-title-lg font-bold text-on-surface font-data-mono">$128k</div>
                              <div className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">trending_up</span> +14% vs last month
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-all">
                              <div className="text-[10px] text-outline uppercase font-label-sm">Orders</div>
                              <div className="text-title-lg font-bold text-on-surface font-data-mono">2,840</div>
                              <div className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">group</span> +8.6% new orders
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-all">
                              <div className="text-[10px] text-outline uppercase font-label-sm">Best Product</div>
                              <div className="text-body-md font-bold text-secondary font-data-mono">Product A</div>
                              <div className="text-[11px] text-outline">$68k • 53% revenue</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-all flex flex-col justify-between">
                              <div className="text-[10px] text-outline uppercase font-label-sm">Trend Sparkline</div>
                              <svg className="w-full h-7 my-1" preserveAspectRatio="none" viewBox="0 0 100 24">
                                <path d="M0 20 L25 17 L50 14 L75 8 L100 4" fill="none" stroke="#e9c176" strokeLinecap="round" strokeWidth="2.5"></path>
                                <circle className="animate-ping" cx="100" cy="4" fill="#ffdea5" r="3"></circle>
                              </svg>
                              <div className="text-[10px] text-primary font-semibold">Q1 to Q4 steady climb</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 5: Report View */}
                    {currentStage === 5 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                            Simple Summary
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            Get a clear report about your data.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            A clean, ready-to-share summary of what happened, what changed, and what to do next.
                          </p>
                        </div>
                        <div className="w-full lg:w-2/3 p-space-md rounded-xl bg-surface-container border border-primary/40 shadow-xl text-left font-body-sm space-y-2 hover:border-primary/60 transition-colors">
                          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                              <div>
                                <span className="font-bold text-on-surface text-sm">Monthly Performance Memo</span>
                                <span className="text-[10px] text-outline block">Auto-generated Executive Report</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary border border-primary/20 text-[11px] font-data-mono">
                              PDF / Ready
                            </span>
                          </div>
                          <div className="text-xs text-on-surface-variant space-y-2 pt-1">
                            <div className="p-2 rounded bg-surface-container-lowest/80 border-l-2 border-primary space-y-0.5">
                              <div className="font-semibold text-primary text-[11px] uppercase tracking-wide">Main Finding</div>
                              <p className="text-on-surface">Total sales grew by 14% this month, led by repeat orders of Product A.</p>
                            </div>
                            <div className="p-2 rounded bg-surface-container-lowest/80 border-l-2 border-secondary space-y-0.5">
                              <div className="font-semibold text-secondary text-[11px] uppercase tracking-wide">What Changed</div>
                              <p className="text-on-surface">Orders increased from 2,615 to 2,840, and the average customer spent $452 per order.</p>
                            </div>
                            <div className="p-2 rounded bg-surface-container-lowest/80 border-l-2 border-outline space-y-0.5">
                              <div className="font-semibold text-outline text-[11px] uppercase tracking-wide">What You Can Do Next</div>
                              <p className="text-on-surface">Keep extra stock of Product A ready and send a thank-you note to repeat customers.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 6: Presentation View */}
                    {currentStage === 6 && (
                      <div className="flex flex-col lg:flex-row gap-space-md items-center animate-fadeInUp">
                        <div className="w-full lg:w-1/3 text-left space-y-space-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-label-sm uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px] text-primary">slideshow</span>
                            Presentation Deck
                          </div>
                          <h4 className="font-headline-md text-headline-md text-on-surface font-semibold">
                            Turn your data into presentation slides.
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Get neat slides with simple titles, clear bullet points, and charts ready for any meeting.
                          </p>
                        </div>
                        <div className="w-full lg:w-2/3 relative py-4">
                          <div className="absolute top-0 right-4 left-4 h-36 rounded-xl bg-surface-container-highest/40 border border-outline-variant/20 shadow-md transform scale-95 translate-y-[-8px] pointer-events-none">
                            <div className="px-4 py-2 text-[10px] text-outline flex justify-between font-label-sm">
                              <span>Slide 3: Sales Trends</span>
                              <span>Q1 - Q4 Analysis</span>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 left-2 h-40 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 shadow-lg transform scale-[0.98] translate-y-[-4px] pointer-events-none">
                            <div className="px-4 py-2 text-[10px] text-outline flex justify-between font-label-sm">
                              <span>Slide 2: Best Products</span>
                              <span>Product A Distribution</span>
                            </div>
                          </div>
                          <div className="p-space-md rounded-xl bg-surface-container-low border-2 border-primary/50 shadow-2xl relative text-left aspect-[16/9] flex flex-col justify-between hover:scale-[1.01] transition-transform">
                            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded bg-primary"></div>
                                <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                                  Sales Overview
                                </span>
                              </div>
                              <span className="text-[10px] text-primary uppercase font-label-sm px-2 py-0.5 rounded bg-primary/15 border border-primary/30">
                                Slide 1 of 4
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 my-auto">
                              <div className="space-y-1 text-xs text-on-surface-variant">
                                <div className="font-semibold text-primary flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Sales Overview: $128,450 (+14%)
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Best Products: Product A leads sales
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Sales Trends: Up across every quarter
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Main Findings: Customers keep returning
                                </div>
                              </div>
                              <div className="h-20 rounded bg-surface-container flex flex-col items-center justify-center border border-outline-variant/20 text-secondary text-xs font-data-mono p-2">
                                <div className="text-[10px] text-outline mb-1">Quarterly Sales Growth</div>
                                <div className="flex items-end gap-1.5 h-10 w-full justify-center">
                                  <div className="w-3 bg-surface-container-highest h-4 rounded-t"></div>
                                  <div className="w-3 bg-secondary-container h-6 rounded-t"></div>
                                  <div className="w-3 bg-primary-container h-8 rounded-t"></div>
                                  <div className="w-3 bg-primary h-10 rounded-t"></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-outline border-t border-outline-variant/20 pt-2">
                              <span>AI Data Workspace Presentation Deck</span>
                              <span className="text-primary font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">present_to_all</span> Ready for Your Meeting
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Click Feedback / Action Helper */}
                  <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-xs text-outline gap-2">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[18px]">touch_app</span>
                      <span>{stageTips[currentStage]}</span>
                    </div>
                    <button
                      onClick={onGetStarted}
                      className="px-space-md py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1 border border-outline-variant/30 hover:border-primary/40 active:scale-95 cursor-pointer"
                    >
                      <span>Try this stage</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>

                {/* CTA Under Journey */}
                <div className="mt-space-lg text-center p-space-md rounded-xl bg-surface-container-high border border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-space-md hover:border-primary/40 transition-colors">
                  <div className="text-left">
                    <h4 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Upload your data. Choose what you need. Let AI handle the rest.
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      From uploading a file to finished presentation slides in four easy steps.
                    </p>
                  </div>
                  <button
                    onClick={onGetStarted}
                    className="btn-shimmer px-space-xl py-space-sm bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-label-md text-label-md font-semibold rounded-lg hover:from-primary-fixed hover:to-primary transition-all cursor-pointer shadow shrink-0 active:scale-95"
                  >
                    Get Started
                  </button>
                </div>

                {/* ASK MY DATA & AI ANALYST CAPABILITY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mt-space-lg text-left">
                  {/* Ask My Data Card */}
                  <div
                    onClick={() =>
                      onShowNotice({
                        title: 'Ask My Data',
                        message:
                          'Natural language queries (e.g., "Which product had highest sales last month?") will be connected in upcoming steps.',
                        badge: 'Conversational Analysis',
                      })
                    }
                    className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between hover:border-primary/50 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(233,193,118,0.1)] transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[22px]">chat</span>
                        </div>
                        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-surface-container-high">
                          Ask Questions
                        </span>
                      </div>
                      <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-primary transition-colors">
                        Ask My Data
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                        Ask questions about your numbers in plain English and receive clear, factual answers backed by your records.
                      </p>
                      {/* Simulated interactive prompt box */}
                      <div className="p-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-body-sm text-xs space-y-2">
                        <div className="flex items-center gap-2 text-outline">
                          <span className="material-symbols-outlined text-primary text-[16px]">person</span>
                          <span>"Which product had the highest sales last month?"</span>
                        </div>
                        <div className="p-2 rounded bg-surface-container-high text-on-surface border border-primary/20 text-xs">
                          <span className="text-primary font-semibold">AI:</span> Product A had the highest sales, with 1,240 orders.
                        </div>
                      </div>
                    </div>
                    <div className="pt-space-md flex items-center gap-1 font-label-sm text-label-sm text-primary group-hover:translate-x-1 transition-transform">
                      <span>Instant Conversational Answers</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    </div>
                  </div>

                  {/* AI Analyst Card */}
                  <div
                    onClick={() =>
                      onShowNotice({
                        title: 'AI Analyst',
                        message:
                          'Autonomous data exploration, anomaly checks, and seasonal revenue suggestions will be enabled in upcoming steps.',
                        badge: 'Autonomous Guidance',
                      })
                    }
                    className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between hover:border-secondary/60 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(213,197,168,0.1)] transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-space-sm">
                        <div className="w-10 h-10 rounded-lg bg-secondary-container/30 flex items-center justify-center text-secondary border border-secondary/30 group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                        </div>
                        <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary px-2 py-0.5 rounded bg-surface-container-high">
                          Smart Suggestions
                        </span>
                      </div>
                      <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-secondary transition-colors">
                        AI Analyst
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                        Work with AI to explore your data, spot seasonal changes, and test different business ideas.
                      </p>
                      {/* Simulated Analyst Suggestion */}
                      <div className="p-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-body-sm text-xs space-y-2">
                        <div className="flex items-center justify-between text-outline">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> Helpful Tip
                          </span>
                          <span className="text-[11px] font-data-mono">Ready</span>
                        </div>
                        <div className="text-on-surface-variant text-xs">
                          Notice that orders increase in November and December. Consider stocking more inventory before the holidays.
                        </div>
                      </div>
                    </div>
                    <div className="pt-space-md flex items-center gap-1 font-label-sm text-label-sm text-secondary group-hover:translate-x-1 transition-transform">
                      <span>Helpful Guidance</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* "HOW IT WORKS" (4-STEP WORKFLOW) */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin py-space-xl" id="how-it-works">
              <div className="mb-space-xl text-left">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">Workflow</span>
                <h2 className="font-headline-xl text-3xl sm:text-headline-xl text-on-surface mt-space-xs mb-space-sm">
                  How It Works
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                  A simple, four-step path from spreadsheets to actionable business results.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md text-left">
                {/* Step 01 */}
                <div
                  onClick={onGetStarted}
                  className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg cursor-pointer"
                >
                  <div className="absolute -right-3 -bottom-3 font-display-lg text-[70px] font-bold text-surface-container-highest/20 select-none pointer-events-none group-hover:text-primary/10 transition-colors">
                    01
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-data-mono text-body-sm font-semibold mb-space-md border border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      01
                    </div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-primary transition-colors">
                      Upload Your Data
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Upload an Excel or CSV file to get started.
                    </p>
                  </div>
                  <div className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    Excel & CSV Ready
                  </div>
                </div>

                {/* Step 02 */}
                <div
                  onClick={() => jumpToJourneyStage(1)}
                  className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg cursor-pointer"
                >
                  <div className="absolute -right-3 -bottom-3 font-display-lg text-[70px] font-bold text-surface-container-highest/20 select-none pointer-events-none group-hover:text-primary/10 transition-colors">
                    02
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-data-mono text-body-sm font-semibold mb-space-md border border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      02
                    </div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-primary transition-colors">
                      AI Checks Your Data
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      AI finds missing values, duplicates, and errors.
                    </p>
                  </div>
                  <div className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">fact_check</span>
                    Data Validation
                  </div>
                </div>

                {/* Step 03 */}
                <div
                  onClick={() => jumpToJourneyStage(2)}
                  className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg cursor-pointer"
                >
                  <div className="absolute -right-3 -bottom-3 font-display-lg text-[70px] font-bold text-surface-container-highest/20 select-none pointer-events-none group-hover:text-primary/10 transition-colors">
                    03
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-data-mono text-body-sm font-semibold mb-space-md border border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      03
                    </div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-primary transition-colors">
                      AI Analyzes Your Data
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Find trends, compare results, and discover useful insights.
                    </p>
                  </div>
                  <div className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">query_stats</span>
                    Guided Analysis
                  </div>
                </div>

                {/* Step 04 */}
                <div
                  onClick={() => jumpToJourneyStage(4)}
                  className="group p-space-lg rounded-xl bg-surface-container border border-outline-variant/30 shadow-md flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg cursor-pointer"
                >
                  <div className="absolute -right-3 -bottom-3 font-display-lg text-[70px] font-bold text-surface-container-highest/20 select-none pointer-events-none group-hover:text-primary/10 transition-colors">
                    04
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-data-mono text-body-sm font-semibold mb-space-md border border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      04
                    </div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs font-semibold group-hover:text-primary transition-colors">
                      Create Your Output
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                      Create a dashboard, report, presentation, or summary.
                    </p>
                  </div>
                  <div className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">done_all</span>
                    Instant Business Utility
                  </div>
                </div>
              </div>
            </section>

            {/* COMPARISON SECTION: From Raw Data to Useful Results */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin py-space-xl">
              <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-xl p-space-lg md:p-space-xl">
                <div className="text-center max-w-2xl mx-auto mb-space-xl">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">Comparison</span>
                  <h2 className="font-headline-xl text-3xl sm:text-headline-xl text-on-surface mt-space-xs">
                    From Raw Data to Useful Results
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-lg max-w-4xl mx-auto text-left">
                  {/* Column 1: Without AI */}
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between hover:border-outline-variant transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-space-md text-error">
                        <span className="material-symbols-outlined text-[20px]">cancel</span>
                        <h3 className="font-title-lg text-title-lg font-semibold text-on-surface">Without AI</h3>
                      </div>
                      <ul className="space-y-space-md text-on-surface-variant font-body-md">
                        <li className="flex items-start gap-3">
                          <span className="text-error/80 font-bold text-[18px] leading-none mt-0.5">×</span>
                          <span>Clean data manually</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-error/80 font-bold text-[18px] leading-none mt-0.5">×</span>
                          <span>Spend time making charts</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-error/80 font-bold text-[18px] leading-none mt-0.5">×</span>
                          <span>Search through large spreadsheets</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-error/80 font-bold text-[18px] leading-none mt-0.5">×</span>
                          <span>Write reports manually</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-space-lg pt-space-sm border-t border-outline-variant/20 text-body-sm text-outline">
                      Slow, manual, and repetitive work
                    </div>
                  </div>

                  {/* Column 2: With AI Data Workspace (Highlighted) */}
                  <div className="p-space-lg rounded-xl bg-surface-container border-2 border-primary/70 shadow-xl shadow-primary/10 flex flex-col justify-between relative hover:shadow-[0_0_30px_rgba(233,193,118,0.2)] transition-all">
                    <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[10px] uppercase font-bold tracking-wider shadow-md animate-pulse">
                      Recommended
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-space-md text-primary">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <h3 className="font-title-lg text-title-lg font-semibold text-primary-fixed">
                          With AI Data Workspace
                        </h3>
                      </div>
                      <ul className="space-y-space-md text-on-surface font-body-md">
                        <li className="flex items-start gap-3 group">
                          <span className="text-primary font-bold text-[18px] leading-none mt-0.5 group-hover:scale-125 transition-transform">
                            ✓
                          </span>
                          <span>Upload your data</span>
                        </li>
                        <li className="flex items-start gap-3 group">
                          <span className="text-primary font-bold text-[18px] leading-none mt-0.5 group-hover:scale-125 transition-transform">
                            ✓
                          </span>
                          <span>Let AI find data problems</span>
                        </li>
                        <li className="flex items-start gap-3 group">
                          <span className="text-primary font-bold text-[18px] leading-none mt-0.5 group-hover:scale-125 transition-transform">
                            ✓
                          </span>
                          <span>Get useful insights</span>
                        </li>
                        <li className="flex items-start gap-3 group">
                          <span className="text-primary font-bold text-[18px] leading-none mt-0.5 group-hover:scale-125 transition-transform">
                            ✓
                          </span>
                          <span>Create dashboards, reports, and presentations</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-space-lg pt-space-sm border-t border-outline-variant/20 text-body-sm text-primary font-medium">
                      Fast, automated, and ready for decision-makers
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* "EVERYTHING YOU NEED TO UNDERSTAND YOUR DATA" SECTION */}
            <section className="max-w-7xl mx-auto px-4 md:px-margin py-space-xl">
              <div className="rounded-xl bg-surface-container p-space-lg md:p-space-xl border border-outline-variant/30 shadow-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-space-md border border-primary/20">
                  <span className="material-symbols-outlined text-[26px]">insights</span>
                </div>
                <h2 className="font-headline-xl text-3xl sm:text-headline-xl text-on-surface max-w-3xl mb-space-xs">
                  Everything You Need to Understand Your Data
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mb-space-xl">
                  From cleaning your data to finding insights and creating professional outputs, AI Data Workspace helps you move from raw data to useful results.
                </p>

                {/* 4 Clean Feature Summary Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md w-full mb-space-xl text-left">
                  {/* Card 1 */}
                  <div
                    onClick={onGetStarted}
                    className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-space-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">
                        Easy File Upload
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Upload Excel or CSV files to get started.
                      </p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div
                    onClick={() => jumpToJourneyStage(1)}
                    className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-space-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">fact_check</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">
                        Data Quality Checks
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Find missing values, duplicates, inconsistent data, and other issues.
                      </p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div
                    onClick={() =>
                      onShowNotice({
                        title: 'Ask Questions About Your Data',
                        message:
                          'Ask plain English questions like "Which customer had the largest growth?" and get data-backed answers in the next step.',
                        badge: 'Coming Next',
                      })
                    }
                    className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-space-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">help_center</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">
                        Ask Questions About Your Data
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Ask questions about your data and get clear answers.
                      </p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div
                    onClick={() => jumpToJourneyStage(4)}
                    className="group p-space-md rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div>
                      <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center mb-space-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                      </div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold mb-1 group-hover:text-primary transition-colors">
                        Useful Outputs
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Create dashboards, reports, presentations, and summaries from your data.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Banner */}
                <div
                  className="w-full p-space-lg rounded-xl bg-surface-container-high border border-outline-variant/40 shadow-inner flex flex-col md:flex-row items-center justify-between gap-space-md text-left"
                  id="get-started"
                >
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface font-semibold">
                      Ready to turn your data into decisions?
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Get started with your data and explore what AI can help you discover.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm shrink-0">
                    <button
                      onClick={onGetStarted}
                      className="btn-shimmer px-space-lg py-space-sm bg-gradient-to-b from-primary to-primary-container text-on-primary-container font-label-md text-label-md font-semibold rounded-lg hover:from-primary-fixed hover:to-primary transition-all cursor-pointer shadow active:scale-95"
                    >
                      Get Started
                    </button>
                    <button
                      onClick={onOpenContact}
                      className="px-space-md py-space-sm bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container transition-all cursor-pointer border border-outline-variant/30 active:scale-95"
                    >
                      Contact Us
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* REFINED CLEAN FOOTER */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 py-space-xl text-left">
        <div className="max-w-7xl mx-auto px-4 md:px-margin">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-xl mb-space-xl">
            {/* Brand & Tagline */}
            <div className="md:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <img
                    alt="AI Data Workspace"
                    className="w-7 h-7 rounded-md object-contain"
                    src="https://lh3.googleusercontent.com/aida/AEtjO1Xz-46ccNuFutz5CyIlkIh5zv4YKpnFZofbNMGplskyWjV5sdYdUtJ8DkUDFXflG6Hesnnqno5M1UKpbuwa05QG-FNb2K1jXLog71Q7L6NhrvCSDTcydir_LaGT3VWIDo19BpHN_i1WBD67IcmkGILlFUDSuGkgK5GJ5fX5rZ_oGZmItUJwUTqzmcwsuAVCxS9LGDR2WvWUB2vu6jjnsl5vpvFGLwliLMXFOH63eJ9M3DXUexh0pAuqNIU"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="font-serif text-lg font-bold text-champagne-100 tracking-tight text-on-surface">
                    AI Data Workspace
                  </span>
                </div>
                <p className="text-sm text-stone-400 max-w-sm">
                  Turn your data into clear insights and useful outputs.
                </p>
              </div>
            </div>

            {/* Navigation: Product */}
            <div className="space-y-space-sm">
              <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary">PRODUCT</div>
              <ul className="space-y-space-xs font-body-md text-body-md">
                <li>
                  <button onClick={() => jumpToJourneyStage(1)} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Clean Data
                  </button>
                </li>
                <li>
                  <button onClick={() => jumpToJourneyStage(2)} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Analyze Data
                  </button>
                </li>
                <li>
                  <button onClick={() => jumpToJourneyStage(4)} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Dashboards
                  </button>
                </li>
                <li>
                  <button onClick={() => jumpToJourneyStage(5)} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Reports
                  </button>
                </li>
                <li>
                  <button onClick={() => jumpToJourneyStage(6)} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Presentations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() =>
                      onShowNotice({
                        title: 'Ask My Data',
                        message: 'Ask My Data conversational answers will be implemented in the next step.',
                        badge: 'Feature',
                      })
                    }
                    className="text-on-surface-variant hover:text-primary transition-colors text-left"
                  >
                    Ask My Data
                  </button>
                </li>
              </ul>
            </div>

            {/* Navigation: About */}
            <div className="space-y-space-sm">
              <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary">ABOUT</div>
              <ul className="space-y-space-xs font-body-md text-body-md">
                <li>
                  <button
                    onClick={() =>
                      onShowNotice({
                        title: 'About the Project',
                        message:
                          'AI Data Workspace converts spreadsheets into interactive business intelligence dashboards, executive reports, and presentation slide decks.',
                        badge: 'Overview',
                      })
                    }
                    className="text-on-surface-variant hover:text-primary transition-colors text-left"
                  >
                    About the Project
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={onOpenContact} className="text-on-surface-variant hover:text-primary transition-colors text-left">
                    Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright Bottom Bar */}
          <div className="pt-space-md border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="font-body-sm text-body-sm text-outline">
              © 2026 AI Data Workspace. Built as an AI-powered data analytics project.
            </div>
            <div className="flex items-center gap-space-md font-body-sm text-body-sm text-outline">
              <button
                onClick={() =>
                  onShowNotice({
                    title: 'Privacy Policy',
                    message:
                      'Customer datasets are treated with strict confidentiality. Processing is scoped to your analytical session.',
                    badge: 'Privacy',
                  })
                }
                className="hover:text-on-surface transition-colors"
              >
                Privacy
              </button>
              <span className="text-outline-variant">•</span>
              <button
                onClick={() =>
                  onShowNotice({
                    title: 'Terms of Service',
                    message:
                      'Workspace usage terms, security guidelines, and data retention policies for enterprise teams.',
                    badge: 'Terms',
                  })
                }
                className="hover:text-on-surface transition-colors"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
