import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';

// Attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// Function to get recommended verification methods based on attributes
const getRecommendedMethods = (attrs) => {
  if (!attrs || attrs.length === 0) return ['linkedin'];

  const hasDocumentAttrs = attrs.some(a => DOCUMENT_ATTRIBUTES.includes(a.toLowerCase().replace(' ', '_')));
  const hasLinkedInAttrs = attrs.some(a => LINKEDIN_ATTRIBUTES.includes(a.toLowerCase().replace(' ', '_')));

  if (hasDocumentAttrs && hasLinkedInAttrs) {
    return ['linkedin', 'document'];
  } else if (hasLinkedInAttrs) {
    return ['linkedin'];
  } else if (hasDocumentAttrs) {
    return ['document'];
  }
  return ['linkedin'];
};

// Function to format attribute name for display
const formatAttributeName = (attr) => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function RespondentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [activeTab, setActiveTab] = useState('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyStep, setVerifyStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('linkedin');
  const [attributeToVerify, setAttributeToVerify] = useState(null);
  const [attributesRequiringProof, setAttributesRequiringProof] = useState([]);
  const [recommendedMethods, setRecommendedMethods] = useState(['linkedin']);
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [relatedAttributes, setRelatedAttributes] = useState([]);
  const [digiLockerStep, setDigiLockerStep] = useState('login'); // 'login', 'verifying', 'complete'

  // Handle clicking on a pending attribute
  const handlePendingAttributeClick = (attr) => {
    if (attr.status === 'pending' || attr.status === 'expiring') {
      const attrName = attr.name.toLowerCase().replace(' ', '_');
      setAttributeToVerify(attr);
      setAttributesRequiringProof([attrName]);

      // Set required documents for this attribute
      if (attr.requiredDocs) {
        setRequiredDocuments(attr.requiredDocs);
        setUploadedDocuments({});
      }

      // Find all related attributes with the same verification method
      const related = attributes.filter(a =>
        (a.status === 'pending' || a.status === 'expiring') &&
        a.verifyMethod === attr.verifyMethod
      );
      setRelatedAttributes(related);

      const methods = getRecommendedMethods([attrName]);
      setRecommendedMethods(methods);

      // Auto-select the appropriate method based on attribute
      if (attr.verifyMethod) {
        setSelectedMethod(attr.verifyMethod);
      } else {
        setSelectedMethod(methods[0]);
      }

      setActiveTab('verify');
      setVerifyStep(1);
    }
  };

  // Check if user came from email verification link and load attributes
  useEffect(() => {
    const showVerification = localStorage.getItem('showVerificationFlow');
    if (showVerification === 'true') {
      setActiveTab('verify');
      // Clear the flag so it doesn't show again on refresh
      localStorage.removeItem('showVerificationFlow');
    }

    // Load attributes requiring proof from user data or localStorage
    const savedAttributes = localStorage.getItem('attributesRequiringProof');
    const savedRecommendedMethods = localStorage.getItem('recommendedVerificationMethods');

    if (savedAttributes) {
      try {
        const attrs = JSON.parse(savedAttributes);
        setAttributesRequiringProof(attrs);
        // Calculate recommended methods
        const methods = getRecommendedMethods(attrs);
        setRecommendedMethods(methods);
        // Set default selection to first recommended method
        setSelectedMethod(methods[0]);
      } catch (e) {
        console.error('Error parsing attributes:', e);
      }
    }

    if (savedRecommendedMethods) {
      try {
        const methods = JSON.parse(savedRecommendedMethods);
        setRecommendedMethods(methods);
        setSelectedMethod(methods[0]);
      } catch (e) {
        console.error('Error parsing recommended methods:', e);
      }
    }
  }, []);

  // Get user initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get member since year
  const getMemberYear = () => {
    if (user.createdAt) {
      return new Date(user.createdAt).getFullYear();
    }
    return new Date().getFullYear();
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  // Default attributes data for new respondents
  const defaultAttributes = [
    { name: 'Age', status: 'pending', source: 'via Pending', verifyMethod: 'document', requiredDocs: ['ID Card', 'Birth Certificate'] },
    { name: 'Gender', status: 'verified', source: 'via Panel' },
    { name: 'Location', status: 'verified', source: 'via Panel' },
    { name: 'Job Title', status: 'pending', source: 'via Pending', verifyMethod: 'linkedin', requiredDocs: ['LinkedIn Profile'] },
    { name: 'Industry', status: 'pending', source: 'via Pending', verifyMethod: 'linkedin', requiredDocs: ['LinkedIn Profile'] },
    { name: 'Company Size', status: 'verified', source: 'via Panel' },
    { name: 'Income', status: 'pending', source: 'via Pending', verifyMethod: 'document', requiredDocs: ['Pay Stub', 'Tax Return', 'Bank Statement'] },
    { name: 'Education', status: 'pending', source: 'via Pending', verifyMethod: 'document', requiredDocs: ['Degree Certificate', 'Transcript'] },
  ];

  // Get user-specific storage key
  const getUserAttributesKey = () => {
    return `respondentAttributes_${user.id || user.email || 'default'}`;
  };

  // State for attributes - stored per user
  const [attributes, setAttributes] = useState(() => {
    const userKey = `respondentAttributes_${user.id || user.email || 'default'}`;
    const saved = localStorage.getItem(userKey);
    return saved ? JSON.parse(saved) : defaultAttributes;
  });

  // Check if user just came back from LinkedIn OAuth verification
  useEffect(() => {
    const verificationSuccess = localStorage.getItem('linkedinVerificationSuccess');

    // If came back from successful LinkedIn verification
    if (verificationSuccess === 'true') {
      // Mark ALL LinkedIn-related attributes as verified (not just the ones selected)
      setAttributes(prevAttrs => {
        const updated = prevAttrs.map(attr => {
          // Verify all attributes that use LinkedIn as verification method
          if (attr.verifyMethod === 'linkedin' && (attr.status === 'pending' || attr.status === 'expiring')) {
            return {
              ...attr,
              status: 'verified',
              source: 'via LinkedIn'
            };
          }
          return attr;
        });
        // Save to user-specific localStorage
        localStorage.setItem(getUserAttributesKey(), JSON.stringify(updated));
        return updated;
      });

      // Clear the verification flags
      localStorage.removeItem('linkedinVerificationSuccess');
      localStorage.removeItem('pendingLinkedInVerification');
      localStorage.removeItem('attributesRequiringProof');
    }
  }, []);

  const verifiedCount = attributes.filter(a => a.status === 'verified').length;
  const pendingCount = attributes.filter(a => a.status === 'pending' || a.status === 'expiring').length;

  // Get only pending attributes for verification
  const getPendingAttributes = () => {
    return attributes
      .filter(a => a.status === 'pending' || a.status === 'expiring')
      .map(a => a.name.toLowerCase().replace(' ', '_'));
  };

  // Handle clicking "Verify More Attributes" button
  const handleVerifyMoreClick = () => {
    const pendingAttrs = getPendingAttributes();
    setAttributesRequiringProof(pendingAttrs);
    const methods = getRecommendedMethods(pendingAttrs);
    setRecommendedMethods(methods);
    setSelectedMethod(methods[0]);
    setActiveTab('verify');
    setVerifyStep(1);
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile' },
    { id: 'attributes', label: 'Verified Attributes' },
    { id: 'consent', label: 'Consent Settings' },
    { id: 'history', label: 'Verification History' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="/quidinsights-logo.png"
              alt="Quidinsights"
              className="h-12"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main</span>
          </div>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition ${
                    activeTab === item.id
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</span>
          </div>
          <ul>
            <li>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition ${
                  activeTab === 'settings'
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Settings</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-semibold">
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.fullName || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email || 'user@email.com'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="relative w-96">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-gray-50"
              />
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-semibold">
                {getInitials(user.fullName)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* My Profile Tab */}
          {activeTab === 'profile' && (
            <>
              {/* Page Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Verified Profile</h1>
                  <p className="text-gray-500">Welcome back, {user.fullName || 'User'}</p>
                </div>
                <button
                  onClick={handleVerifyMoreClick}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Verify More Attributes
                </button>
              </div>

              {/* Profile Cards Row */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                {/* User Info Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl font-bold">
                      {getInitials(user.fullName)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.fullName || 'User Name'}</h3>
                      <p className="text-gray-500 text-sm">{user.email || 'user@email.com'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      Verified Member
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      Since {getMemberYear()}
                    </span>
                  </div>
                </div>

                {/* Verified Attributes Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">{verifiedCount}</div>
                  <p className="text-gray-500">Verified Attributes</p>
                </div>

                {/* Pending Verification Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">{pendingCount}</div>
                  <p className="text-gray-500">Pending Verification</p>
                </div>
              </div>

              {/* Verification Status Message */}
              {pendingCount === 0 ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">All attributes verified!</p>
                    <p className="text-sm text-green-600">No more attributes to be verified. Your profile is complete.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-800">{pendingCount} attribute{pendingCount > 1 ? 's' : ''} pending verification</p>
                      <p className="text-sm text-yellow-600">Click on pending attributes below to verify them.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attributes.filter(a => a.status === 'pending' || a.status === 'expiring').map((attr, idx) => (
                      <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        {attr.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Your Attributes Preview */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Attributes</h2>
                <div className="grid grid-cols-2 gap-4">
                  {attributes.slice(0, 6).map((attr, index) => (
                    <div
                      key={index}
                      onClick={() => handlePendingAttributeClick(attr)}
                      className={`bg-white rounded-xl border border-gray-200 p-5 ${
                        (attr.status === 'pending' || attr.status === 'expiring')
                          ? 'cursor-pointer hover:border-purple-300 hover:shadow-md transition'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-600">{attr.name}</p>
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            attr.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-700'
                              : attr.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {attr.status}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-lg mb-1">••••••</p>
                      <p className="text-sm text-gray-400">{attr.source}</p>
                      {(attr.status === 'pending' || attr.status === 'expiring') && (
                        <p className="text-xs text-purple-600 mt-2 font-medium">Click to verify</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Verified Attributes Tab */}
          {activeTab === 'attributes' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Verified Attributes</h1>
                {pendingCount > 0 && (
                  <button
                    onClick={handleVerifyMoreClick}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Verify More
                  </button>
                )}
              </div>

              {/* Verification Status Message */}
              {pendingCount === 0 ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">All attributes verified!</p>
                    <p className="text-sm text-green-600">No more attributes to be verified. Your profile is complete.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-800">{pendingCount} attribute{pendingCount > 1 ? 's' : ''} pending verification</p>
                      <p className="text-sm text-yellow-600">Click on pending attributes below to verify them.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attributes.filter(a => a.status === 'pending' || a.status === 'expiring').map((attr, idx) => (
                      <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        {attr.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {attributes.map((attr, index) => (
                  <div
                    key={index}
                    onClick={() => handlePendingAttributeClick(attr)}
                    className={`bg-white rounded-xl border border-gray-200 p-5 ${
                      (attr.status === 'pending' || attr.status === 'expiring')
                        ? 'cursor-pointer hover:border-purple-300 hover:shadow-md transition'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-black-600">{attr.name}</p>
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          attr.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : attr.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {attr.status}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-lg mb-1">••••••</p>
                    <p className="text-sm text-gray-400">{attr.source}</p>
                    {(attr.status === 'pending' || attr.status === 'expiring') && (
                      <p className="text-xs text-purple-600 mt-2 font-medium">Click to verify</p>
                    )}
                  </div>
                ))}
              </div>

              {/* ZKP Info Banner */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-1">Your Privacy is Protected</h3>
                    <p className="text-sm text-purple-700">
                      Your actual attribute values are never shared. Using Zero-Knowledge Proofs,
                      we can verify you meet survey criteria without revealing your personal information.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Consent Settings Tab */}
          {activeTab === 'consent' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Consent Settings</h1>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-500">Manage your data sharing preferences and consent settings here.</p>
              </div>
            </>
          )}

          {/* Verification History Tab */}
          {activeTab === 'history' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Verification History</h1>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-500">View your past verification activities and history.</p>
              </div>
            </>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-gray-500">Manage your account settings and preferences.</p>
              </div>
            </>
          )}

          {/* Verify More Attributes Tab */}
          {activeTab === 'verify' && (
            <div className="max-w-2xl mx-auto">
              {/* Back Button */}
              <button
                onClick={() => {
                  if (verifyStep > 1) {
                    setVerifyStep(verifyStep - 1);
                  } else {
                    setActiveTab('profile');
                    setVerifyStep(1);
                    setAttributeToVerify(null);
                  }
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 mb-12">
                <div className={`flex-1 h-1.5 rounded-full ${verifyStep >= 1 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full ${verifyStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full ${verifyStep >= 3 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full ${verifyStep >= 4 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
              </div>

              {/* Step 1: Consent */}
              {verifyStep === 1 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  {/* Shield Icon */}
                  <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {attributeToVerify ? `Verify ${attributeToVerify.name}` : 'Verify Your Attributes'}
                  </h1>
                  <p className="text-gray-500 mb-8">Your data stays private with Zero-Knowledge Proofs</p>

                  {/* Attribute being verified */}
                  {attributeToVerify && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-yellow-800">Attribute to Verify:</p>
                      <p className="text-lg font-bold text-yellow-900">{attributeToVerify.name}</p>
                    </div>
                  )}

                  {/* How it works */}
                  <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">How it works:</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-gray-600">Your actual data is never shared</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-gray-600">Only binary yes/no results are transmitted</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-gray-600">Cryptographically proven, tamper-proof</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-gray-600">GDPR & CCPA compliant by design</span>
                      </li>
                    </ul>
                  </div>

                  {/* Consent Button */}
                  <button
                    onClick={() => setVerifyStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    I Consent - Continue
                  </button>
                </div>
              )}

              {/* Step 2: Choose Verification Method */}
              {verifyStep === 2 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Verification Method</h1>
                  <p className="text-gray-500 mb-4">Select how you'd like to verify your attributes</p>

                  {/* Show attributes requiring proof */}
                  {attributesRequiringProof.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-sm font-semibold text-blue-800 mb-2">Attributes to Verify:</p>
                      <div className="flex flex-wrap gap-2">
                        {attributesRequiringProof.map((attr, idx) => {
                          const isLinkedInAttr = LINKEDIN_ATTRIBUTES.includes(attr.toLowerCase().replace(' ', '_'));
                          return (
                            <span
                              key={idx}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isLinkedInAttr
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {formatAttributeName(attr)}
                              <span className="ml-1 opacity-60">
                                ({isLinkedInAttr ? 'LinkedIn' : 'Document'})
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendation notice */}
                  {recommendedMethods.length === 2 && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Based on your attributes, we recommend using <strong>both LinkedIn and Document Upload</strong> for complete verification.
                      </p>
                    </div>
                  )}

                  {/* Verification Options */}
                  <div className="space-y-3 mb-8">
                    {/* LinkedIn Option */}
                    <button
                      onClick={() => setSelectedMethod('linkedin')}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${
                        selectedMethod === 'linkedin'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">LinkedIn</span>
                          {recommendedMethods.includes('linkedin') && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Recommended</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Verify via your LinkedIn profile</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === 'linkedin' ? 'border-purple-500' : 'border-gray-300'
                      }`}>
                        {selectedMethod === 'linkedin' && (
                          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                        )}
                      </div>
                    </button>

                    {/* Work Email Option */}
                    <button
                      onClick={() => setSelectedMethod('email')}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${
                        selectedMethod === 'email'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-semibold text-gray-900">Work Email</span>
                        <p className="text-sm text-gray-500">Verify via your work email address</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === 'email' ? 'border-purple-500' : 'border-gray-300'
                      }`}>
                        {selectedMethod === 'email' && (
                          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                        )}
                      </div>
                    </button>

                    {/* Document Upload Option */}
                    <button
                      onClick={() => setSelectedMethod('document')}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition ${
                        selectedMethod === 'document'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Document Upload</span>
                          {recommendedMethods.includes('document') && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Recommended</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Upload supporting documents</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === 'document' ? 'border-purple-500' : 'border-gray-300'
                      }`}>
                        {selectedMethod === 'document' && (
                          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setVerifyStep(1)}
                      className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </button>
                    <button
                      onClick={() => setVerifyStep(3)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: LinkedIn OAuth / Document Upload / Email Verification */}
              {verifyStep === 3 && selectedMethod === 'linkedin' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-md mx-auto">
                  {/* LinkedIn Header */}
                  <div className="bg-[#0077B5] px-8 py-6 text-center">
                    <svg className="w-10 h-10 text-white mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <h2 className="text-white text-xl font-semibold">Connect with LinkedIn</h2>
                  </div>

                  {/* OAuth Connect */}
                  <div className="p-8">
                    <p className="text-gray-600 text-sm text-center mb-6">
                      Connect your LinkedIn account to verify your professional attributes securely via OAuth.
                    </p>

                    {/* All LinkedIn Attributes that will be verified */}
                    {relatedAttributes.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-600 uppercase font-semibold mb-2">Attributes to Verify via LinkedIn</p>
                        <div className="flex flex-wrap gap-2">
                          {relatedAttributes.map((attr, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {attr.name}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          All {relatedAttributes.length} LinkedIn attributes will be verified at once
                        </p>
                      </div>
                    )}

                    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <p className="text-sm text-green-800 font-medium">Secure OAuth Authentication</p>
                          <p className="text-xs text-green-600 mt-1">
                            You'll be redirected to LinkedIn to sign in. We never see your password.
                          </p>
                        </div>
                      </div>
                    </div>

                    {linkedinEmail && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {linkedinEmail}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        setIsLoggingIn(true);
                        setLinkedinEmail('');
                        try {
                          const serverUrl = config.API_URL;

                          // Store pending verification data
                          localStorage.setItem('pendingLinkedInVerification', JSON.stringify({
                            respondentId: user.respondentId || user.id,
                            fromDashboard: true
                          }));

                          // Store all related LinkedIn attributes for callback (verify all at once)
                          const linkedInAttrsToVerify = relatedAttributes.map(a => a.name.toLowerCase().replace(' ', '_'));
                          localStorage.setItem('attributesRequiringProof', JSON.stringify(linkedInAttrsToVerify));

                          // Get LinkedIn auth URL
                          const response = await fetch(`${serverUrl}/api/auth/linkedin`);
                          const data = await response.json();

                          if (data.success && data.authUrl) {
                            window.location.href = data.authUrl;
                          } else {
                            setLinkedinEmail(data.error || 'Failed to initialize LinkedIn authentication');
                            setIsLoggingIn(false);
                          }
                        } catch (err) {
                          console.error('LinkedIn auth error:', err);
                          setLinkedinEmail('Failed to connect to server. Please try again.');
                          setIsLoggingIn(false);
                        }
                      }}
                      disabled={isLoggingIn}
                      className="w-full py-4 bg-[#0077B5] text-white rounded-full font-semibold hover:bg-[#006097] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      onClick={() => setVerifyStep(2)}
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

              {/* Step 3: Document Upload - DigiLocker Flow */}
              {verifyStep === 3 && selectedMethod === 'document' && (
                <>
                  {/* DigiLocker Login Screen */}
                  {digiLockerStep === 'login' && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-md mx-auto">
                      {/* DigiLocker Header */}
                      <div className="bg-gradient-to-r from-[#1a237e] to-[#0d47a1] px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#1a237e]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                            </svg>
                          </div>
                        </div>
                        <h2 className="text-white text-xl font-bold">DigiLocker</h2>
                        <p className="text-blue-100 text-sm mt-1">Government of India</p>
                      </div>

                      {/* Login Form */}
                      <div className="p-8">
                        <p className="text-gray-600 text-sm text-center mb-6">
                          Sign in to DigiLocker to verify your documents securely
                        </p>

                        <div className="space-y-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar / Mobile / Username</label>
                            <input
                              type="text"
                              placeholder="Enter Aadhaar number or mobile"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PIN / Password</label>
                            <input
                              type="password"
                              placeholder="Enter your PIN"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setDigiLockerStep('verifying');
                            // Simulate verification process
                            setTimeout(() => {
                              setDigiLockerStep('complete');
                            }, 3000);
                          }}
                          className="w-full py-4 bg-gradient-to-r from-[#1a237e] to-[#0d47a1] text-white rounded-lg font-semibold hover:from-[#0d47a1] hover:to-[#1a237e] transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Sign In & Verify
                        </button>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                            <span>Secured by</span>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                                <span className="text-white text-xs font-bold">IN</span>
                              </div>
                              <span className="font-medium text-gray-700">Digital India</span>
                            </div>
                          </div>
                        </div>

                        {/* Back Button */}
                        <button
                          onClick={() => {
                            setVerifyStep(2);
                            setDigiLockerStep('login');
                          }}
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

                  {/* Verification Progress Screen */}
                  {digiLockerStep === 'verifying' && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md mx-auto text-center">
                      {/* Animated Progress */}
                      <div className="w-24 h-24 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>

                      <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Documents</h2>
                      <p className="text-gray-500 mb-6">Please wait while we verify your documents from DigiLocker...</p>

                      {/* Progress Steps */}
                      <div className="space-y-3 text-left mb-6">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-800 text-sm">Connected to DigiLocker</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-800 text-sm">Identity verified</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <svg className="animate-spin w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          <span className="text-blue-800 text-sm">Fetching documents...</span>
                        </div>
                      </div>

                      {/* Documents being verified */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Verifying Attributes</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {relatedAttributes.map((attr, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium animate-pulse">
                              {attr.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Complete Screen */}
                  {digiLockerStep === 'complete' && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md mx-auto text-center">
                      {/* Success Icon */}
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Complete!</h2>
                      <p className="text-gray-500 mb-6">All your document-based attributes have been verified successfully via DigiLocker.</p>

                      {/* Verified Attributes */}
                      <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-xs text-green-600 uppercase font-semibold mb-3">Verified Attributes</p>
                        <div className="space-y-2">
                          {relatedAttributes.map((attr, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <span className="text-sm font-medium text-gray-800">{attr.name}</span>
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Verified
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ZKP Notice */}
                      <div className="bg-purple-50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-purple-700">
                          <span className="font-semibold">Zero-Knowledge Proof:</span> Your documents were verified without exposing personal data.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          // Mark all related document attributes as verified
                          setAttributes(prevAttrs => {
                            const updated = prevAttrs.map(attr => {
                              if (attr.verifyMethod === 'document' && (attr.status === 'pending' || attr.status === 'expiring')) {
                                return {
                                  ...attr,
                                  status: 'verified',
                                  source: 'via DigiLocker'
                                };
                              }
                              return attr;
                            });
                            localStorage.setItem(getUserAttributesKey(), JSON.stringify(updated));
                            return updated;
                          });
                          // Navigate to profile/dashboard
                          setActiveTab('profile');
                          setVerifyStep(1);
                          setDigiLockerStep('login');
                        }}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Go to Dashboard
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Work Email */}
              {verifyStep === 3 && selectedMethod === 'email' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Work Email</h1>
                  <p className="text-gray-500 mb-6">Enter your work email to receive a verification link</p>

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
                          setVerifyStep(4);
                        }, 1500);
                      }}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                    >
                      Send Verification Link
                    </button>
                  </div>

                  <button
                    onClick={() => setVerifyStep(2)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </div>
              )}

              {/* Step 4: Verification Success */}
              {verifyStep === 4 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  {/* Success Icon */}
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h1>
                  <p className="text-gray-500 mb-6">
                    Your attributes have been successfully verified via {selectedMethod === 'linkedin' ? 'LinkedIn' : selectedMethod === 'email' ? 'Work Email' : 'Document Upload'}.
                  </p>

                  {/* ZKP Notice */}
                  <div className="bg-purple-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">Zero-Knowledge Proof:</span> Your actual data was never shared. Only the verification status has been recorded.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setVerifyStep(1);
                      setAttributeToVerify(null);
                      setLinkedinEmail('');
                      setLinkedinPassword('');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
