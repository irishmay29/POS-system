import React, { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import POS from './components/POS';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Signup from './components/Signup';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContext';
import ThemeProvider, { ThemeContext } from './context/ThemeContext';
import LogoutModal from './components/LogoutModal';
import ProtectedRoute from './components/ProtectedRoute';

function NavBar() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    setShowLogout(true);
  };

  const onConfirmLogout = async () => {
    setShowLogout(false);
    await logout();
    navigate('/login');
  };

  const onCancelLogout = () => setShowLogout(false);

  return (
    <>
      <nav style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
        <Link to="/" style={{ marginRight: 12 }}>Dashboard</Link>
        <Link to="/products" style={{ marginRight: 12 }}>Products</Link>
        <Link to="/pos" style={{ marginRight: 12 }}>POS</Link>
        <Link to="/transactions" style={{ marginRight: 12 }}>Transactions</Link>
        <Link to="/reports" style={{ marginRight: 12 }}>Reports</Link>
        {!user ? (
          <>
            <Link to="/signup" style={{ marginRight: 12 }}>Sign Up</Link>
            <Link to="/login" style={{ float: 'right' }}>Login</Link>
          </>
        ) : (
          <div style={{ float: 'right' }}>
            <span style={{ marginRight: 12 }}>{user.email}</span>
            <button onClick={handleLogout} style={{ marginRight: 8 }}>Logout</button>
            <button onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          </div>
        )}
      </nav>
      <LogoutModal open={showLogout} onConfirm={onConfirmLogout} onCancel={onCancelLogout} />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <NavBar />

            <main>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
