import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import APISettings from '../components/APISettings';

export default function InsightDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [apiKey, setApiKey] = useState('');
  const [panelApiUrl, setPanelApiUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    // Load API settings from localStorage
    const savedApiKey = localStorage.getItem('insightApiKey');
    const savedPanelApiUrl = localStorage.getItem('insightApiUrl');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedPanelApiUrl) {
      setPanelApiUrl(savedPanelApiUrl);
    }

    // Load last sync time
    const savedSyncTime = localStorage.getItem('insightLastSyncTime');
    if (savedSyncTime) {
      setLastSyncTime(new Date(savedSyncTime));
    }

    // Check connection status if URL exists
    if (savedPanelApiUrl) {
      checkConnection(savedPanelApiUrl);
    }
  }, []);

  const checkConnection = async (url) => {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('insightPanelists');
    localStorage.removeItem('insightLastSyncTime');
    localStorage.removeItem('insightApiKey');
    localStorage.removeItem('insightApiUrl');
    navigate('/');
  };

  const handleSyncData = async () => {
    if (!apiKey) {
      setSyncStatus('Please configure API key first');
      return;
    }

    if (!panelApiUrl) {
      setSyncStatus('Please configure Panel API URL first');
      return;
    }

    setSyncing(true);
    setSyncStatus('Connecting to Panel API...');

    try {
      const response = await fetch(`${panelApiUrl}/api/sync`, {
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
        setLastSyncTime(now);
        localStorage.setItem('insightLastSyncTime', now.toISOString());
        setConnectionStatus('connected');

        // Store ZKP-compliant respondent data
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

        setSyncStatus(`Synced ${data.dataPoints?.respondentsAdded || 0} respondents from ${panelApiUrl}`);
        setSyncing(false);
        setTimeout(() => setSyncStatus(''), 4000);
      } else {
        setConnectionStatus('disconnected');
        setSyncStatus('Sync failed. Check API URL and key.');
        setSyncing(false);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setSyncStatus(`Cannot connect to ${panelApiUrl}. Is the server running?`);
      setSyncing(false);
      setTimeout(() => setSyncStatus(''), 5000);
    }
  };

  const handleAPIKeySaved = (settings) => {
    if (typeof settings === 'object') {
      setApiKey(settings.apiKey);
      setPanelApiUrl(settings.panelApiUrl);
      // Save with insight-specific keys
      localStorage.setItem('insightApiKey', settings.apiKey);
      localStorage.setItem('insightApiUrl', settings.panelApiUrl);
      if (settings.panelApiUrl) {
        checkConnection(settings.panelApiUrl);
      }
    } else {
      setApiKey(settings);
      localStorage.setItem('insightApiKey', settings);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard/insight' },
    { id: 'respondents', label: 'Manage Proofs', icon: '👥',  path: '/dashboard/insight/respondents' },
    { id: 'surveys', label: 'Surveys', icon: '📋' },
    { id: 'proof-requests', label: 'Proof Requests', icon: '✓' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  const settingsItems = [
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'api-settings', label: 'API Settings', icon: '🔌' },
  ];

  const recentSurveys = [
    { project: 'Consumer Electronics Study', status: 'active', responses: 1245 },
    { project: 'Healthcare Satisfaction', status: 'completed', responses: 890 },
    { project: 'B2B Decision Makers', status: 'active', responses: 456 },
    { project: 'Financial Services Survey', status: 'draft', responses: 0 },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">✓</span>
            </div>
            <span className="font-bold text-lg text-gray-900">SRVS</span>
          </div>
          <span className="text-xs text-blue-600 font-semibold mt-2 inline-block bg-blue-50 px-2 py-1 rounded">
            Insight
          </span>
        </div>

        {/* Scrollable Menu Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Main</p>
          <nav className="space-y-2 mb-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (item.path) navigate(item.path);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition ${
                  activeMenu === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Settings Menu */}
          <p className="text-xs font-semibold text-gray-500 uppercase mb-4">Settings</p>
          <nav className="space-y-2">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  activeMenu === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-4 group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {user.fullName?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email || 'user@example.com'}</p>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-gray-600 text-lg ml-2 flex-shrink-0">→</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-sm text-red-600 hover:bg-red-50 p-3 rounded font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.fullName || 'User'}!</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSyncData}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
              >
                {syncing ? '⟳' : '⟲'} {syncing ? 'Syncing...' : 'Sync Data'}
              </button>
              <button className="text-gray-600 hover:text-gray-900 text-2xl">🔔</button>
            </div>
          </div>
          {syncStatus && (
            <p className={`mt-2 text-sm font-medium ${
              syncStatus.includes('successfully') || syncStatus.includes('Synced') ? 'text-green-600' : 'text-orange-600'
            }`}>
              {syncStatus}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active Surveys</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
                </div>
                <span className="text-2xl">📋</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Respondents</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">50,432</p>
                </div>
                <span className="text-2xl">👥</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Verified Responses</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">8,650</p>
                </div>
                <span className="text-2xl">✓</span>
              </div>
            </div>

          </div>

          {/* Recent Surveys & API Integration */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Surveys</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Project</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSurveys.map((survey, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 text-gray-900 font-medium">{survey.project}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(survey.status)}`}>
                            {survey.status}
                          </span>
                        </td>
                        <td className="py-4 text-gray-600">{survey.responses.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API Integration */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">API Integration</h2>

              {/* Connection Status */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-gray-300'
                }`}></div>
                <div>
                  <p className="text-gray-900 font-medium">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'disconnected' ? 'Disconnected' : 'Not Configured'}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleTimeString()}` : 'No sync yet'}
                  </p>
                </div>
              </div>

              {/* Panel API URL */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">Panel API URL</label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 truncate border border-gray-200">
                  {panelApiUrl || 'Not configured'}
                </div>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">API Key</label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 truncate border border-gray-200">
                  {apiKey ? apiKey.substring(0, 12) + '...' : 'Not configured'}
                </div>
              </div>

              <button
                onClick={() => setIsAPISettingsOpen(true)}
                className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition"
              >
                {panelApiUrl ? 'Update Settings' : 'Configure API'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Settings Modal */}
      <APISettings
        isOpen={isAPISettingsOpen}
        onClose={() => setIsAPISettingsOpen(false)}
        onSave={handleAPIKeySaved}
        storageKeyPrefix="insight"
      />
    </div>
  );
}
