import React, { useState, useEffect } from 'react';

export default function APISettings({ isOpen, onClose, onSave, storageKeyPrefix = '' }) {
  const [apiKey, setApiKey] = useState('');
  const [panelApiUrl, setPanelApiUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Use prefix for storage keys (e.g., 'insight' -> 'insightApiKey', 'insightApiUrl')
  const apiKeyStorageKey = storageKeyPrefix ? `${storageKeyPrefix}ApiKey` : 'apiKey';
  const apiUrlStorageKey = storageKeyPrefix ? `${storageKeyPrefix}ApiUrl` : 'panelApiUrl';

  useEffect(() => {
    // Load existing settings from localStorage
    const savedApiKey = localStorage.getItem(apiKeyStorageKey);
    const savedPanelApiUrl = localStorage.getItem(apiUrlStorageKey);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedPanelApiUrl) {
      setPanelApiUrl(savedPanelApiUrl);
    }
    setConnectionStatus(null);
    setMessage('');
  }, [isOpen, apiKeyStorageKey, apiUrlStorageKey]);

  const generateNewKey = () => {
    const newKey = 'sk_live_' + Math.random().toString(36).substr(2, 30);
    setApiKey(newKey);
    setMessage('New API key generated');
  };

  const testConnection = async () => {
    if (!panelApiUrl) {
      setMessage('Please enter Panel API URL first');
      return;
    }

    setTesting(true);
    setConnectionStatus(null);
    setMessage('Testing connection...');

    const cleanUrl = panelApiUrl.trim().replace(/\/+$/, ''); // Remove whitespace and trailing slashes

    try {
      const response = await fetch(`${cleanUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('connected');
        setMessage(`Connected! ${data.message || 'API is running'}`);
      } else {
        setConnectionStatus('failed');
        setMessage('Connection failed. Check the URL.');
      }
    } catch (error) {
      setConnectionStatus('failed');
      setMessage('Cannot reach API. Make sure the mock server is running.');
    }

    setTesting(false);
  };

  const handleSave = () => {
    if (!apiKey) {
      setMessage('API key cannot be empty');
      return;
    }

    setLoading(true);
    // Clean the URL before saving - remove whitespace and trailing slashes
    const cleanUrl = panelApiUrl.trim().replace(/\/+$/, '');
    // Save to localStorage with prefix
    localStorage.setItem(apiKeyStorageKey, apiKey);
    localStorage.setItem(apiUrlStorageKey, cleanUrl);

    setTimeout(() => {
      setLoading(false);
      setMessage('Settings saved successfully!');
      setTimeout(() => {
        onSave({ apiKey, panelApiUrl: cleanUrl });
        onClose();
      }, 1000);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Settings</h2>
        <p className="text-gray-600 text-sm mb-6">Configure your panel API connection</p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            message.includes('successfully') || message.includes('Connected')
              ? 'bg-green-50 text-green-700'
              : message.includes('failed') || message.includes('Cannot')
              ? 'bg-red-50 text-red-700'
              : 'bg-yellow-50 text-yellow-700'
          }`}>
            {message}
          </div>
        )}

        {/* Panel API URL */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Panel API URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={panelApiUrl}
              onChange={(e) => setPanelApiUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
              placeholder="https://srvs-mockapi.onrender.com"
            />
            <button
              onClick={testConnection}
              disabled={testing}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                connectionStatus === 'connected'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : connectionStatus === 'failed'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {testing ? (
                <span className="animate-spin">...</span>
              ) : connectionStatus === 'connected' ? (
                'Connected'
              ) : connectionStatus === 'failed' ? (
                'Retry'
              ) : (
                'Test'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter the URL of your panel provider API
          </p>
        </div>

        {/* API Key */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            API Key
          </label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
              placeholder="sk_live_..."
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300"
              title="Toggle visibility"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">Keep this key secure.</p>
            <button
              onClick={generateNewKey}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Generate New Key
            </button>
          </div>
        </div>

        {/* Mock API Info */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm font-semibold text-purple-800 mb-2">Mock API</p>
          <p className="text-xs text-purple-700 mb-2">
            Use our hosted mock API for testing:
          </p>
          <code className="block bg-purple-100 px-3 py-2 rounded text-sm text-purple-800 font-mono">
            https://srvs-mockapi.onrender.com
          </code>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
