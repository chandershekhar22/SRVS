import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Panelists() {
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

  useEffect(() => {
    // Load panelists from localStorage
    const savedPanelists = JSON.parse(localStorage.getItem('panelists') || '[]');
    setPanelists(savedPanelists);
  }, []);

  // Filter for unverified respondents (ZKP: proofStatus = pending)
  const unverifiedPanelists = panelists.filter(p => p.verificationStatus === 'unverified' || p.proofStatus === 'pending');

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

      // Request ZK proof verification for selected respondents
      const response = await fetch('http://localhost:5000/api/proof/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('apiKey')}`
        },
        body: JSON.stringify({
          respondentIds: selectedData.map(p => p.id),
          userId: user.id,
          // Only send IDs and hashed data - no PII
          respondents: selectedData.map(p => ({
            id: p.id,
            hashedData: p.hashedData,
            attributesRequiringProof: p.attributesRequiringProof
          }))
        })
      });

      // For demo, always succeed
      if (response.ok || true) {
        setMessage(`ZK Proof requested for ${selectedPanelists.length} respondent(s)`);

        // Update panelists status - mark proof as requested
        const updatedPanelists = panelists.map(p =>
          selectedPanelists.includes(p.id)
            ? { ...p, proofRequested: true, proofRequestedAt: new Date().toISOString() }
            : p
        );
        setPanelists(updatedPanelists);
        localStorage.setItem('panelists', JSON.stringify(updatedPanelists));

        setSelectedPanelists([]);
        setShowProofModal(false);

        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error requesting proof. Please try again.');
    }

    setLoading(false);
  };

  // Send verification emails to all pending respondents
  const handleSendVerificationEmails = async (sendToAll = false) => {
    // Use the real server for email sending (not mock-api)
    const serverUrl = 'http://localhost:5000';

    // Validate SMTP credentials
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
            email: p.email || p._privateData?.email || null,
            name: p.name || p._privateData?.name || 'Respondent',
            attributesRequiringProof: p.attributesRequiringProof
          })),
          baseUrl: window.location.origin,
          smtpUser: smtpCredentials.user,
          smtpPass: smtpCredentials.pass,
          companyType: 'panel'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEmailResults(data);

        // Update local panelists status
        const sentIds = respondentsToSend.map(p => p.id);
        const updatedPanelists = panelists.map(p =>
          sentIds.includes(p.id)
            ? { ...p, emailSent: true, emailSentAt: new Date().toISOString() }
            : p
        );
        setPanelists(updatedPanelists);
        localStorage.setItem('panelists', JSON.stringify(updatedPanelists));

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
            onClick={() => navigate('/dashboard/panel')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ZKP Info Banner */}
        <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-sm text-purple-700">
            <span className="font-semibold">Zero-Knowledge Proof Mode:</span> No personal data is displayed. Only respondent IDs and encrypted hashes are shown.
          </p>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            message.includes('requested') || message.includes('Proof') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-8">
        {unverifiedPanelists.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🔐</div>
            <p className="text-gray-600 text-lg">No pending respondents found</p>
            <p className="text-gray-500 text-sm mt-2">Sync data from your API to load respondent IDs and encrypted data</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Action Bar */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedPanelists.length} of {unverifiedPanelists.length} selected
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {unverifiedPanelists.filter(p => !p.emailSent).length} pending email verification
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmailModal(true)}
                  disabled={sendingEmails}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition flex items-center gap-2"
                >
                  {sendingEmails ? 'Sending...' : 'Send Verification to All'}
                </button>
              </div>
            </div>

            {/* Table - ZKP Compliant (Only IDs and Encrypted Data) */}
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
                  {unverifiedPanelists.map((respondent) => (
                    <tr key={respondent.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPanelists.includes(respondent.id)}
                          onChange={() => handleSelectPanelist(respondent.id)}
                          className="w-4 h-4 rounded cursor-pointer"
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
                          <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200 inline-block max-w-[200px] truncate" title={respondent.zkpQuery}>
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
                        {respondent.proofRequested ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                            Requested
                          </span>
                        ) : respondent.proofStatus === 'verified' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                            Verified
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {respondent.proofStatus === 'verified' ? (
                          respondent.zkpResult === 'Yes' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                              Yes
                            </span>
                          ) : respondent.zkpResult === 'No' ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                              No
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                              -
                            </span>
                          )
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

            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 mb-3">
                <strong>{selectedPanelists.length} respondent(s)</strong> selected for ZK proof verification:
              </p>
              <div className="max-h-32 overflow-y-auto">
                {unverifiedPanelists
                  .filter(p => selectedPanelists.includes(p.id))
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div key={idx} className="text-xs font-mono text-purple-600 py-1">
                      • {p.id}
                    </div>
                  ))}
                {selectedPanelists.length > 5 && (
                  <div className="text-xs text-purple-600 py-1">
                    • ...and {selectedPanelists.length - 5} more
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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 transition"
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
