import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import POS from './components/POS';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <div className="App">
        <nav style={{ padding: 12, borderBottom: '1px solid #ddd' }}>
          <Link to="/" style={{ marginRight: 12 }}>Dashboard</Link>
          <Link to="/products" style={{ marginRight: 12 }}>Products</Link>
          <Link to="/pos" style={{ marginRight: 12 }}>POS</Link>
          <Link to="/transactions" style={{ marginRight: 12 }}>Transactions</Link>
          <Link to="/reports" style={{ marginRight: 12 }}>Reports</Link>
          <Link to="/login" style={{ float: 'right' }}>Login</Link>
        </nav>

        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
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
  );
}

export default App;
