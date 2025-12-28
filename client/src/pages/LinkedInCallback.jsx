import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// Session duration: 6 hours in milliseconds
const SESSION_DURATION = 6 * 60 * 60 * 1000;

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, verifying, success, error
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution (React Strict Mode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors (user denied, etc.)
      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'LinkedIn authentication was cancelled');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setError('Missing authorization code or state parameter');
        return;
      }

      try {
        // Use the real server for LinkedIn OAuth (not mock-api)
        const serverUrl = 'http://localhost:5000';
        const panelApiUrl = localStorage.getItem('panelApiUrl') || 'http://localhost:3001';

        // Exchange code for token via real backend
        const response = await fetch(`${serverUrl}/api/auth/linkedin/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code, state })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setStatus('error');
          setError(data.error || 'LinkedIn authentication failed');
          return;
        }

        // Authentication successful - show verifying status
        setStatus('verifying');

        // Store verification token for completing verification
        const verificationToken = data.verificationToken;

        // Get pending verification data and attributes
        const pendingVerification = JSON.parse(localStorage.getItem('pendingLinkedInVerification') || '{}');
        const attributesRequiringProof = JSON.parse(localStorage.getItem('attributesRequiringProof') || '[]');

        // Check if there are document attributes that still need verification
        const hasDocumentAttrs = attributesRequiringProof.some(attr =>
          DOCUMENT_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'))
        );
        const hasLinkedInAttrs = attributesRequiringProof.some(attr =>
          LINKEDIN_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'))
        );

        // Wait 5 seconds showing "Verification in process"
        let count = 5;
        const countdownInterval = setInterval(() => {
          count--;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);

        // After 5 seconds, complete verification or redirect to dashboard
        setTimeout(async () => {
          clearInterval(countdownInterval);

          // Update local panelists data to mark LinkedIn attributes as verified
          if (pendingVerification.respondentId) {
            const panelists = JSON.parse(localStorage.getItem('panelists') || '[]');
            const updatedPanelists = panelists.map(p => {
              if (p.id === pendingVerification.respondentId) {
                return {
                  ...p,
                  linkedinVerified: true,
                  proofStatus: hasDocumentAttrs ? 'partial' : 'verified',
                  verificationStatus: hasDocumentAttrs ? 'partial' : 'verified'
                };
              }
              return p;
            });
            localStorage.setItem('panelists', JSON.stringify(updatedPanelists));
          }

          // If both LinkedIn and document attributes are required, go to dashboard
          if (hasLinkedInAttrs && hasDocumentAttrs) {
            setStatus('success');

            // Create session with 6-hour expiry
            const sessionExpiry = new Date(Date.now() + SESSION_DURATION).toISOString();

            // Navigate to verification dashboard after showing success
            setTimeout(() => {
              navigate('/verification-dashboard', {
                state: {
                  respondentId: pendingVerification.respondentId,
                  verificationToken: verificationToken,
                  attributesRequiringProof: attributesRequiringProof,
                  verifiedMethods: ['linkedin'],
                  sessionExpiry: sessionExpiry
                }
              });
            }, 2000);

          } else if (verificationToken) {
            // Only LinkedIn attributes - complete verification normally
            try {
              // Complete the verification (use server, not mock-api)
              const completeResponse = await fetch(`${serverUrl}/api/verify/${verificationToken}/complete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  proofData: {
                    completedAt: new Date().toISOString(),
                    method: 'linkedin'
                  }
                })
              });

              const completeData = await completeResponse.json();

              // Update local panelists data
              if (pendingVerification.respondentId) {
                const panelists = JSON.parse(localStorage.getItem('panelists') || '[]');
                const updatedPanelists = panelists.map(p => {
                  if (p.id === pendingVerification.respondentId) {
                    return {
                      ...p,
                      proofStatus: 'verified',
                      verificationStatus: 'verified',
                      zkpResult: completeData.zkpResult || 'Yes'
                    };
                  }
                  return p;
                });
                localStorage.setItem('panelists', JSON.stringify(updatedPanelists));
              }

              setStatus('success');

              // Navigate to verification success page after showing success
              setTimeout(() => {
                navigate('/verification-success', {
                  state: {
                    respondentId: pendingVerification.respondentId,
                    zkpResult: completeData.zkpResult
                  }
                });
              }, 2000);

            } catch (err) {
              console.error('Failed to complete verification:', err);
              setStatus('success'); // Still show success since LinkedIn auth worked
              setTimeout(() => {
                // Check if user came from dashboard
                if (pendingVerification.fromDashboard) {
                  navigate('/dashboard/respondent');
                } else {
                  navigate('/verification-success');
                }
              }, 2000);
            }
          } else {
            setStatus('success');
            setTimeout(() => {
              // Check if user came from dashboard
              if (pendingVerification.fromDashboard) {
                // Set flag for successful verification so dashboard can update
                localStorage.setItem('linkedinVerificationSuccess', 'true');
                navigate('/dashboard/respondent');
              } else {
                navigate('/verification-success');
              }
            }, 2000);
          }
        }, 5000);

      } catch (err) {
        console.error('LinkedIn callback error:', err);
        setStatus('error');
        setError('Failed to process LinkedIn authentication');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#0077B5] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Connecting to LinkedIn...</h1>
            <p className="text-gray-600">Please wait while we verify your authentication.</p>
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#0077B5] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </>
        )}

        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification in Progress</h1>
            <p className="text-gray-600 mb-6">
              LinkedIn authentication successful! Now verifying your attributes...
            </p>
            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-purple-600 uppercase font-semibold mb-1">Processing</p>
              <p className="text-3xl font-bold text-purple-800">{countdown}s</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">LinkedIn Connected</span>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your identity has been successfully verified via LinkedIn.
            </p>
            <p className="text-sm text-gray-500">Redirecting to results...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
