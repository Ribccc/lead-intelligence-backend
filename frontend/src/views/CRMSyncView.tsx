import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CRMService } from '../services/crm.service';
import { Integration } from '../api/types';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const CRMSyncView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const data = await CRMService.listIntegrations(defaultWorkspaceId);
      setIntegrations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load CRM integration configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!defaultWorkspaceId) return;
    fetchIntegrations();
  }, [defaultWorkspaceId]);

  const handleSync = async (integrationId: string) => {
    try {
      setSyncingId(integrationId);
      const res = await CRMService.triggerSync(integrationId);
      alert(`${res.message} Sync operations successfully triggered.`);
      // Refresh list to update database sync numbers
      fetchIntegrations();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger synchronization.');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="CRM Synchronization Hub" />

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              ⚠️ System Error: {error}
            </div>
          )}

          {/* Intro info panel */}
          <div className="bg-surface border border-neutral-200/50 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#0F172A] tracking-tight mb-1">CRM Sync Controller</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Enable automated data sync streams or trigger dynamic pipeline updates to Salesforce and HubSpot CRM accounts. Sync leads automatically based on qualification events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-2 text-center py-20 text-slate-400 text-xs font-semibold">
                Loading CRM configurations...
              </div>
            ) : integrations.length === 0 ? (
              <div className="col-span-2 text-center py-20 text-slate-400 text-xs font-semibold">
                No integrations found. Configure them inside prisma seeder.
              </div>
            ) : (
              integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-surface border border-neutral-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Platform logo header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-sm text-primary shadow-sm shrink-0">
                          {integration.provider.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{integration.provider}</h3>
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5 border ${
                            integration.isActive
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {integration.isActive ? 'Connected & Active' : 'Disconnected'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          integration.syncStatus === 'SUCCESS' ? 'bg-emerald-500 shadow-sm' : 'bg-red-500'
                        }`} />
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{integration.syncStatus}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs font-semibold font-mono text-slate-500">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase leading-none">RECORDS SYNCED</p>
                        <p className="text-slate-800 font-extrabold mt-1 text-sm">{integration.recordsSynced.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase leading-none">LAST SYNCHRONIZED</p>
                        <p className="text-slate-800 font-extrabold mt-1">
                          {integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleTimeString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => alert(`Connection parameters for ${integration.provider} are controlled in database parameters.`)}
                      className="flex-1 py-2 border border-neutral-200 hover:border-neutral-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-neutral-50 transition-all select-none text-center"
                    >
                      Config Link
                    </button>
                    
                    <button
                      disabled={!integration.isActive || syncingId === integration.id}
                      onClick={() => handleSync(integration.id)}
                      className="flex-1 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {syncingId === integration.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white"></div>
                          Syncing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">sync</span>
                          Sync Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
export default CRMSyncView;
