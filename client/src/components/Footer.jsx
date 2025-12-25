import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <section className="bg-white py-16 px-4 border-t border-gray-100">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Ready to Get Started?</h2>
        <button 
          onClick={() => navigate('/signup')}
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition"
        >
          → Create Free Account
        </button>
      </div>
    </section>
  );
}
