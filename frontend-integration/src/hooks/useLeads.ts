import { useState, useEffect, useCallback } from 'react';
import { LeadsService } from '../services/leads.service';
import { Lead, OutreachDraft } from '../api/types';

export function useLeads(workspaceId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraft | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [outreachLoading, setOutreachLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await LeadsService.listLeads({
        workspaceId,
        status: filterStatus || undefined,
        search: searchTerm || undefined,
      });
      setLeads(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error fetching leads list');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterStatus, searchTerm]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const selectLead = async (id: string) => {
    setDetailsLoading(true);
    setOutreachDraft(null);
    try {
      const leadDetails = await LeadsService.getLeadDetails(id);
      setSelectedLead(leadDetails);
    } catch (err: any) {
      console.error('Error fetching lead details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const generateOutreachDraft = async (id: string) => {
    setOutreachLoading(true);
    try {
      const draft = await LeadsService.generateOutreach(id);
      setOutreachDraft(draft);
      return draft;
    } catch (err: any) {
      console.error('Error generating personalized email draft:', err);
      return null;
    } finally {
      setOutreachLoading(false);
    }
  };

  return {
    leads,
    selectedLead,
    outreachDraft,
    loading,
    detailsLoading,
    outreachLoading,
    error,
    filterStatus,
    searchTerm,
    setFilterStatus,
    setSearchTerm,
    refreshLeads: fetchLeads,
    selectLead,
    generateOutreachDraft
  };
}
