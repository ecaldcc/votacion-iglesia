import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Login.scss';

interface Iglesia {
  codigo: string;
  nombre: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userType, setUserType] = useState<'iglesia' | 'admin' | null>(null);
  const [showSessionExpiredMessage, setShowSessionExpiredMessage] = useState(false);
  
  // Estado para login de iglesia
  const [iglesiaData, setIglesiaData] = useState({
    codigo: '',
    nombre: '',
    password: ''
  });

  // Estado para login de admin
  const [adminData, setAdminData] = useState({
    codigo: '',
    password: ''
  });

  const [iglesias, setIglesias] = useState<Iglesia[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.sessionExpired) {
      setShowSessionExpiredMessage(true);
      setTimeout(() => {
        setShowSessionExpiredMessage(false);
      }, 5000);
    }
  }, [location]);

  useEffect(() => {
    loadIglesias();
  }, []);

  const loadIglesias = async () => {
    try {
      const response = await authAPI.getIglesias();
      setIglesias(response.iglesias);
    } catch (error) {
      console.error('Error al cargar iglesias:', error);
    }
  };

  const handleQuickAccess = (type: 'iglesia' | 'admin') => {
    setUserType(type);
    setShowSessionExpiredMessage(false);
    setErrors({});
  };

  const handleIglesiaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const newErrors: Record<string, string> = {};

    if (!iglesiaData.codigo) {
      newErrors.codigo = 'El código de iglesia es requerido';
    }

    if (!iglesiaData.nombre) {
      newErrors.nombre = 'Debe seleccionar una iglesia';
    }

    if (!iglesiaData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.loginIglesia(iglesiaData);

      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', response.role);
        localStorage.setItem('userName', response.name);
        navigate('/voter/campaigns');
      } else {
        setErrors({ general: response.message || 'Error al iniciar sesión' });
      }
    } catch (error: any) {
      setErrors({ general: error.response?.data?.message || 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const newErrors: Record<string, string> = {};

    if (!adminData.codigo) {
      newErrors.codigo = 'El código es requerido';
    }

    if (!adminData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.loginAdmin({
        ...adminData,
        userType: 'admin'
      });

      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', response.role);
        localStorage.setItem('userName', response.name);
        navigate('/admin/dashboard');
      } else {
        setErrors({ general: response.message || 'Error al iniciar sesión' });
      }
    } catch (error: any) {
      setErrors({ general: error.response?.data?.message || 'Error de conexión. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {showSessionExpiredMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: '20px' }}></i>
            <span style={{ fontWeight: '500' }}>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.</span>
            <button 
              onClick={() => setShowSessionExpiredMessage(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                marginLeft: '10px'
              }}
            >
              ×
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideDown {
            from {
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
        `}</style>

        <div className="login-content">
          {/* Lado izquierdo - Información */}
          <div className="login-left">
            <div className="login-brand">
              <i className="fas fa-vote-yea"></i>
              <h2>Sistema de Votación</h2>
              <p>Elección Junta Directiva - Asociación de Iglesias</p>
            </div>
            <div className="login-info">
              <p>Plataforma segura para la elección de la Junta Directiva</p>
              <div className="feature-list">
                <div className="feature-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Sistema seguro y confiable</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-chart-bar"></i>
                  <span>Resultados en tiempo real</span>
                </div>
                <div className="feature-item">
                  <i className="fas fa-mobile-alt"></i>
                  <span>Votación en fila - Recarga automática</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lado derecho - Formularios */}
          <div className="login-right">
            <div className="login-header">
              <h3>Iniciar Sesión</h3>
            </div>

            {/* Selección rápida de usuario */}
            {!userType && (
              <div className="user-selection">
                <p className="selection-label">Selecciona tu tipo de acceso:</p>
                
                <div className="user-card" onClick={() => handleQuickAccess('iglesia')}>
                  <div className="user-avatar voter">
                    <i className="fas fa-church"></i>
                  </div>
                  <div className="user-info">
                    <h5>Iglesia</h5>
                    <small>Acceso para votación de iglesias</small>
                  </div>
                </div>

                <div className="user-card" onClick={() => handleQuickAccess('admin')}>
                  <div className="user-avatar admin">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <div className="user-info">
                    <h5>Administrador</h5>
                    <small>Gestión de campañas y votaciones</small>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario de Login para Iglesia */}
            {userType === 'iglesia' && (
              <form onSubmit={handleIglesiaLogin} className="login-form">
                {errors.general && (
                  <div className="alert alert-danger">{errors.general}</div>
                )}

                <div className="form-group">
                  <label>Código de Iglesia *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.codigo ? 'error' : ''}`}
                    value={iglesiaData.codigo}
                    onChange={(e) => setIglesiaData({ ...iglesiaData, codigo: e.target.value })}
                    placeholder="Ej: IG001"
                  />
                  {errors.codigo && (
                    <span className="error-message">{errors.codigo}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Nombre de la Iglesia *</label>
                  <select
                    className={`form-control ${errors.nombre ? 'error' : ''}`}
                    value={iglesiaData.nombre}
                    onChange={(e) => setIglesiaData({ ...iglesiaData, nombre: e.target.value })}
                  >
                    <option value="">Seleccione una iglesia</option>
                    {iglesias.map((iglesia) => (
                      <option key={iglesia.codigo} value={iglesia.nombre}>
                        {iglesia.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.nombre && (
                    <span className="error-message">{errors.nombre}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    value={iglesiaData.password}
                    onChange={(e) => setIglesiaData({ ...iglesiaData, password: e.target.value })}
                    placeholder="Ingrese su contraseña"
                  />
                  {errors.password && (
                    <span className="error-message">{errors.password}</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Ingresando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Ingresar
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  className="btn-back"
                  onClick={() => setUserType(null)}
                >
                  <i className="fas fa-arrow-left"></i> Volver a selección
                </button>
              </form>
            )}

            {/* Formulario de Login para Admin */}
            {userType === 'admin' && (
              <form onSubmit={handleAdminLogin} className="login-form">
                {errors.general && (
                  <div className="alert alert-danger">{errors.general}</div>
                )}

                <div className="form-group">
                  <label>Código de Administrador *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.codigo ? 'error' : ''}`}
                    value={adminData.codigo}
                    onChange={(e) => setAdminData({ ...adminData, codigo: e.target.value })}
                    placeholder="Ej: ADMIN"
                  />
                  {errors.codigo && (
                    <span className="error-message">{errors.codigo}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="Ingrese su contraseña"
                  />
                  {errors.password && (
                    <span className="error-message">{errors.password}</span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Ingresando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt"></i> Ingresar como Admin
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  className="btn-back"
                  onClick={() => setUserType(null)}
                >
                  <i className="fas fa-arrow-left"></i> Volver a selección
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;