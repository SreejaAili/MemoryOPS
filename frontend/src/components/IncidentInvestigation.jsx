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
  HelpCircle
} from 'lucide-react';
import { fetchIncidentById, analyzeIncident, resolveIncident } from '../api';

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
  const [resolving, setResolving] = useState(false);

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
        outcome: 'Resolved',
      });
      setIncident(updated);
      setShowResolveModal(false);
      setRootCauseInput('');
      setResolutionInput('');
      loadAndAnalyze(selectedId);
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    } finally {
      setResolving(false);
    }
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 w-full md:w-80"
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
          {/* Explicit Pipeline Banner */}
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
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-indigo-400 animate-bounce" />
          </div>

          {/* STEP 2 & 3: HINDSIGHT RECALL & SIMILAR HISTORICAL INCIDENTS */}
          <div className="bg-slate-900 border border-purple-900/40 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/50">
                  STEP 2 & 3
                </span>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" /> HINDSIGHT RECALL & SIMILAR HISTORICAL INCIDENTS
                </h3>
              </div>
              <span className="text-xs text-purple-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-800 font-mono">
                {investigation.recall_status === 'failed' || investigation.recall_source === 'hindsight_error' || investigation.recall_source === 'sqlite_fallback'
                  ? 'Hindsight Offline / Service Failure'
                  : investigation.recall_status === 'empty' || investigation.similar_historical_incidents?.length === 0
                  ? '0 Historical Memories Recalled'
                  : `${investigation.similar_historical_incidents?.length || 0} Historical Memories Recalled`}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {investigation.recall_status === 'failed' || investigation.recall_source === 'hindsight_error' || investigation.recall_source === 'sqlite_fallback'
                ? 'Hindsight memory service was unconfigured or encountered an API/network error during recall.'
                : investigation.recall_status === 'empty' || investigation.similar_historical_incidents?.length === 0
                ? 'Hindsight memory recall completed successfully, but no matching past incident memories were found for this query.'
                : 'Hindsight uses semantic vector search across persistent memory banks to retrieve relevant past incidents even when wording is not identical.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investigation.similar_historical_incidents?.map((mem, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-mono text-xs text-purple-400 font-bold">
                      {mem.incident_id || `MEMORY-${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{mem.service || 'Historical Service'}</span>
                  </div>

                  <p className="text-xs text-slate-200 font-mono bg-slate-900 p-2 rounded">
                    <strong className="text-slate-400 block text-[10px] uppercase">Error:</strong> {mem.error || mem.raw_text?.slice(0, 100)}
                  </p>

                  {mem.root_cause && (
                    <p className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-800/30 p-2 rounded">
                      <strong className="text-amber-400 block text-[10px] uppercase">Previous Root Cause:</strong> {mem.root_cause}
                    </p>
                  )}

                  {mem.resolution && (
                    <p className="text-xs text-emerald-200/90 bg-emerald-950/20 border border-emerald-800/30 p-2 rounded">
                      <strong className="text-emerald-400 block text-[10px] uppercase">Previous Successful Resolution:</strong> {mem.resolution}
                    </p>
                  )}
                </div>
              ))}

              {investigation.similar_historical_incidents?.length === 0 && (
                <div className="col-span-2 py-8 text-center text-xs text-slate-500 bg-slate-950 rounded-lg border border-slate-800">
                  No matching historical memories found in Hindsight for this incident query.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-purple-400 animate-bounce" />
          </div>

          {/* STEP 4: PREVIOUS ROOT CAUSE & PREVIOUS SUCCESSFUL RESOLUTION */}
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
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-amber-200 leading-relaxed">
                      • {rc}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No prior root cause records.</p>
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
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-emerald-200 leading-relaxed">
                      ✓ {res}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No prior resolution records.</p>
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
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                investigation.ai_analysis?.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                investigation.ai_analysis?.confidence === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                Confidence: {investigation.ai_analysis?.confidence || 'medium'}
              </span>
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
                {investigation.recall_status === 'failed' || investigation.recall_source === 'hindsight_error' || investigation.recall_source === 'sqlite_fallback' ? (
                  `Hindsight memory service was unavailable or unconfigured during this investigation. Analysis proceeded using current incident symptoms (${incident.symptoms}) and general SRE troubleshooting knowledge without historical vector memory context.`
                ) : investigation.recall_status === 'empty' || investigation.similar_historical_incidents?.length === 0 ? (
                  `No matching historical memories were retrieved from Hindsight for this incident query. Groq AI synthesized this recommendation based strictly on current incident symptoms (${incident.symptoms}) and general SRE/DevOps troubleshooting best practices.`
                ) : (
                  `This recommendation was synthesized by Groq AI by grounding its reasoning in ${investigation.similar_historical_incidents.length} recalled historical incident memory${investigation.similar_historical_incidents.length > 1 ? 'ies' : ''} from Hindsight. MemoryOps matched observed symptoms (${incident.symptoms}) against past resolved outages to propose evidence-backed remediation steps.`
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
                        ✓ {evidence}
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
              Documenting the root cause and resolution will retain this experience into Hindsight persistent memory for future incidents to recall.
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
