import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">✓</span>
          </div>
          <span className="font-bold text-xl text-gray-900">SRVS</span>
        </button>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => navigate('/signin')}
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition"
          >
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}
