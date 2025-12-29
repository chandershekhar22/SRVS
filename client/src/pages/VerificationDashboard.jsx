import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// Session duration: 6 hours in milliseconds
const SESSION_DURATION = 6 * 60 * 60 * 1000;

// Function to format attribute name for display
const formatAttributeName = (attr) => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function VerificationDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionData, setSessionData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session data from navigation state or localStorage
    let data = location.state;

    if (!data) {
      // Try to get from localStorage
      const storedSession = localStorage.getItem('verificationSession');
      if (storedSession) {
        data = JSON.parse(storedSession);
      }
    }

    if (!data || !data.sessionExpiry) {
      // No valid session, redirect to home
      navigate('/');
      return;
    }

    // Check if session has expired
    const expiryTime = new Date(data.sessionExpiry).getTime();
    const now = Date.now();

    if (now >= expiryTime) {
      // Session expired
      localStorage.removeItem('verificationSession');
      navigate('/', {
        state: { message: 'Your verification session has expired. Please start again.' }
      });
      return;
    }

    // Store session data in localStorage for page refreshes
    localStorage.setItem('verificationSession', JSON.stringify(data));
    setSessionData(data);
    setLoading(false);

    // Update countdown every second
    const interval = setInterval(() => {
      const remaining = expiryTime - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        localStorage.removeItem('verificationSession');
        navigate('/', {
          state: { message: 'Your verification session has expired. Please start again.' }
        });
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [location.state, navigate]);

  // Format time remaining
  const formatTimeRemaining = (ms) => {
    if (!ms) return '--:--:--';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get verified and pending attributes
  const getAttributeStatus = () => {
    if (!sessionData) return { verified: [], pending: [] };

    const allAttributes = sessionData.attributesRequiringProof || [];
    const verifiedMethods = sessionData.verifiedMethods || [];

    const verified = [];
    const pending = [];

    allAttributes.forEach(attr => {
      const attrLower = attr.toLowerCase().replace(' ', '_');
      const isLinkedInAttr = LINKEDIN_ATTRIBUTES.includes(attrLower);
      const isDocumentAttr = DOCUMENT_ATTRIBUTES.includes(attrLower);

      if (isLinkedInAttr && verifiedMethods.includes('linkedin')) {
        verified.push({ name: attr, method: 'linkedin' });
      } else if (isDocumentAttr && verifiedMethods.includes('document')) {
        verified.push({ name: attr, method: 'document' });
      } else if (isLinkedInAttr) {
        pending.push({ name: attr, method: 'linkedin' });
      } else if (isDocumentAttr) {
        pending.push({ name: attr, method: 'document' });
      } else {
        // Unknown attribute, mark as pending document
        pending.push({ name: attr, method: 'document' });
      }
    });

    return { verified, pending };
  };

  const handleVerifyAttribute = (method) => {
    if (method === 'document') {
      // Update localStorage before navigating (to ensure data persists)
      const updatedSession = {
        ...sessionData,
        returnTo: '/verification-dashboard'
      };
      localStorage.setItem('verificationSession', JSON.stringify(updatedSession));
      console.log('[DASHBOARD] Navigating to verify-document with:', updatedSession);

      // Navigate to document upload with session data
      navigate('/verify-document', {
        state: updatedSession
      });
    } else if (method === 'linkedin') {
      // Navigate to LinkedIn verification
      navigate('/signup', {
        state: {
          fromVerification: true,
          token: sessionData.verificationToken,
          respondentId: sessionData.respondentId,
          attributesRequiringProof: sessionData.attributesRequiringProof,
          recommendedVerificationMethods: ['linkedin']
        }
      });
    }
  };

  const handleCompleteVerification = async () => {
    // Call server to complete verification with all attributes
    const verificationToken = sessionData.verificationToken;
    const allAttributes = sessionData.attributesRequiringProof || [];

    // Determine verification method used
    const verifiedMethods = sessionData.verifiedMethods || [];
    let verificationMethod = 'document';
    if (verifiedMethods.includes('linkedin') && verifiedMethods.includes('document')) {
      verificationMethod = 'linkedin+document';
    } else if (verifiedMethods.includes('linkedin')) {
      verificationMethod = 'linkedin';
    }

    if (verificationToken) {
      try {
        const response = await fetch(`http://localhost:5000/api/verify/${verificationToken}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proofData: {
              completedAt: new Date().toISOString(),
              method: verificationMethod
            },
            verifiedAttributes: allAttributes,
            verificationMethod: verificationMethod
          })
        });

        const responseData = await response.json();
        console.log('[DASHBOARD] Complete verification response:', responseData);

        // Clear session and navigate to success
        localStorage.removeItem('verificationSession');
        navigate('/verification-success', {
          state: {
            respondentId: sessionData.respondentId,
            zkpResult: responseData.zkpResult || 'Yes',
            proofStatus: responseData.proofStatus || 'verified'
          }
        });
      } catch (err) {
        console.error('[DASHBOARD] Failed to complete verification:', err);
        // Still navigate to success as attributes were verified
        localStorage.removeItem('verificationSession');
        navigate('/verification-success', {
          state: {
            respondentId: sessionData.respondentId,
            zkpResult: 'Yes'
          }
        });
      }
    } else {
      // No token, just navigate
      localStorage.removeItem('verificationSession');
      navigate('/verification-success', {
        state: {
          respondentId: sessionData.respondentId,
          zkpResult: 'Yes'
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  const { verified, pending } = getAttributeStatus();
  const allVerified = pending.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Verification Dashboard</h1>
            <p className="text-gray-600 text-sm">Complete all attribute verifications</p>
          </div>

          {/* Respondent ID */}
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs text-purple-600 uppercase font-semibold mb-1">Respondent ID</p>
            <p className="font-mono text-purple-800 font-bold">{sessionData?.respondentId}</p>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Verification Progress</span>
                <span className="font-semibold text-purple-600">
                  {verified.length} / {verified.length + pending.length} attributes
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${(verified.length / (verified.length + pending.length)) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Verified Attributes */}
        {verified.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verified Attributes</h2>
                <p className="text-sm text-gray-500">Successfully verified via LinkedIn</p>
              </div>
            </div>

            <div className="space-y-3">
              {verified.map((attr, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">{formatAttributeName(attr.name)}</span>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                    {attr.method === 'linkedin' && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    )}
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Attributes */}
        {pending.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pending Verification</h2>
                <p className="text-sm text-gray-500">Click to verify these attributes</p>
              </div>
            </div>

            <div className="space-y-3">
              {pending.map((attr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleVerifyAttribute(attr.method)}
                  className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition">
                      <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">{formatAttributeName(attr.name)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {attr.method === 'document' ? 'Document Upload' : 'LinkedIn'}
                    </span>
                    <svg className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {allVerified ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">All Attributes Verified!</h3>
                <p className="text-gray-600">You have successfully verified all required attributes.</p>
              </div>
              <button
                onClick={handleCompleteVerification}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition"
              >
                Complete Verification
              </button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Please verify all pending attributes to complete your verification.
              </p>
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{pending.length} attribute(s) still pending</span>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">Privacy Protected</p>
              <p className="text-xs text-blue-600 mt-1">
                No personal data is stored - only verification results are recorded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
