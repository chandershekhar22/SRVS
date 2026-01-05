import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../config';

// Attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// Function to format attribute name for display
const formatAttributeName = (attr) => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Verify() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    // Use the real server for verification (not mock-api)
    const serverUrl = config.API_URL;

    try {
      const response = await fetch(`${serverUrl}/api/verify/${token}`);

      if (response.ok) {
        const data = await response.json();
        setTokenData(data);
        setLoading(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid or expired verification link');
        setLoading(false);
      }
    } catch (err) {
      setError('Cannot connect to verification server. Please try again later.');
      setLoading(false);
    }
  };

  const handleContinueToSignup = () => {
    // Save attributes and recommended methods to localStorage for the verification flow
    localStorage.setItem('attributesRequiringProof', JSON.stringify(tokenData.attributesRequiringProof || []));
    localStorage.setItem('recommendedVerificationMethods', JSON.stringify(tokenData.recommendedVerificationMethods || ['linkedin']));
    localStorage.setItem('showVerificationFlow', 'true');
    localStorage.setItem('verificationToken', token);
    localStorage.setItem('respondentId', tokenData.respondentId);

    // If this is a partial verification, go directly to verification dashboard
    if (tokenData.isPartialVerification) {
      localStorage.setItem('alreadyVerifiedAttributes', JSON.stringify(tokenData.alreadyVerifiedAttributes || []));
      navigate('/verification-dashboard', {
        state: {
          fromVerification: true,
          token: token,
          respondentId: tokenData.respondentId,
          attributesRequiringProof: tokenData.attributesRequiringProof,
          alreadyVerifiedAttributes: tokenData.alreadyVerifiedAttributes || [],
          recommendedVerificationMethods: tokenData.recommendedVerificationMethods
        }
      });
      return;
    }

    // Navigate to signup with verification data for one-time ZKP verification
    // No credentials will be stored - just verify and redirect to home
    navigate('/signup', {
      state: {
        fromVerification: true,
        token: token,
        respondentId: tokenData.respondentId,
        // ZKP query for display
        zkpQuery: tokenData.zkpQuery,
        attributesRequiringProof: tokenData.attributesRequiringProof,
        recommendedVerificationMethods: tokenData.recommendedVerificationMethods
      }
    });
  };

  const handleCopyRespondentId = () => {
    navigator.clipboard.writeText(tokenData?.respondentId || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Validating verification link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${tokenData?.isPartialVerification ? 'bg-orange-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <span className={`text-3xl ${tokenData?.isPartialVerification ? 'text-orange-600' : 'text-green-600'}`}>
              {tokenData?.isPartialVerification ? '⏳' : '✓'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {tokenData?.isPartialVerification ? 'Welcome Back!' : 'Credentials Verified!'}
          </h1>
          <p className="text-gray-600">
            {tokenData?.isPartialVerification
              ? 'Complete your remaining verification to unlock full access'
              : 'Your credentials have been successfully verified'}
          </p>
        </div>

        {/* Respondent ID - PROMINENTLY DISPLAYED */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 mb-6 text-center">
          <p className="text-purple-200 text-sm uppercase font-semibold mb-2 tracking-wide">Your Respondent ID</p>
          <p className="text-white text-2xl font-bold font-mono tracking-wider mb-3">
            {tokenData?.respondentId}
          </p>
          <button
            onClick={handleCopyRespondentId}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition"
          >
            Copy ID
          </button>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> This is a one-time verification process. Your Respondent ID will be used to verify your identity without storing any credentials.
          </p>
        </div>

        {/* Zero-Knowledge Proof Notice */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">Zero-Knowledge Proof System</h2>
          <p className="text-sm text-gray-600">
            Your identity is protected. Only your Respondent ID is used - no personal information or credentials are stored in our system.
          </p>
        </div>

        {/* Already Verified Attributes (for partial verification) */}
        {tokenData?.isPartialVerification && tokenData?.alreadyVerifiedAttributes?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-green-600 uppercase mb-3">✓ Already Verified</h2>
            <div className="flex flex-wrap gap-2">
              {tokenData.alreadyVerifiedAttributes.map((attr, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800"
                >
                  {formatAttributeName(attr)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attributes to Verify */}
        {tokenData?.attributesRequiringProof?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              {tokenData?.isPartialVerification ? '⏳ Remaining to Verify' : 'Attributes to Verify'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {tokenData.attributesRequiringProof.map((attr, idx) => {
                const isLinkedInAttr = LINKEDIN_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'));
                return (
                  <span
                    key={idx}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      isLinkedInAttr
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {formatAttributeName(attr)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Privacy Note:</span> No account will be created. No credentials will be stored.
            After verification, you will be redirected to the home page.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleContinueToSignup}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg transition shadow-lg ${
            tokenData?.isPartialVerification
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
          }`}
        >
          {tokenData?.isPartialVerification ? 'Continue to Dashboard →' : 'Complete Verification'}
        </button>
      </div>
    </div>
  );
}
