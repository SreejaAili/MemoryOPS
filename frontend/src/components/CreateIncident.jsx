import React, { useState } from 'react';
import { PlusCircle, AlertTriangle, Check, ArrowLeft } from 'lucide-react';
import { createIncident } from '../api';

export default function CreateIncident({ onCreated, onCancel }) {
  const [service, setService] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('high');
  const [customId, setCustomId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service || !errorMsg || !symptoms) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        service,
        error: errorMsg,
        symptoms,
        severity,
        outcome: 'Investigating',
      };
      if (customId.trim()) payload.id = customId.trim();

      const created = await createIncident(payload);
      onCreated(created);
    } catch (err) {
      setFormError(err.message || 'Failed to create incident');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-lg space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-400" /> Declare New Incident
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Initiate a new active incident to trigger automated Hindsight recall and Groq AI root cause analysis.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>

      {formError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1.5">
            Service Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Payment API, Auth Service, Redis Cluster"
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1.5">
            Primary Error / Exception <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Database connection timeout, Redis OOM command not allowed"
            value={errorMsg}
            onChange={(e) => setErrorMsg(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1.5">
            Observable Symptoms & Impact <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. HTTP 504 Gateway Timeouts on /v1/charge endpoint, elevated API latency, customer impact"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Severity Level</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="low">Low - Minor Non-critical Impact</option>
              <option value="medium">Medium - Moderate Service Degradation</option>
              <option value="high">High - Critical Path Impaired</option>
              <option value="critical">Critical - Complete Service Outage</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Custom Incident ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. INC-105 (Auto-generated if empty)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Declaring...' : 'Declare & Start AI Investigation'}
          </button>
        </div>
      </form>
    </div>
  );
}
