import React from 'react';

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20 px-4">
      <div className="container mx-auto text-center max-w-4xl">
       
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          Verify Survey Respondents
        </h1>
        
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-6">
          Without Compromising Privacy
        </h2>
        
        <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
          SRVS uses Zero-Knowledge Proofs to verify respondent attributes while keeping their personal data completely private. GDPR & CCPA compliant by design.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition">
            → Start Free Trial
          </button>
          <button className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:border-gray-400 transition">
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
}
