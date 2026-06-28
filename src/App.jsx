import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Home from './Home';
import Register from './register';
import Login from './login';
import Chatbot from './Chatbot';
import { api } from './api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session validation failed:', err.message);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loader">
        <div className="loader-spinner"></div>
        <p>Connecting to DeepAI...</p>
      </div>
    );
  }

  return (
    <Router>
      {/* Navigation bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '30px',
        padding: '15px',
        background: '#0d0f1c',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <NavLink 
          to="/" 
          style={({ isActive }) => ({
            color: isActive ? '#c084fc' : '#9ca3af',
            textDecoration: 'none',
            fontWeight: '600',
            fontFamily: "'Outfit', sans-serif"
          })}
        >
          Home
        </NavLink>
        
        {!user ? (
          <>
            <NavLink 
              to="/register" 
              style={({ isActive }) => ({
                color: isActive ? '#c084fc' : '#9ca3af',
                textDecoration: 'none',
                fontWeight: '600',
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              Register
            </NavLink>
            <NavLink 
              to="/login" 
              style={({ isActive }) => ({
                color: isActive ? '#c084fc' : '#9ca3af',
                textDecoration: 'none',
                fontWeight: '600',
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              Login
            </NavLink>
          </>
        ) : (
          <>
            <NavLink 
              to="/chat" 
              style={({ isActive }) => ({
                color: isActive ? '#c084fc' : '#9ca3af',
                textDecoration: 'none',
                fontWeight: '600',
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              Chatbot
            </NavLink>
            <button 
              type="button" 
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              Logout ({user.name})
            </button>
          </>
        )}
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/register" 
          element={!user ? <Register /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/login" 
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/chat" 
          element={user ? <Chatbot user={user} handleLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
