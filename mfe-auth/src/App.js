  import React from 'react';
  import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
  
  const GOOGLE_CLIENT_ID = '497343003625-a7b2pupckv02ae018qoq33hb8jhh8lp4.apps.googleusercontent.com';

  function LoginButton() {
    const login = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
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
      },
      onError: (error) => console.error('Login failed:', error),
    });

    return (
      <button
        onClick={() => login()}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Sign in with Google
      </button>
    );
  }

   function writeToStore(user) {
    import('shell/store')
      .then(module => {
        console.log('store loaded');
        const setUser = module.default.getState().setUser;
        setUser({ user, activeTenant: null, roles: [] });
        console.log('What?')
        console.log('setUser called');
      })
      .catch(err => console.error('store import failed:', err));
  }

  function App() {
    const handleMockLogin = () => {
      writeToStore({
        id: 'mock-123',
        name: 'Mock User',
        email: 'mock@company.com',
        avatar: null,
      });
    };

    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ padding: '2rem' }}>
          <h1>Sign In</h1>
          <p>Sign in with your Google account to continue.</p>
          <LoginButton />
          <hr style={{ margin: '1rem 0' }} />
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Dev only:</p>
          <button onClick={handleMockLogin} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer' }}>
            Mock Login (dev only)
          </button>
        </div>
      </GoogleOAuthProvider>
    );
  }

  export default App;