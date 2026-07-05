import { useState, useEffect } from 'react';
import apiClient from '../api/client';

const STORAGE_KEY = 'lead_intelligence_workspace_id';

// Cache it globally in memory to avoid repeated requests
let cachedWorkspaceId: string | null = null;

export function useWorkspaceId(): string {
  const [workspaceId, setWorkspaceId] = useState<string>(
    cachedWorkspaceId || localStorage.getItem(STORAGE_KEY) || ''
  );

  useEffect(() => {
    // If memory cache is set, we don't query again
    if (cachedWorkspaceId) {
      return;
    }

    apiClient.get<Array<{ id: string; name: string }>>('/workspaces')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const workspaces = res.data;
          const currentStored = localStorage.getItem(STORAGE_KEY);
          const exists = workspaces.some(w => w.id === currentStored);
          
          const activeId = exists && currentStored ? currentStored : workspaces[0].id;
          cachedWorkspaceId = activeId;
          localStorage.setItem(STORAGE_KEY, activeId);
          setWorkspaceId(activeId);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch workspace ID:', err.message);
      });
  }, []);

  return workspaceId;
}
