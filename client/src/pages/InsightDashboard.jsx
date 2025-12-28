import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import APISettings from '../components/APISettings';
import { useAutoSync } from '../context/AutoSyncContext';

export default function InsightDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  // Use global auto-sync context
  const {
    insightAutoSyncEnabled,
    setInsightAutoSyncEnabled,
    insightCountdown,
    insightSyncing,
    insightLastSyncTime,
    setInsightLastSyncTime,
    syncInsightData
  } = useAutoSync();

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [apiKey, setApiKey] = useState('');
  const [panelApiUrl, setPanelApiUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isAPISettingsOpen, setIsAPISettingsOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelStatus, setExcelStatus] = useState('');
  const fileInputRef = useRef(null);

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

  // Sync lastSyncTime with context
  useEffect(() => {
    if (insightLastSyncTime) {
      setLastSyncTime(insightLastSyncTime);
    }
  }, [insightLastSyncTime]);

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

  const handleSyncData = async (silent = false) => {
    if (!apiKey) {
      if (!silent) setSyncStatus('Please configure API key first');
      return;
    }

    if (!panelApiUrl) {
      if (!silent) setSyncStatus('Please configure Panel API URL first');
      return;
    }

    setSyncing(true);
    if (!silent) setSyncStatus('Connecting to Panel API...');

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
        setInsightLastSyncTime(now); // Update context
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
            zkpResult: r.zkpResult || 'pending',
            email: r.email,
            name: r.name
          }));

          const existingIds = new Set(existingPanelists.map(p => p.id));
          const uniqueNewPanelists = newPanelists.filter(p => !existingIds.has(p.id));
          const allPanelists = [...existingPanelists, ...uniqueNewPanelists];

          localStorage.setItem('insightPanelists', JSON.stringify(allPanelists));
        }

        if (!silent) {
          setSyncStatus(`Synced ${data.dataPoints?.respondentsAdded || 0} respondents from ${panelApiUrl}`);
          setTimeout(() => setSyncStatus(''), 4000);
        }
        setSyncing(false);
      } else {
        setConnectionStatus('disconnected');
        if (!silent) setSyncStatus('Sync failed. Check API URL and key.');
        setSyncing(false);
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      if (!silent) {
        setSyncStatus(`Cannot connect to ${panelApiUrl}. Is the server running?`);
        setTimeout(() => setSyncStatus(''), 5000);
      }
      setSyncing(false);
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

  // Simple hash function for client-side hashing (for demo purposes)
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  };

  // Generate unique ID for respondent
  const generateRespondentId = (prefix = 'EXCEL') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `RSP-${prefix}-${timestamp}-${random}`;
  };

  // Download Excel template
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        age: 28,
        income: 55000,
        location: 'New York',
        occupation: 'Engineer',
        education: 'Bachelor',
        zkpQuery: "age >= 25 AND occupation = 'Engineer'"
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        age: 35,
        income: 72000,
        location: 'Chicago',
        occupation: 'Manager',
        education: 'Master',
        zkpQuery: "income > 60000 AND education = 'Master'"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respondents');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // name
      { wch: 30 }, // email
      { wch: 8 },  // age
      { wch: 12 }, // income
      { wch: 15 }, // location
      { wch: 15 }, // occupation
      { wch: 15 }, // education
      { wch: 45 }  // zkpQuery
    ];

    XLSX.writeFile(workbook, 'respondent_template.xlsx');
  };

  // Handle Excel file upload
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setExcelUploading(true);
    setExcelStatus('Processing Excel file...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setExcelStatus('Error: Excel file is empty');
        setExcelUploading(false);
        return;
      }

      // Validate required columns
      const requiredColumns = ['name', 'email'];
      const firstRow = jsonData[0];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));

      if (missingColumns.length > 0) {
        setExcelStatus(`Error: Missing required columns: ${missingColumns.join(', ')}`);
        setExcelUploading(false);
        return;
      }

      // Process each row and create ZKP-compliant respondent data
      const insightId = user.id || 'INSIGHT';
      const processedRespondents = jsonData.map(row => {
        const respondentId = generateRespondentId(insightId);
        const salt = Math.random().toString(36).substring(2);

        // Create hashed data from row
        const hashedData = simpleHash(JSON.stringify({ ...row, salt }));

        // Determine attributes requiring proof
        const allAttributes = ['age', 'income', 'location', 'occupation', 'education'];
        const availableAttributes = allAttributes.filter(attr => row[attr] !== undefined);
        const attributeCount = Math.min(Math.floor(Math.random() * 3) + 1, availableAttributes.length);
        const shuffled = [...availableAttributes].sort(() => 0.5 - Math.random());
        const attributesRequiringProof = shuffled.slice(0, attributeCount);

        // Create attribute hashes
        const attributeHashes = {};
        allAttributes.forEach(attr => {
          if (row[attr] !== undefined) {
            attributeHashes[attr] = simpleHash(`${attr}:${row[attr]}:${salt}`);
          }
        });

        return {
          id: respondentId,
          hashedData,
          proofStatus: 'pending',
          verificationStatus: 'unverified',
          attributesRequiringProof,
          attributeHashes,
          syncedAt: new Date().toISOString(),
          emailSent: false,
          zkpQuery: row.zkpQuery || "age >= 18",
          zkpResult: 'pending',
          source: 'excel'
        };
      });

      // Merge with existing panelists (using insight-specific storage key)
      const existingPanelists = JSON.parse(localStorage.getItem('insightPanelists') || '[]');
      const existingIds = new Set(existingPanelists.map(p => p.id));
      const uniqueNewPanelists = processedRespondents.filter(p => !existingIds.has(p.id));
      const allPanelists = [...existingPanelists, ...uniqueNewPanelists];

      localStorage.setItem('insightPanelists', JSON.stringify(allPanelists));

      // Update last sync time
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('insightLastSyncTime', now.toISOString());

      setExcelStatus(`Successfully imported ${processedRespondents.length} respondents from Excel`);
      setTimeout(() => setExcelStatus(''), 4000);
    } catch (error) {
      console.error('Excel processing error:', error);
      setExcelStatus(`Error processing Excel file: ${error.message}`);
    } finally {
      setExcelUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
              {/* Auto-sync toggle */}
              <button
                onClick={() => {
                  if (apiKey && panelApiUrl) {
                    setInsightAutoSyncEnabled(!insightAutoSyncEnabled);
                  }
                }}
                disabled={!apiKey || !panelApiUrl}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition font-medium text-sm ${
                  insightAutoSyncEnabled
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                } ${!apiKey || !panelApiUrl ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}`}
              >
                <div className={`w-8 h-5 rounded-full relative transition-colors ${
                  insightAutoSyncEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    insightAutoSyncEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}></div>
                </div>
                <span>Auto</span>
                {insightAutoSyncEnabled && apiKey && panelApiUrl && (
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                    {insightCountdown}s
                  </span>
                )}
              </button>
              <button
                onClick={() => handleSyncData(false)}
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Data Sync</h2>

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

              {/* Sync Method Tabs */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sync Method</p>

                {/* API Integration Section */}
                <div className="border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔌</span>
                    <span className="font-semibold text-gray-900 text-sm">API Integration</span>
                  </div>

                  {/* Panel API URL */}
                  <div className="mb-2">
                    <label className="text-xs text-gray-500">Panel API URL</label>
                    <div className="p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 truncate border border-gray-200">
                      {panelApiUrl || 'Not configured'}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-500">API Key</label>
                    <div className="p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 truncate border border-gray-200">
                      {apiKey ? apiKey.substring(0, 12) + '...' : 'Not configured'}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAPISettingsOpen(true)}
                    className="w-full px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition text-sm"
                  >
                    {panelApiUrl ? 'Update Settings' : 'Configure API'}
                  </button>
                </div>

                {/* Excel Upload Section */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <span className="font-semibold text-gray-900 text-sm">Excel Upload</span>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    Upload an Excel file with respondent data in the same format as the API.
                  </p>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleExcelUpload}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />

                  {/* Upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={excelUploading}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 mb-2"
                  >
                    {excelUploading ? (
                      <>
                        <span className="animate-spin">⟳</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        Upload Excel File
                      </>
                    )}
                  </button>

                  {/* Download template button */}
                  <button
                    onClick={downloadExcelTemplate}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    Download Template
                  </button>

                  {/* Excel status message */}
                  {excelStatus && (
                    <p className={`mt-2 text-xs font-medium ${
                      excelStatus.includes('Error') ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {excelStatus}
                    </p>
                  )}
                </div>
              </div>
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
