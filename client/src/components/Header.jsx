import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <img
            src="/quidinsights-logo.png"
            alt="Quidinsights"
            className="h-10 object-contain transition-all duration-200 group-hover:brightness-110"
          />
        </button>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => navigate('/signin')}
            className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2.5 rounded-lg hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium"
          >
            Get Started
          </button>
        </div>
      </nav>
    </header>
  );
}
