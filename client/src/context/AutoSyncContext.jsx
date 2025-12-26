import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AutoSyncContext = createContext();

export function useAutoSync() {
  return useContext(AutoSyncContext);
}

export function AutoSyncProvider({ children }) {
  // Panel auto-sync state
  const [panelAutoSyncEnabled, setPanelAutoSyncEnabled] = useState(false);
  const [panelCountdown, setPanelCountdown] = useState(30);
  const [panelSyncing, setPanelSyncing] = useState(false);
  const [panelLastSyncTime, setPanelLastSyncTime] = useState(null);

  // Insight auto-sync state
  const [insightAutoSyncEnabled, setInsightAutoSyncEnabled] = useState(false);
  const [insightCountdown, setInsightCountdown] = useState(30);
  const [insightSyncing, setInsightSyncing] = useState(false);
  const [insightLastSyncTime, setInsightLastSyncTime] = useState(null);

  // Refs for intervals
  const panelSyncIntervalRef = useRef(null);
  const panelCountdownIntervalRef = useRef(null);
  const insightSyncIntervalRef = useRef(null);
  const insightCountdownIntervalRef = useRef(null);

  // Load saved preferences on mount
  useEffect(() => {
    const savedPanelAutoSync = localStorage.getItem('autoSyncEnabled');
    const savedInsightAutoSync = localStorage.getItem('insightAutoSyncEnabled');
    const savedPanelSyncTime = localStorage.getItem('lastSyncTime');
    const savedInsightSyncTime = localStorage.getItem('insightLastSyncTime');

    if (savedPanelAutoSync === 'true') {
      const apiKey = localStorage.getItem('apiKey');
      const panelApiUrl = localStorage.getItem('panelApiUrl');
      if (apiKey && panelApiUrl) {
        setPanelAutoSyncEnabled(true);
      }
    }

    if (savedInsightAutoSync === 'true') {
      const apiKey = localStorage.getItem('insightApiKey');
      const apiUrl = localStorage.getItem('insightApiUrl');
      if (apiKey && apiUrl) {
        setInsightAutoSyncEnabled(true);
      }
    }

    if (savedPanelSyncTime) {
      setPanelLastSyncTime(new Date(savedPanelSyncTime));
    }

    if (savedInsightSyncTime) {
      setInsightLastSyncTime(new Date(savedInsightSyncTime));
    }

    // Cleanup on unmount
    return () => {
      clearAllIntervals();
    };
  }, []);

  const clearAllIntervals = () => {
    if (panelSyncIntervalRef.current) clearInterval(panelSyncIntervalRef.current);
    if (panelCountdownIntervalRef.current) clearInterval(panelCountdownIntervalRef.current);
    if (insightSyncIntervalRef.current) clearInterval(insightSyncIntervalRef.current);
    if (insightCountdownIntervalRef.current) clearInterval(insightCountdownIntervalRef.current);
  };

  // Panel sync function
  const syncPanelData = useCallback(async (silent = false) => {
    const apiKey = localStorage.getItem('apiKey');
    const panelApiUrl = localStorage.getItem('panelApiUrl');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!apiKey || !panelApiUrl) return;

    setPanelSyncing(true);

    try {
      const response = await fetch(`${panelApiUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          userId: user.id,
          panelId: user.panelId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        setPanelLastSyncTime(now);
        localStorage.setItem('lastSyncTime', now.toISOString());

        if (data.respondents && data.respondents.length > 0) {
          const existingPanelists = JSON.parse(localStorage.getItem('panelists') || '[]');

          const newPanelists = data.respondents.map(r => ({
            id: r.id,
            hashedData: r.hashedData,
            proofStatus: r.proofStatus,
            verificationStatus: r.proofStatus === 'pending' ? 'unverified' : 'verified',
            attributesRequiringProof: r.attributesRequiringProof,
            attributeHashes: r.attributeHashes,
            syncedAt: r.syncedAt,
            emailSent: false,
            zkpQuery: r.zkpQuery,
            zkpResult: r.zkpResult || 'pending'
          }));

          const existingIds = new Set(existingPanelists.map(p => p.id));
          const uniqueNewPanelists = newPanelists.filter(p => !existingIds.has(p.id));
          const allPanelists = [...existingPanelists, ...uniqueNewPanelists];

          localStorage.setItem('panelists', JSON.stringify(allPanelists));
        }

        setPanelCountdown(30);
        return { success: true, count: data.dataPoints?.respondentsAdded || 0 };
      }
    } catch (error) {
      console.error('Panel sync error:', error);
    } finally {
      setPanelSyncing(false);
    }

    return { success: false };
  }, []);

  // Insight sync function
  const syncInsightData = useCallback(async (silent = false) => {
    const apiKey = localStorage.getItem('insightApiKey');
    const apiUrl = localStorage.getItem('insightApiUrl');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!apiKey || !apiUrl) return;

    setInsightSyncing(true);

    try {
      const response = await fetch(`${apiUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          userId: user.id,
          insightId: user.id,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        setInsightLastSyncTime(now);
        localStorage.setItem('insightLastSyncTime', now.toISOString());

        if (data.respondents && data.respondents.length > 0) {
          const existingPanelists = JSON.parse(localStorage.getItem('insightPanelists') || '[]');

          const newPanelists = data.respondents.map(r => ({
            id: r.id,
            hashedData: r.hashedData,
            proofStatus: r.proofStatus,
            verificationStatus: r.proofStatus === 'pending' ? 'unverified' : 'verified',
            attributesRequiringProof: r.attributesRequiringProof,
            attributeHashes: r.attributeHashes,
            syncedAt: r.syncedAt,
            emailSent: false,
            zkpQuery: r.zkpQuery,
            zkpResult: r.zkpResult || 'pending'
          }));

          const existingIds = new Set(existingPanelists.map(p => p.id));
          const uniqueNewPanelists = newPanelists.filter(p => !existingIds.has(p.id));
          const allPanelists = [...existingPanelists, ...uniqueNewPanelists];

          localStorage.setItem('insightPanelists', JSON.stringify(allPanelists));
        }

        setInsightCountdown(30);
        return { success: true, count: data.dataPoints?.respondentsAdded || 0 };
      }
    } catch (error) {
      console.error('Insight sync error:', error);
    } finally {
      setInsightSyncing(false);
    }

    return { success: false };
  }, []);

  // Panel auto-sync effect
  useEffect(() => {
    const apiKey = localStorage.getItem('apiKey');
    const panelApiUrl = localStorage.getItem('panelApiUrl');

    if (panelAutoSyncEnabled && apiKey && panelApiUrl) {
      // Clear existing intervals
      if (panelCountdownIntervalRef.current) clearInterval(panelCountdownIntervalRef.current);
      if (panelSyncIntervalRef.current) clearInterval(panelSyncIntervalRef.current);

      // Start countdown
      setPanelCountdown(30);

      panelCountdownIntervalRef.current = setInterval(() => {
        setPanelCountdown(prev => {
          if (prev <= 1) return 30;
          return prev - 1;
        });
      }, 1000);

      // Auto-sync every 30 seconds
      panelSyncIntervalRef.current = setInterval(() => {
        syncPanelData(true);
      }, 30000);

      localStorage.setItem('autoSyncEnabled', 'true');
    } else {
      if (panelSyncIntervalRef.current) {
        clearInterval(panelSyncIntervalRef.current);
        panelSyncIntervalRef.current = null;
      }
      if (panelCountdownIntervalRef.current) {
        clearInterval(panelCountdownIntervalRef.current);
        panelCountdownIntervalRef.current = null;
      }
      setPanelCountdown(30);
      localStorage.setItem('autoSyncEnabled', 'false');
    }

    return () => {
      if (panelSyncIntervalRef.current) clearInterval(panelSyncIntervalRef.current);
      if (panelCountdownIntervalRef.current) clearInterval(panelCountdownIntervalRef.current);
    };
  }, [panelAutoSyncEnabled, syncPanelData]);

  // Insight auto-sync effect
  useEffect(() => {
    const apiKey = localStorage.getItem('insightApiKey');
    const apiUrl = localStorage.getItem('insightApiUrl');

    if (insightAutoSyncEnabled && apiKey && apiUrl) {
      // Clear existing intervals
      if (insightCountdownIntervalRef.current) clearInterval(insightCountdownIntervalRef.current);
      if (insightSyncIntervalRef.current) clearInterval(insightSyncIntervalRef.current);

      // Start countdown
      setInsightCountdown(30);

      insightCountdownIntervalRef.current = setInterval(() => {
        setInsightCountdown(prev => {
          if (prev <= 1) return 30;
          return prev - 1;
        });
      }, 1000);

      // Auto-sync every 30 seconds
      insightSyncIntervalRef.current = setInterval(() => {
        syncInsightData(true);
      }, 30000);

      localStorage.setItem('insightAutoSyncEnabled', 'true');
    } else {
      if (insightSyncIntervalRef.current) {
        clearInterval(insightSyncIntervalRef.current);
        insightSyncIntervalRef.current = null;
      }
      if (insightCountdownIntervalRef.current) {
        clearInterval(insightCountdownIntervalRef.current);
        insightCountdownIntervalRef.current = null;
      }
      setInsightCountdown(30);
      localStorage.setItem('insightAutoSyncEnabled', 'false');
    }

    return () => {
      if (insightSyncIntervalRef.current) clearInterval(insightSyncIntervalRef.current);
      if (insightCountdownIntervalRef.current) clearInterval(insightCountdownIntervalRef.current);
    };
  }, [insightAutoSyncEnabled, syncInsightData]);

  const value = {
    // Panel
    panelAutoSyncEnabled,
    setPanelAutoSyncEnabled,
    panelCountdown,
    panelSyncing,
    panelLastSyncTime,
    setPanelLastSyncTime,
    syncPanelData,

    // Insight
    insightAutoSyncEnabled,
    setInsightAutoSyncEnabled,
    insightCountdown,
    insightSyncing,
    insightLastSyncTime,
    setInsightLastSyncTime,
    syncInsightData
  };

  return (
    <AutoSyncContext.Provider value={value}>
      {children}
    </AutoSyncContext.Provider>
  );
}
