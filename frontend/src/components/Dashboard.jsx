import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  List,
  Brain,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  Activity,
  RotateCcw
} from 'lucide-react';

export default function Dashboard({ incidents, loading, error, onNavigate, onSelectIncident }) {
  const activeIncidents = incidents.filter(i => i.outcome.toLowerCase() !== 'resolved');
  const resolvedIncidents = incidents.filter(i => i.outcome.toLowerCase() === 'resolved');
  const totalIncidents = incidents.length;

  // Verified memory retention counts
  const retainedCount = incidents.filter(i => i.memory_retained).length;
  const pendingRetentionCount = resolvedIncidents.filter(i => !i.memory_retained).length;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Incidents</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{activeIncidents.length}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeIncidents.length > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {activeIncidents.length > 0 ? 'Action Required' : 'All Clear'}
            </span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Incidents</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{resolvedIncidents.length}</span>
            <span className="text-xs text-slate-400">Total Mitigated</span>
          </div>
        </div>

        {/* Retained Historical Memories */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historical Memories</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{retainedCount}</span>
            <span className="text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Retained in Hindsight
            </span>
          </div>
        </div>

        {/* Pending Memory Retention */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Retention</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{pendingRetentionCount}</span>
            <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Retry Available
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents Feed (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" /> Recent Incidents
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time incident feeds and AI investigation entry points</p>
            </div>
            <button
              onClick={() => onNavigate('create')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              <PlusCircle className="w-4 h-4" /> Declare Incident
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Loading incident feed...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No incidents declared yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {incidents.slice(0, 6).map((incident) => {
                const isResolved = incident.outcome.toLowerCase() === 'resolved';
                return (
                  <div
                    key={incident.id}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg transition"
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50">
                          {incident.id}
                        </span>
                        <span className="text-sm font-semibold text-white">{incident.service}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                          incident.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          incident.severity === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate font-mono">{incident.error}</p>
                      <p className="text-[11px] text-slate-400 truncate">{incident.symptoms}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {incident.outcome}
                      </span>
                      <button
                        onClick={() => {
                          onSelectIncident(incident.id);
                          onNavigate('investigate');
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
                        title="Investigate Incident"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Operations Sidebar (1 col) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              SRE Actions
            </h4>
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('create')}
                className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between text-xs font-semibold text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span>Declare New Incident</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </button>

              <button
                onClick={() => onNavigate('memory')}
                className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between text-xs font-semibold text-white transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-purple-400" />
                  <span>Explore Hindsight Memory</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </button>
            </div>
          </div>

          {/* System Status Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Platform Engine Status
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">FastAPI Backend</span>
                <span className="text-emerald-400 font-mono">Running (v0.1.0)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 py-1.5">
                <span className="text-slate-400">Memory Engine</span>
                <span className="text-purple-400 font-mono">Hindsight SDK</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">AI Model</span>
                <span className="text-indigo-400 font-mono">Groq GPT-OSS 20B</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
