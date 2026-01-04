import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20 px-4">
      <div className="container mx-auto text-center max-w-4xl">


        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
          <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">TrueProof</span> uses{' '}
          <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 bg-clip-text text-transparent">Zero-Knowledge Proofs</span>
        </h1>

        <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-700 mb-6">
          to Verify Respondent Attributes
        </h2>

        <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
          Quidinsights uses TrueProofs to verify respondent attributes while keeping their personal data completely private. GDPR & CCPA compliant by design.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/how-to-guide"
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
          >
            → How To Guide
          </Link>
          <button className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:border-gray-400 transition">
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
}
