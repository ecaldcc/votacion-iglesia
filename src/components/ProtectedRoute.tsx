import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'voter' | 'iglesia';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole');

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await authAPI.verify();
        setIsAuthenticated(true);
        setUserRole(role);
      } catch (error: any) {
        console.log('Error de autenticación:', error);
        
        if (error.response?.status === 401 || error.response?.data?.expired) {
          setSessionExpired(true);
          
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
          
          setTimeout(() => {
            alert('La sesión ha expirado. Por favor, vuelve a iniciar sesión.');
            setIsAuthenticated(false);
          }, 100);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
        }
      }
    };

    verifyAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#666', fontSize: '16px' }}>
          Verificando autenticación...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ sessionExpired }} />;
  }

  // Normalizar roles (iglesia = voter para compatibilidad)
  const normalizedRole = userRole === 'iglesia' ? 'voter' : userRole;
  const normalizedRequiredRole = requiredRole === 'iglesia' ? 'voter' : requiredRole;

  if (normalizedRequiredRole && normalizedRole !== normalizedRequiredRole) {
    if (normalizedRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/voter/campaigns" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;