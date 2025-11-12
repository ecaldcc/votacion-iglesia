import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';


// Voter Pages
import CampaignsList from './pages/voter/CampaignsList';
import CampaignDetail from './pages/voter/CampaignDetail';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CampaignForm from './pages/admin/CampaignForm';
import CampaignReport from './pages/admin/CampaignReport';
import VotersManagement from './pages/admin/VotersManagement';
import GeneralReport from './pages/admin/GeneralReport';
import './styles/App.scss';

const App: React.FC = () => {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas de votante */}
      <Route
        path="/voter/campaigns"
        element={
          <ProtectedRoute requiredRole="voter">
            <CampaignsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/voter/campaign/:id"
        element={
          <ProtectedRoute requiredRole="voter">
            <CampaignDetail />
          </ProtectedRoute>
        }
      />

      {/* Rutas de administrador */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/campaigns/new"
        element={
          <ProtectedRoute requiredRole="admin">
            <CampaignForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/campaigns/edit/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <CampaignForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/:id"
        element={
          <ProtectedRoute requiredRole="admin">
            <CampaignReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/"
        element={
          <ProtectedRoute requiredRole="admin">
            <GeneralReport />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/voters"
        element={
          <ProtectedRoute requiredRole="admin">
            <VotersManagement />
          </ProtectedRoute>
        }
      />

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;