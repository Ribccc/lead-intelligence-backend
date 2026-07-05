import React, { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

export const LeadsView: React.FC = () => {
  const defaultWorkspaceId = useWorkspaceId();
  
  const {
    leads,
    selectedLead,
    outreachDraft,
    loading,
    detailsLoading,
    outreachLoading,
    filterStatus,
    searchTerm,
    setFilterStatus,
    setSearchTerm,
    selectLead,
    generateOutreachDraft
  } = useLeads(defaultWorkspaceId);

  const [showOutreachModal, setShowOutreachModal] = useState<boolean>(false);
  const [showContactsModal, setShowContactsModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectLead = (id: string) => {
    selectLead(id);
  };

  const handleGenerateOutreach = async (id: string) => {
    const draft = await generateOutreachDraft(id);
    if (draft) {
      setShowOutreachModal(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex select-none">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Leads Management Center" />

        <div className="flex-1 flex overflow-hidden pl-64">
          
          {/* Main Listings Column (3/4 layout) */}
          <main className="flex-1 overflow-y-auto p-8 pr-4 space-y-6">
            <div className="flex justify-between items-end mb-6 shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Enterprise Leads</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">Real-time intelligence from across 14M monitored signals</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex gap-3 items-center">
                {/* Export Buttons */}
                <div className="flex border border-neutral-200 rounded-lg overflow-hidden bg-surface shadow-sm h-9">
                  <button
                    onClick={() => window.open(`http://localhost:5000/api/v1/leads/export/csv?workspaceId=${defaultWorkspaceId}`, '_blank')}
                    className="px-2.5 hover:bg-neutral-50 border-r border-neutral-200 text-[10px] font-bold text-neutral-600 transition-colors flex items-center gap-1"
                    title="Export to CSV"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    CSV
                  </button>
                  <button
                    onClick={() => window.open(`http://localhost:5000/api/v1/leads/export/excel?workspaceId=${defaultWorkspaceId}`, '_blank')}
                    className="px-2.5 hover:bg-neutral-50 border-r border-neutral-200 text-[10px] font-bold text-neutral-600 transition-colors flex items-center gap-1"
                    title="Export to Excel"
                  >
                    <span className="material-symbols-outlined text-[14px]">table_view</span>
                    Excel
                  </button>
                  <button
                    onClick={() => window.open(`http://localhost:5000/api/v1/leads/export/json?workspaceId=${defaultWorkspaceId}`, '_blank')}
                    className="px-2.5 hover:bg-neutral-50 text-[10px] font-bold text-neutral-600 transition-colors flex items-center gap-1"
                    title="Export to JSON"
                  >
                    <span className="material-symbols-outlined text-[14px]">code</span>
                    JSON
                  </button>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search company name..."
                    className="w-56 h-9 bg-surface border border-neutral-200 rounded-lg pl-9 pr-4 text-xs text-neutral-800 focus:outline-none focus:border-primary transition-all font-semibold shadow-sm"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 bg-surface border border-neutral-200 rounded-lg px-3 text-xs text-neutral-500 font-bold focus:outline-none focus:border-primary shadow-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="NURTURE">Nurture</option>
                  <option value="DISCOVERED">Discovered</option>
                </select>
              </div>
            </div>

            {/* Leads Table styled light */}
            <div className="bg-surface border border-neutral-200/50 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200/50">
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Industry</th>
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest text-center">AI Score</th>
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest text-center">Employees</th>
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Hiring status</th>
                    <th className="px-6 py-4 text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Funding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-neutral-400 text-xs font-semibold">Loading leads...</td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-neutral-400 text-xs font-semibold">No matching leads found</td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => handleSelectLead(lead.id)}
                        className={`hover:bg-neutral-50 transition-colors cursor-pointer ${
                          selectedLead?.id === lead.id ? 'bg-[#EFF6FF]/60 hover:bg-[#EFF6FF]' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[10px] text-primary shadow-sm">
                              {lead.companyName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-extrabold text-[#0F172A] text-xs">{lead.companyName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-neutral-600">{lead.sector}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 font-mono font-bold text-[10px] rounded-full border ${
                            lead.aiScore >= 90
                              ? 'bg-[#E8F8F0] text-status-success border-[#10B981]/20'
                              : 'bg-amber-50 text-amber-500 border-amber-200'
                          }`}>
                            {lead.aiScore}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-neutral-400">{lead.employees.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                            lead.hiringStatus === 'HIGH_VOLUME' ? 'bg-[#EFF6FF] text-[#0070f3] border border-blue-100' :
                            lead.hiringStatus === 'STABLE' ? 'bg-neutral-100 text-neutral-500 border border-neutral-200' : 'bg-red-50 text-red-500 border border-red-100'
                          }`}>
                            {lead.hiringStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-neutral-400">{lead.funding || 'Unknown'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>

          {/* Detailed Sidebar Panel styled light */}
          <aside className="w-[320px] bg-surface border-l border-neutral-200/50 p-6 overflow-y-auto flex flex-col shrink-0">
            {detailsLoading ? (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs font-semibold">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-2"></div>
                Analyzing signals...
              </div>
            ) : !selectedLead ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                <span className="material-symbols-outlined text-neutral-300 text-3xl mb-3">account_box</span>
                <p className="text-xs text-neutral-400 font-semibold">Select a company from the directory to inspect AI qualification analysis and trigger outreach.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* SVG Probability Ring Dial */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="none" r="42" stroke="rgba(0,0,0,0.02)" strokeWidth="6" />
                      <circle
                        cx="50"
                        cy="50"
                        fill="none"
                        r="42"
                        stroke="url(#sidebar-grad-light)"
                        strokeDasharray="263.9"
                        strokeDashoffset={263.9 - (263.9 * selectedLead.conversionProb) / 100}
                        strokeLinecap="round"
                        strokeWidth="6"
                      />
                      <defs>
                        <linearGradient id="sidebar-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0070f3" />
                          <stop offset="100%" stopColor="#7928ca" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                      <span className="font-extrabold text-xl text-[#0F172A] font-mono">{selectedLead.conversionProb}%</span>
                      <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">PROBABILITY</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-[#0F172A]">{selectedLead.companyName}</h3>
                  {selectedLead.website && (
                    <a
                      href={selectedLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline font-bold mt-1 inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[10px]">language</span>
                      {selectedLead.website}
                    </a>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 w-full text-left bg-neutral-50 border border-neutral-200/50 rounded-xl p-3 text-[10px] text-[#0F172A] font-medium leading-normal shadow-sm">
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">AI Score</span>
                      <span className="font-mono text-xs font-bold text-violet-600">{selectedLead.aiScore} / 100</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Employees</span>
                      <span className="font-mono text-xs font-bold">{(selectedLead.employees || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Confidence</span>
                      <span className="font-mono text-xs font-bold text-teal-600">
                        {selectedLead.confidenceScore !== undefined && selectedLead.confidenceScore > 0 
                          ? `${Math.round(selectedLead.confidenceScore)}%` 
                          : 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Hiring Status</span>
                      <span className="font-mono text-xs font-bold">{selectedLead.hiringStatus || 'None'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">HQ Location</span>
                      <span className="font-mono text-xs font-bold truncate block" title={`${selectedLead.city || 'Unknown'}, ${selectedLead.state || 'Unknown'}, ${selectedLead.country || 'Unknown'}`}>
                        {`${selectedLead.city || 'Unknown'}, ${selectedLead.state || 'Unknown'}, ${selectedLead.country || 'Unknown'}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Revenue Range</span>
                      <span className="font-mono text-xs font-bold truncate block" title={selectedLead.revenueRange || 'Unknown'}>{selectedLead.revenueRange || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Funding</span>
                      <span className="font-mono text-xs font-bold truncate block" title={selectedLead.funding || 'Unknown'}>{selectedLead.funding || 'Unknown'}</span>
                    </div>
                    {selectedLead.fullAddress && (
                      <div className="col-span-2 border-t border-neutral-200/50 pt-1.5 mt-0.5">
                        <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Full Address</span>
                        <span className="font-mono text-[9px] block text-neutral-600 leading-tight">
                          {selectedLead.fullAddress} {selectedLead.postalCode ? `(${selectedLead.postalCode})` : ''}
                        </span>
                      </div>
                    )}
                    {selectedLead.latitude !== undefined && selectedLead.latitude !== null && selectedLead.longitude !== undefined && selectedLead.longitude !== null && (
                      <div className="col-span-2 border-t border-neutral-200/50 pt-1.5 mt-0.5">
                        <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Geographic Coordinates</span>
                        <span className="font-mono text-[9px] block text-violet-600 font-bold">
                          {selectedLead.latitude.toFixed(6)}, {selectedLead.longitude.toFixed(6)}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2 border-t border-neutral-200/50 pt-1.5 mt-0.5">
                      <span className="text-[8px] font-extrabold text-neutral-400 block uppercase tracking-wide">Crawl Source Base</span>
                      <span className="font-mono text-[9px] truncate block text-neutral-500" title={selectedLead.discoverySource || selectedLead.website || 'Unknown'}>
                        {selectedLead.discoverySource ? `${selectedLead.discoverySource} (${selectedLead.website || 'Unknown'})` : (selectedLead.website || 'Unknown')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowContactsModal(true)}
                    className="w-full mt-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 rounded-lg text-[9px] font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs">contacts</span>
                    Open Full Contact Dossier
                  </button>
                </div>

                {/* AI Summary card */}
                {selectedLead.insights && selectedLead.insights.length > 0 && (
                  <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-violet-600">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">AI Intelligence Insight</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                      {selectedLead.insights[0].summary}
                    </p>
                  </div>
                )}

                {/* ICP Verification Checklist */}
                {selectedLead.reasoningPoints && selectedLead.reasoningPoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">ICP Verification Checklist</h4>
                    <ul className="space-y-2">
                      {selectedLead.reasoningPoints.map((pt) => (
                        <li key={pt.id} className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-status-success text-sm leading-none shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                          <span className="text-xs text-neutral-600 font-semibold">{pt.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Buyer Intent Indicators (Contact Intelligence Mode) */}
                {selectedLead.intentSignals && selectedLead.intentSignals.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest">Discovered Intelligence Cues</h4>
                    <div className="space-y-2">
                      {selectedLead.intentSignals.map((sig) => {
                        if (sig.signalType === 'Phone Number Found') {
                          return (
                            <div key={sig.id} className="p-2.5 bg-neutral-50 border border-neutral-200/50 rounded-lg space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center border-b border-neutral-200/50 pb-1">
                                <span className="text-xs text-neutral-600 font-extrabold">Phone Numbers</span>
                                <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-primary border border-blue-100">
                                  Found: {sig.volume}
                                </span>
                              </div>
                              {selectedLead.phones && selectedLead.phones.length > 0 ? (
                                <div className="space-y-1">
                                  {selectedLead.phones.slice(0, 3).map((ph) => (
                                    <div key={ph.id} className="flex justify-between items-center text-[10px] text-neutral-700 font-mono">
                                      <span className="select-all font-semibold">{ph.phone}</span>
                                      <button onClick={() => copyToClipboard(ph.phone)} className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded">
                                        <span className="material-symbols-outlined text-[10px]">content_copy</span>
                                      </button>
                                    </div>
                                  ))}
                                  {selectedLead.phones.length > 3 && (
                                    <div className="text-[8px] text-neutral-400 italic text-right">+{selectedLead.phones.length - 3} more in dossier</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-neutral-400 italic">No phone numbers saved.</div>
                              )}
                            </div>
                          );
                        }

                        if (sig.signalType === 'Contact Email Found') {
                          return (
                            <div key={sig.id} className="p-2.5 bg-neutral-50 border border-neutral-200/50 rounded-lg space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center border-b border-neutral-200/50 pb-1">
                                <span className="text-xs text-neutral-600 font-extrabold">Emails</span>
                                <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-primary border border-blue-100">
                                  Found: {sig.volume}
                                </span>
                              </div>
                              {selectedLead.emails && selectedLead.emails.length > 0 ? (
                                <div className="space-y-1">
                                  {selectedLead.emails.slice(0, 3).map((em) => (
                                    <div key={em.id} className="flex justify-between items-center text-[10px] text-neutral-700 font-mono">
                                      <span className="select-all font-semibold truncate max-w-[170px]" title={em.email}>{em.email}</span>
                                      <button onClick={() => copyToClipboard(em.email)} className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded">
                                        <span className="material-symbols-outlined text-[10px]">content_copy</span>
                                      </button>
                                    </div>
                                  ))}
                                  {selectedLead.emails.length > 3 && (
                                    <div className="text-[8px] text-neutral-400 italic text-right">+{selectedLead.emails.length - 3} more in dossier</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-neutral-400 italic">No emails saved.</div>
                              )}
                            </div>
                          );
                        }

                        if (sig.signalType === 'Social Media Links') {
                          return (
                            <div key={sig.id} className="p-2.5 bg-neutral-50 border border-neutral-200/50 rounded-lg space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center border-b border-neutral-200/50 pb-1">
                                <span className="text-xs text-neutral-600 font-extrabold">Social & Web Links</span>
                                <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-primary border border-blue-100">
                                  Found: {sig.volume}
                                </span>
                              </div>
                              {selectedLead.socialLinks && selectedLead.socialLinks.length > 0 ? (
                                <div className="space-y-1">
                                  {selectedLead.socialLinks.slice(0, 4).map((sl) => {
                                    let icon = 'link';
                                    let label = 'Link';
                                    if (sl.network === 'linkedin') { icon = 'share'; label = 'LinkedIn'; }
                                    else if (sl.network === 'twitter') { icon = 'alternate_email'; label = 'Twitter'; }
                                    else if (sl.network === 'facebook') { icon = 'thumb_up'; label = 'Facebook'; }
                                    else if (sl.network === 'contact_page') { icon = 'contact_mail'; label = 'Contact'; }
                                    else if (sl.network === 'about_page') { icon = 'info'; label = 'About'; }

                                    return (
                                      <div key={sl.id} className="flex justify-between items-center text-[10px] text-neutral-700 font-mono">
                                        <div className="flex items-center gap-1 max-w-[190px]">
                                          <span className="material-symbols-outlined text-[10px] text-primary shrink-0">{icon}</span>
                                          <a href={sl.socialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate" title={sl.socialUrl}>
                                            {label}
                                          </a>
                                        </div>
                                        <span className="text-[8px] text-neutral-400 font-mono shrink-0">{(sl.confidenceScore * 100).toFixed(0)}%</span>
                                      </div>
                                    );
                                  })}
                                  {selectedLead.socialLinks.length > 4 && (
                                    <div className="text-[8px] text-neutral-400 italic text-right">+{selectedLead.socialLinks.length - 4} more in dossier</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-neutral-400 italic">No social links saved.</div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div key={sig.id} className="flex justify-between items-center p-2.5 bg-neutral-50 border border-neutral-200/50 rounded-lg">
                            <span className="text-xs text-neutral-600 font-semibold">{sig.signalType}</span>
                            <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              sig.intensity === 'High' ? 'bg-[#EFF6FF] text-[#0070f3] border border-blue-100' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {sig.intensity} (+{sig.volume})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-4 border-t border-neutral-200/50 flex flex-col items-center">
                  <button
                    onClick={() => handleGenerateOutreach(selectedLead.id)}
                    disabled={outreachLoading}
                    className="w-full bg-gradient-to-r from-[#0070f3] to-[#7928ca] text-white py-3 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {outreachLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-1"></div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs">send</span>
                        Generate Dynamic Outreach
                      </>
                    )}
                  </button>
                  <span className="text-[9px] text-neutral-400 mt-2 text-center font-bold">Personalized instantly utilizing all intent cues</span>
                </div>

              </div>
            )}
          </aside>

        </div>
      </div>

      {/* Contacts Dossier Modal */}
      {showContactsModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[850px] bg-surface border border-neutral-200 rounded-2xl p-6 shadow-2xl relative select-text flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-neutral-200/50 pb-4 shrink-0">
              <div className="flex items-center gap-2 text-violet-600">
                <span className="material-symbols-outlined text-md">contact_mail</span>
                <h3 className="font-extrabold text-sm text-[#0F172A]">{selectedLead.companyName} — Discovered Contact Intelligence Dossier</h3>
              </div>
              <button
                onClick={() => setShowContactsModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 border border-neutral-200 hover:border-neutral-300 rounded-xl"
              >
                <span className="material-symbols-outlined text-sm leading-none font-bold">close</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-3 gap-6 overflow-y-auto pr-2 flex-1">
              
              {/* Emails Column */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-1 flex items-center gap-1.5 shrink-0">
                  <span className="material-symbols-outlined text-xs text-primary">mail</span> Discovered Emails
                </h4>
                {selectedLead.emails && selectedLead.emails.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLead.emails.map((e) => (
                      <div key={e.id} className="p-3 bg-neutral-50 border border-neutral-200/50 rounded-xl space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-800 select-all truncate max-w-[170px]" title={e.email}>{e.email}</span>
                          <button onClick={() => copyToClipboard(e.email)} className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded">
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                          </button>
                        </div>
                        <div className="text-[8px] text-neutral-400 font-mono space-y-0.5 leading-tight">
                          <div className="truncate" title={e.discoveryPage || e.sourceUrl}>Found on: {e.discoveryPage || e.sourceUrl}</div>
                          <div>Date: {new Date(e.crawlTimestamp).toLocaleString()}</div>
                          <div className="font-bold text-[#0070f3]">Confidence: {Math.round(e.confidenceScore * 100)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No emails discovered.</p>
                )}
              </div>

              {/* Phones Column */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-1 flex items-center gap-1.5 shrink-0">
                  <span className="material-symbols-outlined text-xs text-primary">phone</span> Discovered Phones
                </h4>
                {selectedLead.phones && selectedLead.phones.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLead.phones.map((p) => (
                      <div key={p.id} className="p-3 bg-neutral-50 border border-neutral-200/50 rounded-xl space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-800 select-all">{p.phone}</span>
                          <button onClick={() => copyToClipboard(p.phone)} className="p-0.5 text-neutral-400 hover:text-neutral-600 rounded">
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                          </button>
                        </div>
                        <div className="text-[8px] text-neutral-400 font-mono space-y-0.5 leading-tight">
                          <div className="truncate" title={p.discoveryPage || p.sourceUrl}>Found on: {p.discoveryPage || p.sourceUrl}</div>
                          <div>Date: {new Date(p.crawlTimestamp).toLocaleString()}</div>
                          <div className="font-bold text-[#0070f3]">Confidence: {Math.round(p.confidenceScore * 100)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No phone numbers discovered.</p>
                )}
              </div>

              {/* Social/Links Column */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-1 flex items-center gap-1.5 shrink-0">
                  <span className="material-symbols-outlined text-xs text-primary">share</span> Social & Target Pages
                </h4>
                {selectedLead.socialLinks && selectedLead.socialLinks.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLead.socialLinks.map((s) => {
                      let icon = 'link';
                      let networkLabel = 'Web Link';
                      if (s.network === 'linkedin') { icon = 'share'; networkLabel = 'LinkedIn'; }
                      else if (s.network === 'twitter') { icon = 'alternate_email'; networkLabel = 'Twitter/X'; }
                      else if (s.network === 'facebook') { icon = 'thumb_up'; networkLabel = 'Facebook'; }
                      else if (s.network === 'contact_page') { icon = 'contact_mail'; networkLabel = 'Contact Page'; }
                      else if (s.network === 'about_page') { icon = 'info'; networkLabel = 'About Page'; }

                      return (
                        <div key={s.id} className="p-3 bg-neutral-50 border border-neutral-200/50 rounded-xl space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 text-[#0F172A]">
                              <span className="material-symbols-outlined text-xs text-primary">{icon}</span>
                              <span className="text-[10px] font-bold">{networkLabel}</span>
                            </div>
                            <a href={s.socialUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-bold">
                              Visit
                            </a>
                          </div>
                          <div className="text-[8px] text-neutral-400 font-mono space-y-0.5 leading-tight">
                            <div className="truncate font-semibold text-neutral-600" title={s.socialUrl}>{s.socialUrl}</div>
                            <div className="truncate" title={s.discoveryPage || s.sourceUrl}>Found on: {s.discoveryPage || s.sourceUrl}</div>
                            <div>Date: {new Date(s.crawlTimestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No social/web links discovered.</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-neutral-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowContactsModal(false)}
                className="px-6 h-10 bg-primary text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Outreach Overlay modal */}
      {showOutreachModal && outreachDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[550px] bg-surface border border-neutral-200 rounded-2xl p-6 shadow-2xl relative select-text">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-violet-600">
                <span className="material-symbols-outlined text-md" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Dynamic AI Email Template</h3>
              </div>
              <button
                onClick={() => setShowOutreachModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 border border-neutral-200 hover:border-neutral-300 rounded-xl"
              >
                <span className="material-symbols-outlined text-sm leading-none font-bold">close</span>
              </button>
            </div>

            {/* Parameters overview */}
            <div className="flex gap-4 p-3 bg-neutral-50 border border-neutral-200 rounded-xl mb-4 text-[10px] text-neutral-500 font-mono font-bold">
              <div>
                <span>Target: </span><span className="text-[#0F172A] font-black">{outreachDraft.companyName}</span>
              </div>
              <div>
                <span>Engine: </span><span className="text-primary font-black">{outreachDraft.modelUsed}</span>
              </div>
              <div>
                <span>Cues Synthesized: </span><span className="text-violet-600 font-black">{outreachDraft.signalsSynthesizedCount}</span>
              </div>
            </div>

            {/* Email draft card */}
            <div className="space-y-3.5 mb-6">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">SUBJECT LINE</span>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold font-mono text-neutral-800">
                  {outreachDraft.subject}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">EMAIL BODY</span>
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs leading-relaxed font-mono text-neutral-600 h-64 overflow-y-auto whitespace-pre-line custom-scrollbar">
                  {outreachDraft.emailDraft}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setShowOutreachModal(false)}
                className="flex-1 h-10 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-all active:scale-95"
              >
                Close Template
              </button>
              
              <button
                onClick={() => copyToClipboard(`${outreachDraft.subject}\n\n${outreachDraft.emailDraft}`)}
                className="flex-1 h-10 bg-primary text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default LeadsView;
