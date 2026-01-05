import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import config from '../config';

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate input
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${config.API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Invalid email or password. Please check and try again.');
        setLoading(false);
        return;
      }

      // Save token and user to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      // Navigate to dashboard based on role
      navigate(`/dashboard/${data.user.role}`, { state: data.user });

    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="py-20 px-4">
        <div className="container mx-auto max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your Trueproof account</p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-xs text-purple-700">
                Sign in using your email and password for Panel, Insight, or Respondent accounts.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email Address
                </label>
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
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-purple-600 hover:text-purple-700 font-semibold">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-6">
              Don't have an account?{' '}
              <a
                href="/signup"
                className="font-semibold hover:opacity-80 text-purple-600"
              >
                Sign Up
              </a>
            </p>

           
          </div>

          {/* Demo Info */}
         
        </div>
      </div>
    </div>
  );
}
