import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import config from '../config';

// Attribute categories for verification method
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

export default function Signup() {
  const location = useLocation();
  const verificationData = location.state;

  // If coming from verification link, show multi-step verification flow
  const isFromEmailVerification = verificationData?.fromVerification;

  // For email-verified: steps are 1=ID, 2=Consent, 3=Method, 4=Complete
  // For regular signup: steps are 1=Role, 2=Details
  const [verifyStep, setVerifyStep] = useState(1);
  const [step, setStep] = useState(isFromEmailVerification ? 2 : 1);
  const [selectedRole, setSelectedRole] = useState(isFromEmailVerification ? 'respondent-verified' : null);
  const [selectedMethod, setSelectedMethod] = useState('linkedin');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    respondentId: verificationData?.respondentId || '',
  });
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [zkpResult, setZkpResult] = useState(null);
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const respondentVerification = verificationData || null;

  const roles = [
    {
      id: 'panel',
      title: 'Panel Company',
      description: 'Manage attributes verification of your community members',
      icon: '🏢',
      color: 'from-purple-600 to-purple-700'
    },
    {
      id: 'insight',
      title: 'Insight Company',
      description: 'Access verified respondents and conduct surveys with confidence',
      icon: '📊',
      color: 'from-blue-600 to-blue-700'
    },
    {
      id: 'respondent',
      title: 'Panelist',
      description: 'Participate in surveys and earn rewards with verified credentials',
      icon: '👤',
      color: 'from-green-600 to-green-700'
    }
  ];

  // Get recommended methods from verification data
  const recommendedMethods = respondentVerification?.recommendedVerificationMethods || ['linkedin'];

  const verificationMethods = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Verify via your LinkedIn profile',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      recommended: recommendedMethods.includes('linkedin')
    },
    {
      id: 'email',
      name: 'Work Email',
      description: 'Verify via your work email address',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      recommended: recommendedMethods.includes('email')
    },
    {
      id: 'document',
      name: 'Document Upload',
      description: 'Upload supporting documents (ID, certificates)',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      recommended: recommendedMethods.includes('document')
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle verification flow for email-verified respondents
  const handleVerifyStepNext = () => {
    if (verifyStep === 1) {
      // Validate Respondent ID
      if (!formData.respondentId) {
        setError('Respondent ID is required');
        return;
      }
      if (respondentVerification?.respondentId && formData.respondentId !== respondentVerification.respondentId) {
        setError('Respondent ID does not match the verification link');
        return;
      }
      setError('');
      setVerifyStep(2);
    } else if (verifyStep === 2) {
      // Consent given, move to method selection
      setVerifyStep(3);
    } else if (verifyStep === 3) {
      // Method selected, move to login/upload step
      setVerifyStep(4);
    }
  };

  const handleVerifyStepBack = () => {
    if (verifyStep > 1) {
      setVerifyStep(verifyStep - 1);
    }
  };

  const handleCompleteVerification = async () => {
    setVerifying(true);
    setError('');

    try {
      // Get attributes that will be verified based on the selected method
      const attributesRequiringProof = respondentVerification?.attributesRequiringProof || [];
      let verifiedAttributes = [];

      if (selectedMethod === 'linkedin') {
        verifiedAttributes = attributesRequiringProof.filter(attr =>
          LINKEDIN_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'))
        );
      } else if (selectedMethod === 'document') {
        verifiedAttributes = attributesRequiringProof.filter(attr =>
          DOCUMENT_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'))
        );
      } else if (selectedMethod === 'email') {
        // Email verification typically verifies all attributes
        verifiedAttributes = attributesRequiringProof;
      }

      // Use the real server for verification (not mock-api)
      const serverUrl = config.API_URL;
      const response = await fetch(`${serverUrl}/api/verify/${respondentVerification.token}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proofData: {
            completedAt: new Date().toISOString(),
            method: selectedMethod
          },
          verifiedAttributes: verifiedAttributes,
          verificationMethod: selectedMethod
        })
      });

      if (!response.ok) {
        setError('Failed to complete verification. Please try again.');
        setVerifying(false);
        return;
      }

      const responseData = await response.json();

      // Update local panelists data with server response
      const panelists = JSON.parse(localStorage.getItem('panelists') || '[]');
      const updatedPanelists = panelists.map(p => {
        if (p.id === formData.respondentId) {
          return {
            ...p,
            proofStatus: responseData.proofStatus || 'verified',
            verificationStatus: responseData.proofStatus || 'verified',
            zkpResult: responseData.zkpResult || 'Yes',
            verifiedAttributes: responseData.verifiedAttributes || verifiedAttributes,
            verificationMethod: selectedMethod
          };
        }
        return p;
      });
      localStorage.setItem('panelists', JSON.stringify(updatedPanelists));

      setZkpResult(responseData.zkpResult);
      setVerificationComplete(true);
      setVerifying(false);

      // Navigate to verification success page
      navigate('/verification-success', {
        state: {
          respondentId: formData.respondentId,
          zkpResult: responseData.zkpResult,
          proofStatus: responseData.proofStatus
        }
      });

    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to connect to verification server.');
      setVerifying(false);
    }
  };

  const handleRegularSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`${config.API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to create account. Please try again.');
        return;
      }

      // Save token and user to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // Navigate to dashboard based on role
      navigate(`/dashboard/${data.user.role}`, { state: data.user });

    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to server. Please try again later.');
    }
  };

  const handleBackToRoles = () => {
    setStep(1);
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '', respondentId: '' });
    setSelectedRole(null);
    setError('');
  };

  // ============== EMAIL-VERIFIED RESPONDENT FLOW ==============
  if (isFromEmailVerification) {
    // Verification Complete Screen
    if (verificationComplete) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-green-600">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Verification Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your identity has been successfully verified using Zero-Knowledge Proof.
            </p>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 uppercase font-semibold mb-2">ZKP Query Result</p>
              <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold ${
                zkpResult === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {zkpResult === 'Yes' ? 'Criteria Met' : 'Criteria Not Met'}
              </div>
            </div>

            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-purple-600 uppercase font-semibold mb-1">Verified Respondent ID</p>
              <p className="font-mono text-lg text-purple-800 font-bold">{formData.respondentId}</p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">Privacy Protected:</span> No personal information was stored.
                Your verification is complete and this session will end.
              </p>
            </div>

            <p className="text-gray-500 text-sm mb-4">Redirecting to home page in 5 seconds...</p>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold transition hover:shadow-lg"
            >
              Go to Home Now
            </button>
          </div>
        </div>
      );
    }

    // Multi-step Verification Flow
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="py-12 px-4">
          <div className="container mx-auto max-w-2xl">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-20 rounded-full transition-all ${
                      s <= verifyStep ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-sm text-gray-500">Step {verifyStep} of 4</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* Step 1: Respondent ID */}
              {verifyStep === 1 && (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">🔐</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Your Identity</h2>
                    <p className="text-gray-600">Enter your Respondent ID from the verification email</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Respondent ID
                    </label>
                    <input
                      type="text"
                      name="respondentId"
                      value={formData.respondentId}
                      onChange={handleInputChange}
                      placeholder="RSP-XXXX-XXXX"
                      readOnly={!!respondentVerification?.respondentId}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-lg ${
                        respondentVerification?.respondentId ? 'bg-gray-50' : ''
                      }`}
                    />
                  </div>

                  {/* Attributes to Verify */}
                  {respondentVerification?.attributesRequiringProof?.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">Attributes to Verify:</p>
                      <div className="flex flex-wrap gap-2">
                        {respondentVerification.attributesRequiringProof.map((attr, idx) => (
                          <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                            {attr.charAt(0).toUpperCase() + attr.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyStepNext}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Step 2: Consent Screen */}
              {verifyStep === 2 && (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Attributes</h2>
                    <p className="text-gray-600">Your data stays private with Zero-Knowledge Proofs</p>
                  </div>


                  <div className="mb-8 p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-4">How it works:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-gray-700">Your actual data is never shared</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-gray-700">Only binary yes/no results are transmitted</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-gray-700">Cryptographically proven, tamper-proof</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-gray-700">GDPR & CCPA compliant by design</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleVerifyStepBack}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span>←</span> Back
                    </button>
                    <button
                      onClick={handleVerifyStepNext}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <span>→</span> I Consent - Continue
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Choose Verification Method */}
              {verifyStep === 3 && (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Verification Method</h2>
                    <p className="text-gray-600">Select how you'd like to verify your attributes</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {verificationMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full p-4 rounded-xl border-2 transition flex items-center justify-between ${
                          selectedMethod === method.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            selectedMethod === method.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {method.icon}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{method.name}</span>
                              {method.recommended && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id ? 'border-purple-500' : 'border-gray-300'
                        }`}>
                          {selectedMethod === method.id && (
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleVerifyStepBack}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <span>←</span> Back
                    </button>
                    <button
                      onClick={handleVerifyStepNext}
                      disabled={verifying}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {verifying ? 'Verifying...' : (
                        <>
                          <span>→</span> Continue
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: LinkedIn Login / Document Upload / Work Email */}
              {verifyStep === 4 && selectedMethod === 'linkedin' && (
                <div className="max-w-md mx-auto">
                  {/* LinkedIn Header */}
                  <div className="bg-[#0077B5] rounded-t-xl px-8 py-6 text-center">
                    <svg className="w-10 h-10 text-white mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <h2 className="text-white text-xl font-semibold">Connect with LinkedIn</h2>
                  </div>

                  {/* OAuth Connect */}
                  <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-8">
                    <p className="text-gray-600 text-sm text-center mb-6">
                      Connect your LinkedIn account to verify your professional attributes securely via OAuth.
                    </p>

                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Secure OAuth Authentication</p>
                          <p className="text-xs text-blue-600 mt-1">
                            You'll be redirected to LinkedIn to sign in. We never see your password.
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        setIsLoggingIn(true);
                        setError('');
                        try {
                          // Use the real server for LinkedIn OAuth (not mock-api)
                          const serverUrl = config.API_URL;

                          // Store verification data for callback
                          localStorage.setItem('pendingLinkedInVerification', JSON.stringify({
                            respondentId: formData.respondentId,
                            token: respondentVerification?.token
                          }));

                          // Get LinkedIn auth URL from real backend
                          const response = await fetch(
                            `${serverUrl}/api/auth/linkedin?verificationToken=${respondentVerification?.token}`
                          );
                          const data = await response.json();

                          if (data.success && data.authUrl) {
                            // Redirect to LinkedIn OAuth
                            window.location.href = data.authUrl;
                          } else {
                            setError(data.error || 'Failed to initialize LinkedIn authentication');
                            setIsLoggingIn(false);
                          }
                        } catch (err) {
                          console.error('LinkedIn auth error:', err);
                          setError('Failed to connect to server. Please try again.');
                          setIsLoggingIn(false);
                        }
                      }}
                      disabled={isLoggingIn}
                      className="w-full py-3 bg-[#0077B5] text-white rounded-full font-semibold hover:bg-[#006097] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoggingIn ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          Continue with LinkedIn
                        </>
                      )}
                    </button>

                    <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                      <p className="text-gray-500 text-xs">
                        By continuing, you agree to share your professional information for verification purposes.
                      </p>
                    </div>

                    {/* Back Button */}
                    <button
                      onClick={() => setVerifyStep(3)}
                      className="mt-6 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to verification methods
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Document Upload - Navigate to DigiLocker */}
              {verifyStep === 4 && selectedMethod === 'document' && (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify via DigiLocker</h2>
                    <p className="text-gray-600">Securely verify your documents through Government of India's DigiLocker</p>
                  </div>

                  <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm text-orange-700 mb-2">
                      <span className="font-semibold">Attributes to verify:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {respondentVerification?.attributesRequiringProof?.filter(attr =>
                        DOCUMENT_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'))
                      ).map((attr, idx) => (
                        <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          {attr.charAt(0).toUpperCase() + attr.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Privacy Note:</span> Your documents are verified directly through DigiLocker. No documents are stored on our servers.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      // Create session and navigate to DigiLocker verification
                      const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours
                      const sessionExpiry = new Date(Date.now() + SESSION_DURATION).toISOString();

                      const sessionData = {
                        respondentId: formData.respondentId,
                        verificationToken: respondentVerification?.token,
                        attributesRequiringProof: respondentVerification?.attributesRequiringProof || [],
                        verifiedMethods: [],
                        sessionExpiry: sessionExpiry
                      };

                      // Store session and navigate
                      localStorage.setItem('verificationSession', JSON.stringify(sessionData));
                      localStorage.setItem('pendingLinkedInVerification', JSON.stringify({
                        respondentId: formData.respondentId
                      }));

                      navigate('/verify-document', { state: sessionData });
                    }}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
                    </svg>
                    Continue with DigiLocker
                  </button>

                  <button
                    onClick={() => setVerifyStep(3)}
                    className="mt-4 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to verification methods
                  </button>
                </>
              )}

              {/* Step 4: Work Email */}
              {verifyStep === 4 && selectedMethod === 'email' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Work Email</h2>
                  <p className="text-gray-600 mb-6">Enter your work email to receive a verification link</p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Email Address</label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setIsLoggingIn(true);
                        setTimeout(() => {
                          setIsLoggingIn(false);
                          handleCompleteVerification();
                        }, 1500);
                      }}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                    >
                      Send Verification Link
                    </button>
                  </div>

                  <button
                    onClick={() => setVerifyStep(3)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============== REGULAR SIGNUP FLOW ==============
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {step === 1 ? (
        // Role Selection Step
        <div className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Get started with Trueproof</h1>
              <p className="text-xl text-gray-600">Select your role and create your account</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group p-8 rounded-xl bg-white border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition duration-300 text-left"
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition">
                    {role.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{role.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Account Details Step
        <div className="py-20 px-4">
          <div className="container mx-auto max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-8">
                <button
                  onClick={handleBackToRoles}
                  className="text-purple-600 hover:text-purple-700 font-semibold text-sm mb-6"
                >
                  ← Back to Roles
                </button>

                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                <p className="text-gray-600">{roles.find(r => r.id === selectedRole)?.title}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegularSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

               <div>
  <label className="block text-sm font-medium text-gray-900 mb-2">
    Password
  </label>

  <input
    type="password"
    name="password"
    value={formData.password}
    onChange={handleInputChange}
    placeholder="••••••••"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
  />

  {formData.password.length > 0 && formData.password.length < 6 && (
    <p className="text-xs text-red-500 mt-1">
      Must be at least 6 characters
    </p>
  )}
</div>


                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition mt-6"
                >
                  Create Account
                </button>
              </form>

              <p className="text-center text-gray-600 text-sm mt-6">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signin')}
                  className="text-purple-600 font-semibold hover:text-purple-700"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
