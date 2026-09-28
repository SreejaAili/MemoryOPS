import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Sparkles,
  RefreshCw,
  Database,
  Calendar,
  AlertCircle,
  CheckCircle2,
  PieChart,
  BarChart2,
  Tag
} from 'lucide-react';
import { recallMemories, reflectMemories, fetchIncidents } from '../api';

export default function MemoryExplorer() {
  const [activeTab, setActiveTab] = useState('memories');
  const [incidents, setIncidents] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recall states
  const [recallQuery, setRecallQuery] = useState('Database connection timeout payment');
  const [recallResults, setRecallResults] = useState(null);
  const [recalling, setRecalling] = useState(false);

  // Reflect states
  const [reflectQuery, setReflectQuery] = useState('What are the recurring root causes across database, auth and latency failures?');
  const [reflectResults, setReflectResults] = useState(null);
  const [reflecting, setReflecting] = useState(false);

  useEffect(() => {
    loadInitialMemories();
  }, []);

  const loadInitialMemories = async () => {
    setLoading(true);
    try {
      const incList = await fetchIncidents();
      setIncidents(incList || []);

      // Execute RECALL to retrieve structured memories from backend/Hindsight
      const res = await recallMemories({ query: 'historical incidents database latency auth worker' });
      if (res && res.memories) {
        setMemories(res.memories);
      } else {
        // Fallback formatting from incidents list
        setMemories(
          incList.map((inc) => ({
            incident_id: inc.id,
            service: inc.service,
            error: inc.error,
            root_cause: inc.root_cause || 'Under active investigation',
            resolution: inc.resolution || 'Pending resolution steps',
            outcome: inc.outcome || 'Investigating',
            date: inc.created_at ? new Date(inc.created_at).toLocaleDateString() : 'Recent',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async (e) => {
    if (e) e.preventDefault();
    setRecalling(true);
    try {
      const res = await recallMemories({ query: recallQuery });
      setRecallResults(res);
      if (res.memories) setMemories(res.memories);
    } catch (err) {
      alert(`Recall failed: ${err.message}`);
    } finally {
      setRecalling(false);
    }
  };

  const handleReflect = async (e) => {
    if (e) e.preventDefault();
    setReflecting(true);
    try {
      const res = await reflectMemories({ query: reflectQuery });
      setReflectResults(res);
    } catch (err) {
      alert(`Reflect failed: ${err.message}`);
    } finally {
      setReflecting(false);
    }
  };

  // Pattern visualization computations
  const totalCount = incidents.length || 1;
  const serviceCounts = incidents.reduce((acc, inc) => {
    acc[inc.service] = (acc[inc.service] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = incidents.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" /> Hindsight Memory Store
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical incident learnings persistent vector bank (RETAIN, RECALL, and REFLECT operations).
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-4 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'memories' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Incident Memories ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('recall')}
            className={`px-4 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'recall' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Live RECALL Query
          </button>
          <button
            onClick={() => setActiveTab('reflect')}
            className={`px-4 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'reflect' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Live REFLECT Synthesis
          </button>
        </div>
      </div>

      {/* Pattern Visualization Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" /> Incident Pattern Distribution
          </h3>
          <span className="text-xs text-slate-400 font-mono">Aggregated from Hindsight & SQLite</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Services Breakdown */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Incidents by Microservice
            </span>
            <div className="space-y-2 text-xs">
              {Object.entries(serviceCounts).map(([service, count]) => {
                const pct = Math.round((count / totalCount) * 100);
                return (
                  <div key={service} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                      <span>{service}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Incidents by Severity Profile
            </span>
            <div className="space-y-2 text-xs">
              {Object.entries(severityCounts).map(([sev, count]) => {
                const pct = Math.round((count / totalCount) * 100);
                const colorClass =
                  sev === 'critical' ? 'bg-rose-500' :
                  sev === 'high' ? 'bg-amber-500' : 'bg-slate-500';

                return (
                  <div key={sev} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                      <span className="uppercase font-bold">{sev}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`${colorClass} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: INCIDENT MEMORIES LIST */}
      {activeTab === 'memories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" /> Historical Memories ({memories.length})
            </h3>
            <button
              onClick={loadInitialMemories}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1 font-mono"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh Bank
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              Loading historical incident memories...
            </div>
          ) : memories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
              No historical incident memories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((mem, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/50">
                        {mem.incident_id || `INC-${idx + 101}`}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{mem.service || 'Service'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" /> {mem.date ? new Date(mem.date).toLocaleDateString() : '2026-03-15'}
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        {mem.outcome || 'Resolved'}
                      </span>
                    </div>
                  </div>

                  {/* Fields Grid */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Primary Error</span>
                      <p className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-200 font-mono">{mem.error}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">Root Cause</span>
                      <p className="bg-amber-950/20 border border-amber-800/30 p-2 rounded text-amber-200/90">{mem.root_cause}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">Resolution</span>
                      <p className="bg-emerald-950/20 border border-emerald-800/30 p-2 rounded text-emerald-200/90">{mem.resolution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE RECALL QUERY */}
      {activeTab === 'recall' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleRecall} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Execute Live Hindsight RECALL Query
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recallQuery}
                onChange={(e) => setRecallQuery(e.target.value)}
                placeholder="Enter query, service name, or error details..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="submit"
                disabled={recalling}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Search className="w-3.5 h-3.5" /> {recalling ? 'Searching...' : 'RECALL'}
              </button>
            </div>
          </form>

          {recallResults && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Raw Recalled Results from Hindsight Engine
              </span>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
                {JSON.stringify(recallResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE REFLECT SYNTHESIS */}
      {activeTab === 'reflect' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleReflect} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Synthesize Cross-Incident Patterns with Hindsight REFLECT
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={reflectQuery}
                onChange={(e) => setReflectQuery(e.target.value)}
                placeholder="Ask high-level pattern synthesis question..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={reflecting}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> {reflecting ? 'Synthesizing...' : 'REFLECT'}
              </button>
            </div>
          </form>

          {reflectResults && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Reflected Synthesis Output
              </span>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
                {JSON.stringify(reflectResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
