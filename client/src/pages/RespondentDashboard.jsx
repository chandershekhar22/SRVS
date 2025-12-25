import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RespondentDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [activeTab, setActiveTab] = useState('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyStep, setVerifyStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('linkedin');
  const [attributeToVerify, setAttributeToVerify] = useState(null);

  // Handle clicking on a pending attribute
  const handlePendingAttributeClick = (attr) => {
    if (attr.status === 'pending' || attr.status === 'expiring') {
      setAttributeToVerify(attr);
      setActiveTab('verify');
      setVerifyStep(1);
    }
  };

  // Check if user came from email verification link
  useEffect(() => {
    const showVerification = localStorage.getItem('showVerificationFlow');
    if (showVerification === 'true') {
      setActiveTab('verify');
      // Clear the flag so it doesn't show again on refresh
      localStorage.removeItem('showVerificationFlow');
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

  // Attributes data - values hidden for ZKP privacy, only verification source shown
  const attributes = [
    { name: 'Age', status: 'verified', source: 'via Panel' },
    { name: 'Gender', status: 'verified', source: 'via Panel' },
    { name: 'Location', status: 'verified', source: 'via Panel' },
    { name: 'Job Title', status: 'verified', source: 'via LinkedIn' },
    { name: 'Industry', status: 'verified', source: 'via LinkedIn' },
    { name: 'Company Size', status: 'pending', source: 'via Pending' },
    { name: 'HHI', status: 'verified', source: 'via Document' },
    { name: 'Vehicle Owner', status: 'expiring', source: 'via Document' },
  ];

  const verifiedCount = attributes.filter(a => a.status === 'verified').length;
  const pendingCount = attributes.filter(a => a.status === 'pending' || a.status === 'expiring').length;

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'attributes', label: 'Verified Attributes', icon: '🏆' },
    { id: 'consent', label: 'Consent Settings', icon: '🔒' },
    { id: 'history', label: 'Verification History', icon: '🕐' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900">SRVS</span>
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                    activeTab === item.id
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeTab === 'settings'
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">⚙️</span>
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
                  onClick={() => setActiveTab('verify')}
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
                <button
                  onClick={() => setActiveTab('verify')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Verify More
                </button>
              </div>

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
                  <p className="text-gray-500 mb-6">Select how you'd like to verify your attributes</p>

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
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Recommended</span>
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
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-semibold text-gray-900">Document Upload</span>
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

              {/* Step 3: Placeholder for next step */}
              {verifyStep === 3 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification in Progress</h1>
                  <p className="text-gray-500 mb-6">Connect your {selectedMethod === 'linkedin' ? 'LinkedIn' : selectedMethod === 'email' ? 'Work Email' : 'Documents'} to verify your attributes.</p>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setVerifyStep(2)}
                      className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setVerifyStep(1);
                        setAttributeToVerify(null);
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      Complete Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
