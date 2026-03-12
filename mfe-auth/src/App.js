import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = '497343003625-a7b2pupckv02ae018qoq33hb8jhh8lp4.apps.googleusercontent.com';

function LoginButton() {
  const [loading, setLoading] = useState(false);
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await res.json();
      writeToStore({
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.picture,
      });
      setLoading(false);
    },
    onError: (error) => { console.error('Login failed:', error); setLoading(false); },
  });

  return (
    <button
      onClick={() => login()}
      disabled={loading}
      className="login-btn"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.7-.4-3.9z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/>
      </svg>
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
}

function writeToStore(user) {
  import('shell/store')
    .then(module => {
      const setUser = module.default.getState().setUser;
      setUser({ user, activeTenant: null, roles: [] });
    })
    .catch(err => console.error('store import failed:', err));
}

function App() {
  const handleMockLogin = () => {
    writeToStore({
      id: 'mock-123',
      name: 'Demo User',
      email: 'demo@insaio.com',
      avatar: null,
    });
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-left-circle auth-left-circle--top" />
          <div className="auth-left-circle auth-left-circle--bottom" />

          <div className="fade-in auth-left-content">
            <div className="auth-brand-icon">
              <span>I</span>
            </div>
            <h1 className="auth-heading">
              Smarter claims,<br />faster resolutions.
            </h1>
            <p className="auth-subtitle">
              The unified platform for managing claims, assessments, and customer interactions across all your operations.
            </p>

            <div className="auth-left-stats">
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="fade-in auth-form" style={{ animationDelay: '0.15s' }}>
            <h2 className="auth-welcome">
              Welcome back
            </h2>
            <p className="auth-welcome-sub">
              Sign in to continue to the platform
            </p>

            <LoginButton />

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">OR</span>
              <div className="auth-divider-line" />
            </div>

            <button onClick={handleMockLogin} className="auth-demo-btn">
              Continue as Demo User
            </button>

            <p className="auth-footer">
              MICRO FRONTEND ARCHITECTURE POC
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
