// API Configuration
// Uses environment variables in production, falls back to localhost for development

export const config = {
  // Main backend API URL (Express server on Render)
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',

  // Mock API URL (for panel API simulation)
  MOCK_API_URL: import.meta.env.VITE_MOCK_API_URL || 'http://localhost:3001',

  // LinkedIn OAuth redirect URI
  LINKEDIN_REDIRECT_URI: import.meta.env.VITE_LINKEDIN_REDIRECT_URI || 'http://localhost:5173/auth/linkedin/callback',
};

export default config;
