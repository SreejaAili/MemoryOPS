import React from 'react';
import {
  Activity,
  Brain,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  RotateCcw,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Server,
  ArrowUpRight,
  Check
} from 'lucide-react';

export default function LandingPage({ incidents, onNavigate, onSelectIncident }) {
  const activeIncidents = incidents.filter(i => i.outcome.toLowerCase() !== 'resolved');
  const resolvedIncidents = incidents.filter(i => i.outcome.toLowerCase() === 'resolved');
  const totalIncidents = incidents.length;
  const retainedCount = incidents.filter(i => i.memory_retained).length;
  const pendingRetentionCount = resolvedIncidents.filter(i => !i.memory_retained).length;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-20 pb-12 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column - Content */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-xs font-mono font-semibold text-blue-400 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            AI-POWERED INCIDENT MEMORY
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Every incident leaves a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">trace</span>. Every resolution builds <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">intelligence</span>.
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-xl">
            MemoryOps transforms production incidents into persistent intelligence. Analyze failures, recall relevant historical solutions, and help AI agents learn from every resolved incident.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
            >
              Explore Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => scrollToSection('how-it-works')}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700/80 transition flex items-center gap-2"
            >
              How It Works
            </button>
          </div>

          {/* Metrics Counters */}
          <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-left">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalIncidents || 42}</span>
              <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Incidents Stored</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">{retainedCount || 42}</span>
              <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Historical Memories</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{resolvedIncidents.length || 42}</span>
              <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Resolutions Recorded</span>
            </div>
          </div>
        </div>

        {/* Right Column - Realistic Application Dashboard Preview */}
        <div className="lg:col-span-6 relative">
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/20 rounded-2xl blur-xl opacity-70"></div>

          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            {/* Dashboard Header Preview */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 ml-2">MemoryOps Command Center</span>
              </div>
              <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded">
                LIVE DEMO PREVIEW
              </span>
            </div>

            {/* Top Metric Cards Row */}
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Active</span>
                <span className="text-lg font-bold text-white">{activeIncidents.length}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Resolved</span>
                <span className="text-lg font-bold text-emerald-400">{resolvedIncidents.length}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Memories</span>
                <span className="text-lg font-bold text-purple-400">{retainedCount}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Pending</span>
                <span className="text-lg font-bold text-amber-400">{pendingRetentionCount}</span>
              </div>
            </div>

            {/* Recent Incidents Panel */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recent Incidents Feed</span>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-blue-400 font-bold">INC-116</span>
                    <span className="text-slate-200 truncate">Prometheus TSDB WAL Corruption</span>
                  </div>
                  <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">HIGH</span>
                </div>

                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-blue-400 font-bold">INC-115</span>
                    <span className="text-slate-200 truncate">Cloudflare CDN Edge Cache Stale Data</span>
                  </div>
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">LOW</span>
                </div>

                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-blue-400 font-bold">INC-114</span>
                    <span className="text-slate-200 truncate">HashiCorp Vault Secret Lease Expiration</span>
                  </div>
                  <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">CRITICAL</span>
                </div>
              </div>
            </div>

            {/* Contextual AI Memory & Analysis Panel */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-950/30 border border-purple-800/40 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[10px]">
                  <Brain className="w-3.5 h-3.5 text-purple-400" /> HINDSIGHT RECALL
                </div>
                <p className="text-[10px] text-purple-200 leading-snug">
                  Recalled INC-101: Connection pool session leak during traffic surge.
                </p>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded inline-block font-mono">
                  98.4% Vector Similarity
                </span>
              </div>

              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[10px]">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" /> GROQ AI DIAGNOSIS
                </div>
                <p className="text-[10px] text-blue-200 leading-snug">
                  Increase connection pool size to 100 & configure idle connection timeout.
                </p>
                <span className="text-[9px] bg-blue-900 text-blue-200 border border-blue-700 px-1.5 py-0.5 rounded inline-block font-mono">
                  Confidence: High
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION */}
      <section id="features" className="space-y-10 pt-8 border-t border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest font-semibold">CORE CAPABILITIES</span>
          <h2 className="text-3xl font-extrabold text-white">An incident response system that remembers.</h2>
          <p className="text-sm text-slate-400">
            Engineered specifically for DevOps and SRE teams to eliminate repeat investigations and build reusable operational memory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-blue-500/50 transition group shadow-sm">
            <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 w-fit group-hover:scale-105 transition">
              <Cpu className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-blue-400 font-bold block">01</span>
            <h3 className="text-base font-bold text-white">AI Incident Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyze production incidents, identify potential root causes, assess severity, and generate actionable remediation suggestions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-purple-500/50 transition group shadow-sm">
            <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20 w-fit group-hover:scale-105 transition">
              <Database className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold block">02</span>
            <h3 className="text-base font-bold text-white">Persistent Memory</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Save resolved incidents and their solutions so valuable operational knowledge remains available even after sessions end.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-cyan-500/50 transition group shadow-sm">
            <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-xl border border-cyan-500/20 w-fit group-hover:scale-105 transition">
              <Brain className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold block">03</span>
            <h3 className="text-base font-bold text-white">Contextual Memory Recall</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Retrieve relevant historical incidents and their resolutions to give AI agents useful context when analyzing new problems.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-emerald-500/50 transition group shadow-sm">
            <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20 w-fit group-hover:scale-105 transition">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold block">04</span>
            <h3 className="text-base font-bold text-white">Continuous Learning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Turn resolved incidents into reusable knowledge and help future investigations benefit from previous experience.
            </p>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section id="how-it-works" className="space-y-10 pt-8 border-t border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-semibold">INCIDENT WORKFLOW</span>
          <h2 className="text-3xl font-extrabold text-white">From production failure to reusable intelligence.</h2>
          <p className="text-sm text-slate-400">
            A four-step persistent feedback loop that turns every incident resolution into long-term system memory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
              01
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Incident</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter incident details, logs, severity, and relevant technical information.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white font-mono font-bold text-xs flex items-center justify-center">
              02
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyze the incident using AI to identify possible causes and recommend remediation steps.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center">
              03
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Memory Recall</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Retrieve relevant historical incidents from Hindsight to provide context and support the investigation.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
              04
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resolve & Retain</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              After resolution, retain useful incident details and solutions as persistent memory for future investigations.
            </p>
          </div>
        </div>
      </section>

      {/* 4. MEMORY INTELLIGENCE VISUALIZATION */}
      <section id="knowledge" className="space-y-8 pt-8 border-t border-slate-800/80">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest font-semibold">MEMORY ARCHITECTURE</span>
          <h2 className="text-3xl font-extrabold text-white">Beyond incident history. Into incident intelligence.</h2>
          <p className="text-sm text-slate-400">
            How MemoryOps seamlessly connects real-time incident analysis with long-term vector memory RAG.
          </p>
        </div>

        {/* Minimal Dark Workflow Visualization Node Graph */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center font-mono text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-indigo-400 mx-auto" />
              <span className="font-bold text-white block">New Incident</span>
              <span className="text-[10px] text-slate-500 block">Symptoms Input</span>
            </div>

            <div className="hidden md:flex items-center justify-center text-slate-600">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="bg-purple-950/60 p-4 rounded-xl border border-purple-800/60 text-center space-y-2">
              <Brain className="w-5 h-5 text-purple-400 mx-auto" />
              <span className="font-bold text-purple-300 block">Hindsight RECALL</span>
              <span className="text-[10px] text-purple-400 block">Vector RAG</span>
            </div>

            <div className="hidden md:flex items-center justify-center text-slate-600">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div className="bg-blue-950/60 p-4 rounded-xl border border-blue-800/60 text-center space-y-2">
              <Cpu className="w-5 h-5 text-blue-400 mx-auto" />
              <span className="font-bold text-blue-300 block">Groq AI Reasoning</span>
              <span className="text-[10px] text-blue-400 block">GPT-OSS 20B</span>
            </div>

            <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-800/60 text-center space-y-2 mt-4 md:mt-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
              <span className="font-bold text-emerald-300 block">Hindsight RETAIN</span>
              <span className="text-[10px] text-emerald-400 block">Memory Saved</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PLATFORM ENGINE STATUS */}
      <section id="status" className="space-y-6 pt-8 border-t border-slate-800/80">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" /> Platform Engine Status
            </h3>
            <p className="text-xs text-slate-400">Live operational status of backend services and memory engines</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-xs font-mono">
            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">FastAPI Backend</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Running
              </span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Memory Engine</span>
              <span className="text-purple-400 font-bold">Hindsight SDK</span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">AI Analysis Model</span>
              <span className="text-blue-400 font-bold">Groq GPT-20B</span>
            </div>

            <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Incident Storage</span>
              <span className="text-emerald-400 font-bold">SQLite DB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="pt-8">
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-purple-950/80 border border-blue-500/40 rounded-3xl p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Your next incident starts with what you learned from the last one.
            </h2>
            <p className="text-sm text-slate-300">
              Build a smarter incident response workflow with persistent AI memory and contextual incident intelligence.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition shadow-xl shadow-blue-600/30 flex items-center gap-2 group"
            >
              Launch MemoryOps <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
