import React from 'react';
import { useLocation } from 'react-router-dom';

export default function VerificationSuccess() {
  const location = useLocation();
  const { respondentId, zkpResult } = location.state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-green-600">&#10003;</span>
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

          {respondentId && (
            <div className="mb-6 p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-purple-600 uppercase font-semibold mb-1">Verified Respondent ID</p>
              <p className="font-mono text-lg text-purple-800 font-bold">{respondentId}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Privacy Protected:</span> No personal information was stored.
              Your verification is complete and you can safely close this page.
            </p>
          </div>

          <p className="text-gray-500 text-sm">
            Thank you for completing the verification process.
          </p>
        </div>
      </div>
    </div>
  );
}
