import React, { useState, useEffect } from 'react';
import {
  Brain,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldAlert,
  ArrowDown,
  Sparkles,
  Database,
  Search,
  BookOpen,
  ArrowRight,
  HelpCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { fetchIncidentById, analyzeIncident, resolveIncident, retainIncident } from '../api';

export default function IncidentInvestigation({ incidentId, incidents, onSelectIncident }) {
  const [selectedId, setSelectedId] = useState(incidentId || (incidents.length > 0 ? incidents[0].id : ''));
  const [incident, setIncident] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [rootCauseInput, setRootCauseInput] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');
  const [postMortemInput, setPostMortemInput] = useState('');
  const [resolving, setResolving] = useState(false);

  // Retention retry state
  const [retaining, setRetaining] = useState(false);
  const [retainMessage, setRetainMessage] = useState(null);

  useEffect(() => {
    if (incidentId) setSelectedId(incidentId);
  }, [incidentId]);

  useEffect(() => {
    if (selectedId) {
      loadAndAnalyze(selectedId);
    }
  }, [selectedId]);

  const loadAndAnalyze = async (id) => {
    setLoading(true);
    setError(null);
    setRetainMessage(null);
    try {
      const inc = await fetchIncidentById(id);
      setIncident(inc);

      const inv = await analyzeIncident(id);
      setInvestigation(inv);
    } catch (err) {
      console.error('Investigation error:', err);
      setError(err.message || 'Failed to analyze incident');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionInput.trim()) return;

    setResolving(true);
    try {
      const updated = await resolveIncident(selectedId, {
        root_cause: rootCauseInput.trim() || undefined,
        resolution: resolutionInput.trim(),
        post_mortem: postMortemInput.trim() || undefined,
        outcome: 'Resolved',
      });
      setIncident(updated);
      setShowResolveModal(false);
      setRootCauseInput('');
      setResolutionInput('');
      setPostMortemInput('');
      loadAndAnalyze(selectedId);
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const handleRetryRetention = async () => {
    if (!selectedId) return;
    setRetaining(true);
    setRetainMessage(null);
    try {
      const res = await retainIncident(selectedId);
      if (res.success) {
        setRetainMessage({ type: 'success', text: '✓ Successfully retained memory in Hindsight!' });
      } else {
        setRetainMessage({ type: 'error', text: `⚠ Retention failed: ${res.message}` });
      }
      const inc = await fetchIncidentById(selectedId);
      setIncident(inc);
    } catch (err) {
      setRetainMessage({ type: 'error', text: `⚠ Retention retry error: ${err.message}` });
    } finally {
      setRetaining(false);
    }
  };

  const renderEvidenceItem = (item, type) => {
    if (!item) return null;
    if (typeof item === 'string') {
      return item;
    }
    const incId = item.incident_id ? `[${item.incident_id}]` : '';
    const svc = item.service ? `(${item.service})` : '';
    const content = type === 'rc' ? item.root_cause : item.resolution;
    const prefix = [incId, svc].filter(Boolean).join(' ');
    return prefix ? `${prefix} — ${content}` : content;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Select Incident:</span>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (onSelectIncident) onSelectIncident(e.target.value);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 w-full md:w-96"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} - {inc.service} ({inc.outcome})
              </option>
            ))}
          </select>
        </div>

        {/* Concept Badges */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-400" /> Hindsight RECALL (Active)
          </span>
          <span className="text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" /> Hindsight RETAIN (On Resolve)
          </span>
          <button
            onClick={() => loadAndAnalyze(selectedId)}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Re-analyze
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-xl">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">Running MemoryOps Pipeline...</p>
          <p className="text-xs text-slate-500">Querying Hindsight Persistent Memory & Groq LLM Reasoning</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 mb-2" />
          <span className="font-semibold">Investigation Error:</span> {error}
        </div>
      ) : investigation && incident ? (
        <div className="space-y-6">
          {/* Pipeline Progress Navigation */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[800px] text-[11px] font-mono font-semibold">
              <div className="flex items-center gap-2 text-indigo-400 bg-indigo-950/60 px-3 py-1.5 rounded border border-indigo-800/50">
                <AlertTriangle className="w-3.5 h-3.5" /> 1. CURRENT INCIDENT
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 text-purple-400 bg-purple-950/60 px-3 py-1.5 rounded border border-purple-800/50">
                <Brain className="w-3.5 h-3.5" /> 2. HINDSIGHT RECALL
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/60 px-3 py-1.5 rounded border border-cyan-800/50">
                <BookOpen className="w-3.5 h-3.5" /> 3. HISTORICAL MATCHES
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded border border-amber-800/50">
                <Search className="w-3.5 h-3.5" /> 4. PREVIOUS CAUSES/SOLUTIONS
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 text-blue-400 bg-blue-950/60 px-3 py-1.5 rounded border border-blue-800/50">
                <Cpu className="w-3.5 h-3.5" /> 5. GROQ ANALYSIS
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded border border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5" /> 6. RECOMMENDED ACTION
              </div>
            </div>
          </div>

          {/* STEP 1: CURRENT INCIDENT CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50">
                  STEP 1
                </span>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">CURRENT INCIDENT DETAILS</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  incident.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                  incident.severity === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {incident.severity}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  incident.outcome.toLowerCase() === 'resolved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {incident.outcome}
                </span>
                {incident.outcome.toLowerCase() !== 'resolved' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve & Retain
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">Target Service</span>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-100 font-mono font-bold">
                  {incident.service} ({incident.id})
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">Error Signature</span>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-200 font-mono">
                  {incident.error}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">Observed Symptoms</span>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                  {incident.symptoms}
                </div>
              </div>
            </div>

            {/* RESOLVED INCIDENT RETENTION STATUS BANNER */}
            {incident.outcome.toLowerCase() === 'resolved' && (
              <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {incident.memory_retained ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verified: Retained in Hindsight Memory
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5 bg-amber-950/60 px-3 py-1 rounded border border-amber-800/60">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Pending Retention: Memory not yet confirmed in Hindsight
                    </span>
                  )}
                  {retainMessage && (
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                      retainMessage.type === 'success' ? 'text-emerald-300 bg-emerald-950/80' : 'text-rose-300 bg-rose-950/80'
                    }`}>
                      {retainMessage.text}
                    </span>
                  )}
                </div>

                {!incident.memory_retained && (
                  <button
                    onClick={handleRetryRetention}
                    disabled={retaining}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${retaining ? 'animate-spin' : ''}`} />
                    {retaining ? 'Retaining...' : 'Retry Retention in Hindsight'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-indigo-400 animate-bounce" />
          </div>

          {/* EXPLICIT MEMORY STATUS BANNER (STATE 1, 2, 3, 4) */}
          <div className="space-y-4">
            {investigation.memory_status === 'ok' && (
              <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">✓ Historical Memory Used (Hindsight Vector Memory)</h3>
                    <p className="text-xs text-emerald-200/80">
                      {investigation.similar_historical_incidents?.length || 0} unique, non-self relevant historical incident memories recalled from Hindsight vector memory bank.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-emerald-900/80 text-emerald-200 px-2.5 py-1 rounded border border-emerald-700/60">
                  recall_source: hindsight
                </span>
              </div>
            )}

            {investigation.memory_status === 'sqlite_fallback' && (
              <div className="bg-cyan-950/50 border border-cyan-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm text-cyan-200">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-cyan-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-cyan-300">🗄 Historical Memory Used (Database Fallback)</h3>
                    <p className="text-xs text-cyan-200/80">
                      Retrieved {investigation.similar_historical_incidents?.length || 0} relevant resolved incident records directly from the database fallback matching target service or error signature.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-cyan-900/80 text-cyan-200 px-2.5 py-1 rounded border border-cyan-700/60">
                  recall_source: sqlite_fallback
                </span>
              </div>
            )}

            {investigation.memory_status === 'empty' && (
              <div className="bg-slate-900 border border-blue-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm text-blue-200">
                <div className="flex items-center gap-3">
                  <Search className="w-6 h-6 text-blue-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-300">○ No Unique Prior Historical Match</h3>
                    <p className="text-xs text-blue-200/80">
                      Searched previous incidents but found no distinct historical prior precedents for this service/error signature.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-blue-950 text-blue-300 px-2.5 py-1 rounded border border-blue-800/60">
                  memory_status: empty
                </span>
              </div>
            )}

            {investigation.memory_status === 'unavailable' && (
              <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm text-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">⚠ Historical Memory Unavailable</h3>
                    <p className="text-xs text-amber-200/80">
                      This investigation was performed without Hindsight historical vector memory because Hindsight was unavailable or unconfigured.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-amber-900/80 text-amber-200 px-2.5 py-1 rounded border border-amber-700/60">
                  memory_status: unavailable
                </span>
              </div>
            )}

            {/* STEP 2 & 3: RECALLED HISTORICAL INCIDENT MEMORIES */}
            <div className="bg-slate-900 border border-purple-900/40 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/50">
                    STEP 2 & 3
                  </span>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" /> HISTORICAL INCIDENT MEMORIES & EVIDENCE
                  </h3>
                </div>
                <span className="text-xs text-purple-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-800 font-mono">
                  {investigation.similar_historical_incidents?.length > 0
                    ? `${investigation.similar_historical_incidents.length} Relevant Matches`
                    : investigation.memory_status === 'empty'
                    ? '0 Matches Found'
                    : 'Memory Unavailable'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investigation.similar_historical_incidents?.map((mem, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="font-mono text-xs text-purple-400 font-bold flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" /> {mem.incident_id || `MEMORY-${idx + 1}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                          {mem.source === 'sqlite_fallback' ? 'Database Fallback' : 'Hindsight Vector'}
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {mem.service || 'Service'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 font-mono bg-slate-900/80 p-2 rounded">
                      <strong className="text-slate-400 block text-[10px] uppercase">Error / Symptoms:</strong> {mem.error || mem.symptoms || mem.raw_text?.slice(0, 100)}
                    </p>

                    {mem.root_cause && (
                      <p className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-800/30 p-2 rounded">
                        <strong className="text-amber-400 block text-[10px] uppercase">Root Cause:</strong> {mem.root_cause}
                      </p>
                    )}

                    {mem.resolution && (
                      <p className="text-xs text-emerald-200/90 bg-emerald-950/20 border border-emerald-800/30 p-2 rounded">
                        <strong className="text-emerald-400 block text-[10px] uppercase">Resolution Steps:</strong> {mem.resolution}
                      </p>
                    )}

                    {mem.post_mortem && (
                      <p className="text-xs text-cyan-200/90 bg-cyan-950/20 border border-cyan-800/30 p-2 rounded">
                        <strong className="text-cyan-400 block text-[10px] uppercase">Post-mortem Takeaways:</strong> {mem.post_mortem}
                      </p>
                    )}

                    {mem.relevance && (
                      <p className="text-[11px] text-indigo-300/90 bg-indigo-950/30 border border-indigo-800/30 p-2 rounded italic">
                        <strong className="text-indigo-400 not-italic block text-[10px] uppercase">Why It Mattered / Relevance:</strong> {mem.relevance}
                      </p>
                    )}
                  </div>
                ))}

                {(!investigation.similar_historical_incidents || investigation.similar_historical_incidents.length === 0) && (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-950 rounded-lg border border-slate-800">
                    {investigation.memory_status === 'unavailable'
                      ? 'Historical memory bank was unavailable during this investigation.'
                      : 'No unique prior historical memories found in Hindsight or local database for this incident.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>

          {/* STEP 4: PREVIOUS ROOT CAUSES & RESOLUTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800/50">
                  STEP 4A
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">PREVIOUS ROOT CAUSES RECALLED</h4>
              </div>
              <div className="space-y-2">
                {investigation.previous_root_causes?.length > 0 ? (
                  investigation.previous_root_causes.map((rc, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-amber-200 leading-relaxed font-mono">
                      • {renderEvidenceItem(rc, 'rc')}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No prior distinct root cause records retrieved.</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
                  STEP 4B
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">PREVIOUS SUCCESSFUL RESOLUTIONS</h4>
              </div>
              <div className="space-y-2">
                {investigation.previous_resolutions?.length > 0 ? (
                  investigation.previous_resolutions.map((res, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-emerald-200 leading-relaxed font-mono">
                      ✓ {renderEvidenceItem(res, 'res')}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No prior distinct resolution records retrieved.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-emerald-400 animate-bounce" />
          </div>

          {/* STEP 5 & 6: GROQ ANALYSIS & RECOMMENDED ACTION */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50">
                  STEP 5 & 6
                </span>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" /> GROQ AI DIAGNOSIS & RECOMMENDED REMEDIATION
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold ${
                  investigation.analysis_status === 'success' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-300'
                }`}>
                  analysis: {investigation.analysis_status || 'success'}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  investigation.ai_analysis?.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  investigation.ai_analysis?.confidence === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  Confidence: {investigation.ai_analysis?.confidence || 'medium'}
                </span>
              </div>
            </div>

            {/* RECOMMENDED ACTION HIGHLIGHT BOX */}
            <div className="bg-indigo-950/80 border-2 border-indigo-500/50 rounded-xl p-5 shadow-inner space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> RECOMMENDED REMEDIATION ACTION
              </span>
              <p className="text-base font-bold text-white leading-relaxed">{investigation.recommended_action}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">Probable Root Cause</span>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-slate-200 leading-relaxed font-mono">
                  {investigation.ai_analysis?.probable_root_cause}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">AI Reasoning</span>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-slate-300 leading-relaxed">
                  {investigation.explanation}
                </div>
              </div>
            </div>

            {/* PROMINENT "WHY THIS RECOMMENDATION?" SECTION */}
            <div className="bg-slate-950 border border-indigo-900/60 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-indigo-400" /> Why this recommendation?
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {investigation.memory_status === 'unavailable' ? (
                  `Hindsight memory service was unavailable or unconfigured during this investigation. Analysis proceeded using current incident symptoms (${incident.symptoms}) and general SRE troubleshooting knowledge without historical vector memory context.`
                ) : investigation.memory_status === 'sqlite_fallback' ? (
                  `Hindsight vector memory was unconfigured or returned no direct vector matches. Groq AI grounded its reasoning in ${investigation.similar_historical_incidents?.length || 0} relevant resolved incidents retrieved directly from the database fallback.`
                ) : investigation.memory_status === 'empty' || investigation.similar_historical_incidents?.length === 0 ? (
                  `No unique prior historical memories were retrieved from Hindsight or database fallback for this incident query. Groq AI synthesized this recommendation based strictly on current incident symptoms (${incident.symptoms}) and general SRE/DevOps troubleshooting best practices.`
                ) : (
                  `This recommendation was synthesized by Groq AI by grounding its reasoning in ${investigation.similar_historical_incidents.length} unique, non-self historical incident memories recalled from Hindsight. MemoryOps matched observed symptoms (${incident.symptoms}) against past resolved outages to propose evidence-backed remediation steps.`
                )}
              </p>

              {/* Supporting Historical Memories Evidence List */}
              {investigation.ai_analysis?.supporting_historical_incidents?.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Supporting Historical Evidence
                  </span>
                  <div className="space-y-1.5">
                    {investigation.ai_analysis.supporting_historical_incidents.map((evidence, idx) => (
                      <div key={idx} className="bg-indigo-950/40 border border-indigo-800/40 p-2.5 rounded text-xs text-indigo-200 font-mono">
                        ✓ {typeof evidence === 'string' ? evidence : JSON.stringify(evidence)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Resolve Incident Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resolve Incident & Retain in Hindsight
            </h3>

            <p className="text-xs text-slate-400">
              Documenting the verified root cause, resolution steps, and post-mortem will retain this operational experience into Hindsight persistent memory.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Identified Root Cause</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Connection pool exhaustion due to session leak during traffic surge"
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Resolution Steps Taken <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Increased connection pool size from 20 to 100 and deployed hotfix for session leak"
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Post-Mortem Takeaways</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Connection pool threshold alerting at 80% capacity added to Prometheus metrics."
                  value={postMortemInput}
                  onChange={(e) => setPostMortemInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {resolving ? 'Resolving...' : 'Confirm & Retain Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
