import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Attribute categories
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];

// Function to format attribute name for display
const formatAttributeName = (attr) => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function VerifyDocument() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionData, setSessionData] = useState(null);
  const [status, setStatus] = useState('signin'); // signin, verifying, success
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check for session data from navigation state or localStorage
    let data = location.state;

    if (!data) {
      const storedSession = localStorage.getItem('verificationSession');
      if (storedSession) {
        data = JSON.parse(storedSession);
      }
    }

    if (!data || !data.sessionExpiry) {
      navigate('/');
      return;
    }

    // Check if session has expired
    const expiryTime = new Date(data.sessionExpiry).getTime();
    if (Date.now() >= expiryTime) {
      localStorage.removeItem('verificationSession');
      navigate('/', {
        state: { message: 'Your verification session has expired. Please start again.' }
      });
      return;
    }

    setSessionData(data);
  }, [location.state, navigate]);

  // Get pending document attributes
  const getPendingDocumentAttrs = () => {
    if (!sessionData) return [];
    const allAttributes = sessionData.attributesRequiringProof || [];
    const verifiedMethods = sessionData.verifiedMethods || [];

    return allAttributes.filter(attr => {
      const attrLower = attr.toLowerCase().replace(' ', '_');
      return DOCUMENT_ATTRIBUTES.includes(attrLower) && !verifiedMethods.includes('document');
    });
  };

  const handleSignIn = () => {
    setStatus('verifying');

    // Countdown from 5
    let count = 5;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // After 5 seconds, show success and redirect
    setTimeout(() => {
      clearInterval(countdownInterval);
      setStatus('success');

      // Update session data to mark document as verified
      const updatedSession = {
        ...sessionData,
        verifiedMethods: [...(sessionData.verifiedMethods || []), 'document']
      };

      // Save updated session
      localStorage.setItem('verificationSession', JSON.stringify(updatedSession));

      // Update local panelists data
      const pendingVerification = JSON.parse(localStorage.getItem('pendingLinkedInVerification') || '{}');
      if (pendingVerification.respondentId) {
        const panelists = JSON.parse(localStorage.getItem('panelists') || '[]');
        const updatedPanelists = panelists.map(p => {
          if (p.id === pendingVerification.respondentId) {
            return {
              ...p,
              documentVerified: true,
              proofStatus: 'verified',
              verificationStatus: 'verified'
            };
          }
          return p;
        });
        localStorage.setItem('panelists', JSON.stringify(updatedPanelists));
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/verification-dashboard', {
          state: updatedSession
        });
      }, 2000);
    }, 5000);
  };

  const handleBack = () => {
    navigate('/verification-dashboard', {
      state: sessionData
    });
  };

  const pendingAttrs = getPendingDocumentAttrs();

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Verification in progress screen
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification in Progress</h1>
          <p className="text-gray-600 mb-6">
            Fetching your documents from DigiLocker...
          </p>
          <div className="mb-6 p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-orange-600 uppercase font-semibold mb-1">Please Wait</p>
            <p className="text-3xl font-bold text-orange-800">{countdown}s</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-orange-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Secure Connection</span>
          </div>
        </div>
      </div>
    );
  }

  // Verification success screen
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your documents have been verified via DigiLocker.
          </p>
          <div className="mb-6 p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Document Attributes Verified</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // DigiLocker Sign In screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        {/* DigiLocker Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* DigiLocker Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">DigiLocker</h1>
                <p className="text-orange-100 text-sm">Government of India</p>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to DigiLocker</h2>
            <p className="text-gray-600 text-sm mb-6">
              Access your digital documents securely
            </p>

            {/* Attributes to Verify */}
            <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-xs text-orange-600 uppercase font-semibold mb-2">Attributes to Verify</p>
              <div className="flex flex-wrap gap-2">
                {pendingAttrs.map((attr, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                  >
                    {formatAttributeName(attr)}
                  </span>
                ))}
              </div>
            </div>

            {/* Aadhaar Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhaar Number / Mobile / Username
              </label>
              <input
                type="text"
                placeholder="Enter Aadhaar / Mobile / Username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>

            {/* PIN Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security PIN
              </label>
              <input
                type="password"
                placeholder="Enter your PIN"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In with DigiLocker
            </button>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-sm text-gray-500">or sign in with</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Alternative Sign In */}
            <button className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              Sign in with Aadhaar OTP
            </button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secured by Government of India</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-white rounded-xl shadow-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gray-800 font-medium">What is DigiLocker?</p>
              <p className="text-xs text-gray-600 mt-1">
                DigiLocker is a secure cloud-based platform by the Government of India for storing and verifying documents digitally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
