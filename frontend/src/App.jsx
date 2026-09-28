import React, { useState, useEffect } from 'react';
import { Activity, Brain, PlusCircle, LayoutDashboard, Search, Cpu } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CreateIncident from './components/CreateIncident';
import IncidentInvestigation from './components/IncidentInvestigation';
import MemoryExplorer from './components/MemoryExplorer';
import { fetchIncidents } from './api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      if (data.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              MEMORYOPS <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">v0.1.0</span>
            </h1>
            <p className="text-[11px] text-slate-400">AI Incident Response That Learns From Every Production Incident</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              currentPage === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </button>

          <button
            onClick={() => setCurrentPage('create')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              currentPage === 'create'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" /> Create Incident
          </button>

          <button
            onClick={() => setCurrentPage('investigate')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              currentPage === 'investigate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Investigation
          </button>

          <button
            onClick={() => setCurrentPage('memory')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              currentPage === 'memory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> Memory
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {currentPage === 'dashboard' && (
          <Dashboard
            incidents={incidents}
            loading={loading}
            error={error}
            onNavigate={(page) => setCurrentPage(page)}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        )}

        {currentPage === 'create' && (
          <CreateIncident
            onCreated={(newInc) => {
              loadIncidents();
              setSelectedIncidentId(newInc.id);
              setCurrentPage('investigate');
            }}
            onCancel={() => setCurrentPage('dashboard')}
          />
        )}

        {currentPage === 'investigate' && (
          <IncidentInvestigation
            incidentId={selectedIncidentId}
            incidents={incidents}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        )}

        {currentPage === 'memory' && <MemoryExplorer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-3.5 text-center text-xs text-slate-500">
        MemoryOps &copy; {new Date().getFullYear()} — SRE & DevOps Incident Management Platform (FastAPI + Hindsight + Groq)
      </footer>
    </div>
  );
}
