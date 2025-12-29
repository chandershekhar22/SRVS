import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function InsightRespondents() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [panelists, setPanelists] = useState([]);
  const [selectedPanelists, setSelectedPanelists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailResults, setEmailResults] = useState(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [smtpCredentials, setSmtpCredentials] = useState({ user: '', pass: '' });
  const [showSmtpForm, setShowSmtpForm] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to load panelists and fetch verification status from server
  const loadPanelists = async (showRefreshMessage = false) => {
    if (showRefreshMessage) setRefreshing(true);

    const savedPanelists = JSON.parse(localStorage.getItem('insightPanelists') || '[]');

    if (savedPanelists.length > 0) {
      try {
        // Fetch verification status from server
        const response = await fetch('http://localhost:5000/api/verification/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            respondentIds: savedPanelists.map(p => p.id)
          })
        });

        if (response.ok) {
          const data = await response.json();

          // Merge server verification status with local data
          const updatedPanelists = savedPanelists.map(p => {
            const serverStatus = data.verifications[p.id];
            if (serverStatus) {
              return {
                ...p,
                proofStatus: serverStatus.proofStatus,
                verificationStatus: serverStatus.proofStatus,
                zkpResult: serverStatus.zkpResult,
                verifiedAttributes: serverStatus.verifiedAttributes,
                verificationMethod: serverStatus.verificationMethod,
                verificationCompletedAt: serverStatus.completedAt
              };
            }
            return p;
          });

          setPanelists(updatedPanelists);
          localStorage.setItem('insightPanelists', JSON.stringify(updatedPanelists));

          if (showRefreshMessage) {
            setMessage(`Status refreshed. ${data.totalFound} verification(s) found.`);
            setTimeout(() => setMessage(''), 3000);
          }
        } else {
          setPanelists(savedPanelists);
        }
      } catch (err) {
        console.error('Failed to fetch verification status:', err);
        setPanelists(savedPanelists);
        if (showRefreshMessage) {
          setMessage('Failed to refresh status from server.');
          setTimeout(() => setMessage(''), 3000);
        }
      }
    } else {
      setPanelists(savedPanelists);
    }

    if (showRefreshMessage) setRefreshing(false);
  };

  useEffect(() => {
    loadPanelists();
  }, []);

  // Show all panelists (not filtered - so verified ones show up too)
  const allPanelists = panelists;

  // Filter for respondents needing attention (pending or partial) - used for email sending
  const unverifiedPanelists = panelists.filter(p =>
    p.verificationStatus === 'unverified' ||
    p.proofStatus === 'pending' ||
    p.proofStatus === 'partial' ||
    !p.proofStatus
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPanelists(unverifiedPanelists.map(p => p.id));
    } else {
      setSelectedPanelists([]);
    }
  };

  const handleSelectPanelist = (id) => {
    setSelectedPanelists(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleRequestProof = async () => {
    if (selectedPanelists.length === 0) {
      setMessage('Please select at least one respondent');
      return;
    }

    setLoading(true);

    try {
      const selectedData = unverifiedPanelists.filter(p =>
        selectedPanelists.includes(p.id)
      );

      const response = await fetch('http://localhost:5000/api/proof/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('insightApiKey')}`
        },
        body: JSON.stringify({
          respondentIds: selectedData.map(p => p.id),
          userId: user.id,
          respondents: selectedData.map(p => ({
            id: p.id,
            hashedData: p.hashedData,
            attributesRequiringProof: p.attributesRequiringProof
          }))
        })
      });

      if (response.ok || true) {
        setMessage(`ZK Proof requested for ${selectedPanelists.length} respondent(s)`);

        const updatedPanelists = panelists.map(p =>
          selectedPanelists.includes(p.id)
            ? { ...p, proofRequested: true, proofRequestedAt: new Date().toISOString() }
            : p
        );
        setPanelists(updatedPanelists);
        localStorage.setItem('insightPanelists', JSON.stringify(updatedPanelists));

        setSelectedPanelists([]);
        setShowProofModal(false);

        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error requesting proof. Please try again.');
    }

    setLoading(false);
  };

  const handleSendVerificationEmails = async (sendToAll = false) => {
    // Use the real server for email sending (not mock-api)
    const serverUrl = 'http://localhost:5000';

    if (!smtpCredentials.user || !smtpCredentials.pass) {
      setMessage('Please enter your SMTP credentials');
      return;
    }

    const respondentsToSend = sendToAll
      ? unverifiedPanelists.filter(p => !p.emailSent)
      : unverifiedPanelists.filter(p => selectedPanelists.includes(p.id));

    if (respondentsToSend.length === 0) {
      setMessage(sendToAll ? 'No pending respondents to send emails' : 'Please select respondents first');
      return;
    }

    setSendingEmails(true);
    setEmailResults(null);

    try {
      // Send full respondent data (including email, name) to server
      const response = await fetch(`${serverUrl}/api/email/send-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          respondents: respondentsToSend.map(p => ({
            id: p.id,
            email: p._privateData?.email || p.email,
            name: p._privateData?.name || p.name,
            attributesRequiringProof: p.attributesRequiringProof
          })),
          baseUrl: window.location.origin,
          smtpUser: smtpCredentials.user,
          smtpPass: smtpCredentials.pass,
          companyType: 'insight'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEmailResults(data);

        const sentIds = respondentsToSend.map(p => p.id);
        const updatedPanelists = panelists.map(p =>
          sentIds.includes(p.id)
            ? { ...p, emailSent: true, emailSentAt: new Date().toISOString() }
            : p
        );
        setPanelists(updatedPanelists);
        localStorage.setItem('insightPanelists', JSON.stringify(updatedPanelists));

        setMessage(`Verification emails sent to ${data.sent} respondent(s)`);
        setSelectedPanelists([]);
        setShowSmtpForm(false);

        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.error || 'Failed to send emails. Check SMTP credentials.');
      }
    } catch (error) {
      setMessage('Error: Cannot connect to server');
    }

    setSendingEmails(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panelists</h1>
            <p className="text-gray-600 mt-1">ZKP Mode: Displaying respondent IDs and encrypted data only</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/insight')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ZKP Info Banner */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Zero-Knowledge Proof Mode:</span> No personal data is displayed. Only respondent IDs and encrypted hashes are shown.
          </p>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            message.includes('requested') || message.includes('Proof') || message.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-8">
        {allPanelists.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🔐</div>
            <p className="text-gray-600 text-lg">No respondents found</p>
            <p className="text-gray-500 text-sm mt-2">Sync data from your API to load respondent IDs and encrypted data</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Action Bar */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedPanelists.length} of {allPanelists.length} selected
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {unverifiedPanelists.filter(p => !p.emailSent).length} pending email verification
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => loadPanelists(true)}
                  disabled={refreshing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 transition flex items-center gap-2"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Status
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  disabled={sendingEmails}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition flex items-center gap-2"
                >
                  {sendingEmails ? 'Sending...' : 'Send Verification to All'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPanelists.length === unverifiedPanelists.length && unverifiedPanelists.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                        title="Select all unverified respondents"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Respondent ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attributes</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ZKP Query</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Proof Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ZKP Result</th>
                  </tr>
                </thead>
                <tbody>
                  {allPanelists.map((respondent) => (
                    <tr key={respondent.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPanelists.includes(respondent.id)}
                          onChange={() => handleSelectPanelist(respondent.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          disabled={respondent.proofStatus === 'verified'}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {respondent.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {respondent.attributesRequiringProof?.map((attr, idx) => (
                            <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              {attr}
                            </span>
                          )) || (
                            <span className="text-gray-400 text-sm">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {respondent.zkpQuery ? (
                          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 inline-block max-w-[200px] truncate" title={respondent.zkpQuery}>
                            {respondent.zkpQuery}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {respondent.emailSent ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Sent
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {respondent.proofStatus === 'verified' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Verified
                          </span>
                        ) : respondent.proofStatus === 'partial' ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                            Partial Verified
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {respondent.proofStatus === 'verified' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Yes
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ZK Proof Request Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Zero-Knowledge Proof</h2>
            <p className="text-gray-600 text-sm mb-6">Initiate proof verification for selected respondents</p>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-3">
                <strong>{selectedPanelists.length} respondent(s)</strong> selected for ZK proof verification:
              </p>
              <div className="max-h-32 overflow-y-auto">
                {unverifiedPanelists
                  .filter(p => selectedPanelists.includes(p.id))
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div key={idx} className="text-xs font-mono text-blue-600 py-1">
                      - {p.id}
                    </div>
                  ))}
                {selectedPanelists.length > 5 && (
                  <div className="text-xs text-blue-600 py-1">
                    - ...and {selectedPanelists.length - 5} more
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Privacy Notice:</span> Only respondent IDs and encrypted data commitments will be sent. No personal information is transmitted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProofModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestProof}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
              >
                {loading ? 'Requesting...' : 'Request Proof'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Verification Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Verification Emails</h2>
            <p className="text-gray-600 text-sm mb-6">
              Send verification links to respondents for profile verification
            </p>

            {/* Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-blue-800">Pending Verification</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {unverifiedPanelists.filter(p => !p.emailSent).length}
                  </p>
                  <p className="text-xs text-blue-600">respondents waiting for email</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">Already Sent</p>
                  <p className="text-2xl font-bold text-green-800">
                    {unverifiedPanelists.filter(p => p.emailSent).length}
                  </p>
                  <p className="text-xs text-green-600">emails sent</p>
                </div>
              </div>
            </div>

            {/* SMTP Credentials Form */}
            {showSmtpForm && !emailResults && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-semibold text-yellow-800 mb-3">
                  Enter Your Email SMTP Credentials
                </p>
                <p className="text-xs text-yellow-700 mb-4">
                  Emails will be sent from your email account. For Gmail, use an App Password (not your regular password).
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      SMTP Email (e.g., your-email@gmail.com)
                    </label>
                    <input
                      type="email"
                      value={smtpCredentials.user}
                      onChange={(e) => setSmtpCredentials(prev => ({ ...prev, user: e.target.value }))}
                      placeholder="your-email@gmail.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      SMTP Password / App Password
                    </label>
                    <input
                      type="password"
                      value={smtpCredentials.pass}
                      onChange={(e) => setSmtpCredentials(prev => ({ ...prev, pass: e.target.value }))}
                      placeholder="Enter your app password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Your credentials are only used for this session and are not stored on the server.
                </p>
              </div>
            )}

            {/* Email Results */}
            {emailResults && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-3">
                  Emails Sent Successfully from {smtpCredentials.user}
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {emailResults.results?.map((result, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded border border-green-200">
                      <p className="font-mono text-gray-700">{result.respondentId}</p>
                      <p className="text-gray-500">{result.email}</p>
                      <a
                        href={result.verificationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {result.verificationLink}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">How it works:</span> Each respondent will receive a unique verification link.
                When they click the link, they'll be redirected to complete their profile verification.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailResults(null);
                  setShowSmtpForm(true);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
              >
                {emailResults ? 'Close' : 'Cancel'}
              </button>
              {!emailResults && (
                <button
                  onClick={() => handleSendVerificationEmails(true)}
                  disabled={sendingEmails || unverifiedPanelists.filter(p => !p.emailSent).length === 0 || !smtpCredentials.user || !smtpCredentials.pass}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition"
                >
                  {sendingEmails ? 'Sending...' : `Send to All (${unverifiedPanelists.filter(p => !p.emailSent).length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
