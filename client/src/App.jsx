import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Guard
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<div className="p-8"><h1 className="text-2xl font-bold">Personal Health Profile</h1><p className="text-slate-500 mt-2">Coming in Phase 3</p></div>} />
            <Route path="/family" element={<div className="p-8"><h1 className="text-2xl font-bold">Family Health Vault</h1><p className="text-slate-500 mt-2">Coming in Phase 4</p></div>} />
            <Route path="/intelligence" element={<div className="p-8"><h1 className="text-2xl font-bold">Health Intelligence (RAG & Parsing)</h1><p className="text-slate-500 mt-2">Coming in Phase 5</p></div>} />
            <Route path="/predict" element={<div className="p-8"><h1 className="text-2xl font-bold">ArogyaPredict (ML)</h1><p className="text-slate-500 mt-2">Coming in Phase 6</p></div>} />
            <Route path="/doctor-brief" element={<div className="p-8"><h1 className="text-2xl font-bold">Pre-Doctor Brief</h1><p className="text-slate-500 mt-2">Coming in Phase 7</p></div>} />
            <Route path="/emergency-card" element={<div className="p-8"><h1 className="text-2xl font-bold">Emergency Card & QR</h1><p className="text-slate-500 mt-2">Coming in Phase 7</p></div>} />
          </Route>
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
