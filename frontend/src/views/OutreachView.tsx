import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { OutreachService, CampaignDetailsResponse } from '../services/outreach.service';
import { Campaign, StepType } from '../api/types';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const OutreachView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetailsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New step creation state
  const [newStepType, setNewStepType] = useState<StepType>('EMAIL');
  const [newStepName, setNewStepName] = useState<string>('');
  const [newStepSubject, setNewStepSubject] = useState<string>('');
  const [newStepBody, setNewStepBody] = useState<string>('');

  const fetchCampaigns = async () => {
    if (!defaultWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const list = await OutreachService.listCampaigns(defaultWorkspaceId);
      setCampaigns(list);
      if (list.length > 0) {
        // Default select first campaign if none selected
        if (!selectedCampaignId) {
          setSelectedCampaignId(list[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve active campaigns.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetails = async (id: string) => {
    try {
      const details = await OutreachService.getCampaignDetails(id);
      setCampaignDetails(details);
    } catch (err: any) {
      console.error('Failed to retrieve campaign details:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [defaultWorkspaceId]);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignDetails(selectedCampaignId);
    } else {
      setCampaignDetails(null);
    }
  }, [selectedCampaignId]);

  const handleToggleCampaign = async () => {
    if (!campaignDetails) return;
    try {
      const res = await OutreachService.toggleCampaign(campaignDetails.id);
      alert(res.message);
      // Refresh details and list
      fetchCampaignDetails(campaignDetails.id);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle campaign status.');
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignDetails) return;
    try {
      const currentSteps = campaignDetails.steps || [];
      const newStepIndex = currentSteps.length + 1;
      
      const configObj: any = {};
      if (newStepType === 'EMAIL') {
        configObj.subject = newStepSubject || 'Tailored Intelligence Suite';
        configObj.body_template = newStepBody || 'Hi {{contactName}},\n\nI wanted to reach out regarding...';
      } else if (newStepType === 'LINKEDIN_CONNECT') {
        configObj.message_template = newStepBody || 'Hi {{contactName}}, would love to connect.';
      }

      const updatedSteps = [
        ...currentSteps.map(s => ({
          stepIndex: s.stepIndex,
          type: s.type,
          name: s.name,
          config: s.config,
        })),
        {
          stepIndex: newStepIndex,
          type: newStepType,
          name: newStepName || `Step ${newStepIndex}: ${newStepType.replace('_', ' ')}`,
          config: configObj,
        }
      ];

      await OutreachService.saveCampaignSteps(campaignDetails.id, updatedSteps);
      alert('New step added successfully!');
      
      // Reset inputs
      setNewStepName('');
      setNewStepSubject('');
      setNewStepBody('');

      // Refresh
      fetchCampaignDetails(campaignDetails.id);
    } catch (err: any) {
      alert(err.message || 'Failed to append automation step.');
    }
  };

  const activeCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaignDetails;

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Outreach Automation" />

        <main className="pl-64 flex-1 p-8 space-y-6 max-w-[1400px] mx-auto w-full">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
              ⚠️ System Error: {error}
            </div>
          )}

          {/* Campaign Selection Row */}
          <div className="bg-surface border border-neutral-200/50 p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Campaign Sequence</label>
              {loading ? (
                <span className="text-xs text-slate-400">Loading campaigns...</span>
              ) : (
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="bg-slate-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none min-w-[280px] hover:border-slate-300 transition-colors"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.isActive ? 'Active' : 'Paused'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {campaignDetails && (
              <button
                onClick={handleToggleCampaign}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 shadow-sm ${
                  campaignDetails.isActive
                    ? 'bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {campaignDetails.isActive ? 'pause_circle' : 'play_circle'}
                </span>
                {campaignDetails.isActive ? 'Pause Sequence' : 'Activate Sequence'}
              </button>
            )}
          </div>

          {/* Stats row */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="ai-glow-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Outreach</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {activeCampaign ? activeCampaign.totalOutreach.toLocaleString() : '0'}
                </span>
                <span className="text-emerald-600 text-xs font-bold flex items-center mb-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm leading-none mr-0.5">trending_up</span> 8%
                </span>
              </div>
            </div>

            <div className="ai-glow-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Open Rate</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {activeCampaign ? activeCampaign.openRate.toFixed(1) + '%' : '0.0%'}
                </span>
                <span className="text-emerald-600 text-xs font-bold flex items-center mb-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm leading-none mr-0.5">trending_up</span> 12%
                </span>
              </div>
            </div>

            <div className="ai-glow-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reply Rate</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {activeCampaign ? activeCampaign.replyRate.toFixed(1) + '%' : '0.0%'}
                </span>
                <span className="text-slate-400 text-xs font-bold flex items-center mb-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm leading-none mr-0.5">remove</span> 0%
                </span>
              </div>
            </div>

            <div className="ai-glow-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AI Efficiency</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {activeCampaign ? Math.round((activeCampaign.openRate + activeCampaign.replyRate * 2) / 1.1) + '/100' : '92/100'}
                </span>
                <span className="text-emerald-600 text-xs font-bold flex items-center mb-0.5 font-mono">
                  <span className="material-symbols-outlined text-sm leading-none mr-0.5">trending_up</span> 4%
                </span>
              </div>
            </div>
          </section>

          {/* Workflow Sequence editor */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Visual steps sequence chains (3/4 layout) */}
            <div className="lg:col-span-3 space-y-6 relative pl-6">
              
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-6 bottom-6 border-l border-dashed border-slate-200 z-0" />

              {/* Trigger node card */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
                  <span className="material-symbols-outlined font-bold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <div className="flex-1 bg-surface border border-neutral-200/50 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-xs text-slate-800">Trigger: High Intent Signal</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-500">Entry Condition</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Enters sequence when a lead is qualified by scoring thresholds and intent parameters generated in the crawler pipeline.
                  </p>
                </div>
              </div>

              {/* Dynamic steps rendered from details */}
              {campaignDetails && campaignDetails.steps && campaignDetails.steps.length > 0 ? (
                campaignDetails.steps.map((step) => {
                  const isEmail = step.type === 'EMAIL';
                  const configObj = step.config || {};
                  return (
                    <div key={step.id} className="relative z-10 flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                        isEmail
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-violet-50 text-violet-600 border-violet-100'
                      }`}>
                        <span className="material-symbols-outlined font-bold text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {isEmail ? 'mail' : 'group_add'}
                        </span>
                      </div>
                      <div className="flex-1 bg-surface border border-neutral-200/50 p-5 rounded-2xl shadow-sm hover:border-violet-200/60 hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs text-slate-800">{step.name}</h3>
                            <span className="bg-gradient-to-r from-primary to-ai-purple text-[8px] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              {step.type}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {isEmail ? (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 leading-snug">
                              <span className="text-blue-600 font-bold">SUBJECT: </span> {configObj.subject || 'Follow Up'}<br /><br />
                              {configObj.body_template || 'Hi Lead, details...'}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-600 leading-snug">
                              <span className="text-violet-600 font-bold">LINKEDIN MSG: </span> {configObj.message_template || 'Connect message...'}
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">schedule</span> Run automatically
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="relative z-10 pl-14 py-4 text-xs text-slate-400 font-bold italic">
                  No execution steps defined in this campaign sequence.
                </div>
              )}

              {/* Add next step Form */}
              {campaignDetails && (
                <div className="relative z-10 pl-14 bg-surface border border-neutral-200/50 p-5 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Add Next Automation Step</h4>
                  <form onSubmit={handleAddStep} className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Step Type</label>
                      <select
                        value={newStepType}
                        onChange={(e) => setNewStepType(e.target.value as StepType)}
                        className="bg-slate-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none w-full font-bold"
                      >
                        <option value="EMAIL">Email</option>
                        <option value="LINKEDIN_CONNECT">LinkedIn Connection Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Step Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Step 3: Value Follow-up"
                        value={newStepName}
                        onChange={(e) => setNewStepName(e.target.value)}
                        className="bg-slate-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none w-full font-semibold"
                      />
                    </div>

                    {newStepType === 'EMAIL' && (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Subject Line</label>
                        <input
                          type="text"
                          placeholder="e.g. Scaling data pipelines with AI"
                          value={newStepSubject}
                          onChange={(e) => setNewStepSubject(e.target.value)}
                          className="bg-slate-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none w-full font-semibold"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">
                        {newStepType === 'EMAIL' ? 'Email Body Template' : 'Connection Message Template'}
                      </label>
                      <textarea
                        rows={4}
                        placeholder={newStepType === 'EMAIL' ? 'Use {{contactName}} or {{companyName}} placeholders...' : 'Message template...'}
                        value={newStepBody}
                        onChange={(e) => setNewStepBody(e.target.value)}
                        className="bg-slate-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none w-full font-mono text-[10px]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Save Step
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* Preview & Campaign Health sidebars (1/4 layout) */}
            <aside className="space-y-6">
              
              {/* Live Preview card */}
              <div className="bg-surface border border-neutral-200/50 p-5 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2 border-b border-neutral-100 pb-3 leading-none">
                  <span className="material-symbols-outlined text-blue-500 text-md">visibility</span>
                  Live Preview
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                    <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 leading-none">Target Prospect</p>
                      <p className="text-[9px] text-slate-400 mt-1">AI Qualified Contact</p>
                    </div>
                  </div>
                  
                  {campaignDetails && campaignDetails.steps && campaignDetails.steps.length > 0 ? (
                    (() => {
                      const firstStep = campaignDetails.steps[0];
                      const isEmail = firstStep.type === 'EMAIL';
                      const configObj = firstStep.config || {};
                      
                      return (
                        <>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[9px] text-slate-600 leading-normal">
                            <span className="text-blue-600 font-bold">Step 1 Preview:</span>
                            <p className="mt-1">
                              {isEmail 
                                ? (configObj.body_template || 'Hi Lead...').replace('{{contactName}}', 'Sarah Jenkins').replace('{{companyName}}', 'Stripe')
                                : (configObj.message_template || 'Hi...').replace('{{contactName}}', 'Sarah Jenkins')
                              }
                            </p>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-[9px] text-slate-400 italic">Add steps to see a preview.</p>
                  )}
                </div>
              </div>

              {/* Campaign Health parameters */}
              {activeCampaign && (
                <div className="bg-surface border border-neutral-200/50 p-5 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-bold text-xs text-slate-800 leading-none">Campaign Health</h4>
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono text-slate-500">
                        <span>BOUNCE RATE</span>
                        <span className="text-emerald-600 font-semibold">{activeCampaign.bounceRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${activeCampaign.bounceRate * 10}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono text-slate-500">
                        <span>SPAM RISK</span>
                        <span className="text-emerald-600 font-semibold">{activeCampaign.spamRisk}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono text-slate-500">
                        <span>CREDITS USED</span>
                        <span className="text-slate-800">{activeCampaign.creditsUsed.toLocaleString()} / {activeCampaign.creditsTotal.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(activeCampaign.creditsUsed / activeCampaign.creditsTotal) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Campaign Optimizations advice card */}
              <div className="bg-gradient-to-br from-primary to-ai-purple p-5 rounded-2xl shadow-md text-white space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-md animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <h4 className="font-black text-xs">AI Optimization Advice</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-white/90 font-medium">
                  Our neural engine recommends scheduling Step 2 (LinkedIn connect) *after* the email subject is opened, boosting acceptance by <span className="underline font-bold">14%</span>.
                </p>
                <button
                  onClick={() => alert('Optimization advice applied to active sequences!')}
                  className="w-full bg-white text-blue-600 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg transition-all active:scale-95"
                >
                  Apply Suggestion
                </button>
              </div>

            </aside>

          </div>
        </main>
      </div>
    </div>
  );
};

export default OutreachView;
