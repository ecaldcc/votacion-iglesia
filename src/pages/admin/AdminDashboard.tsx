import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../../services/api';
import '../../styles/AdminDashboard.scss';

interface Campaign {
  _id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  totalVotos: number;
  candidatos: any[];
}

interface Report {
  totalCampaigns: number;
  activeCampaigns: number;
  finishedCampaigns: number;
  totalVotes: number;
  totalVoters: number;
  campaigns: Campaign[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadReport();
    const name = localStorage.getItem('userName') || 'Administrador';
    setUserName(name);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadReport();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadReport = async () => {
    try {
      const response = await adminAPI.getGeneralReport();
      setReport(response.report);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login');
    }
  };

  const handleToggleCampaign = async (id: string, currentState: string) => {
    const newState = currentState === 'habilitada' ? 'deshabilitada' : 'habilitada';
    
    if (!window.confirm(`¿Desea ${newState === 'habilitada' ? 'habilitar' : 'deshabilitar'} esta campaña?`)) {
      return;
    }

    try {
      await adminAPI.toggleCampaign(id, newState);
      await loadReport();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleCloseCampaign = async (id: string) => {
    if (!window.confirm('¿Está seguro de CERRAR esta votación? Esta acción bloqueará todos los votos de todas las iglesias.')) {
      return;
    }

    try {
      await adminAPI.closeCampaign(id);
      await loadReport();
      alert('Votación cerrada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cerrar votación');
    }
  };

  const handleReopenCampaign = async (id: string) => {
    if (!window.confirm('¿Está seguro de REABRIR esta votación?')) {
      return;
    }

    try {
      await adminAPI.reopenCampaign(id);
      await loadReport();
      alert('Votación reabierta exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al reabrir votación');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta campaña? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await adminAPI.deleteCampaign(id);
      await loadReport();
      alert('Campaña eliminada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al eliminar campaña');
    }
  };

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <i className="fas fa-shield-alt"></i>
            <span>Panel de Administración</span>
          </div>
          <div className="navbar-user">
            <span className="user-name">
              <i className="fas fa-user-shield"></i> {userName}
            </span>
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Panel de Control - Elección Junta Directiva</h1>
          <button className="btn-create" onClick={() => navigate('/admin/campaigns/new')}>
            <i className="fas fa-plus"></i> Nueva Campaña
          </button>
        </div>

        {/* Estadísticas */}
        {report && (
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">
                <i className="fas fa-vote-yea"></i>
              </div>
              <div className="stat-info">
                <h3>{report.totalCampaigns}</h3>
                <p>Total Campañas</p>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-info">
                <h3>{report.activeCampaigns}</h3>
                <p>Campañas Activas</p>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <div className="stat-info">
                <h3>{report.totalVotes}</h3>
                <p>Votos Totales</p>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <i className="fas fa-church"></i>
              </div>
              <div className="stat-info">
                <h3>{report.totalVoters}</h3>
                <p>Iglesias Registradas</p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de campañas */}
        <div className="campaigns-management">
          <h2><i className="fas fa-list"></i> Gestión de Campañas</h2>

          {report && report.campaigns.length === 0 ? (
            <div className="no-data">
              <i className="fas fa-inbox"></i>
              <p>No hay campañas creadas</p>
              <button className="btn-create" onClick={() => navigate('/admin/campaigns/new')}>
                <i className="fas fa-plus"></i> Crear Primera Campaña
              </button>
            </div>
          ) : (
            <div className="campaigns-table">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Candidatos</th>
                    <th>Votos</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.campaigns.map((campaign) => (
                    <tr key={campaign._id}>
                      <td>
                        <div className="campaign-title">
                          <strong>{campaign.titulo}</strong>
                          <small>
                            {campaign.descripcion 
                              ? (campaign.descripcion.length > 50 
                                  ? campaign.descripcion.substring(0, 50) + '...' 
                                  : campaign.descripcion)
                              : 'Sin descripción'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${campaign.estado}`}>
                          {campaign.estado === 'habilitada' ? 'Activa' : 
                           campaign.estado === 'cerrada' ? 'Cerrada' : 
                           'Deshabilitada'}
                        </span>
                      </td>
                      <td className="text-center">{campaign.candidatos?.length || 0}</td>
                      <td className="text-center">{campaign.totalVotos}</td>
                      <td>{new Date(campaign.fechaInicio).toLocaleDateString('es-GT')}</td>
                      <td>{new Date(campaign.fechaFin).toLocaleDateString('es-GT')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => navigate(`/admin/campaigns/edit/${campaign._id}`)}
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn-icon btn-report"
                            onClick={() => navigate(`/admin/reports/${campaign._id}`)}
                            title="Ver Reporte"
                          >
                            <i className="fas fa-chart-line"></i>
                          </button>

                          {/* Botón Cerrar/Reabrir Votación */}
                          {campaign.estado === 'cerrada' ? (
                            <button
                              className="btn-icon btn-reopen"
                              onClick={() => handleReopenCampaign(campaign._id)}
                              title="Reabrir Votación"
                            >
                              <i className="fas fa-unlock"></i>
                            </button>
                          ) : (
                            <button
                              className="btn-icon btn-close"
                              onClick={() => handleCloseCampaign(campaign._id)}
                              title="Cerrar Votación"
                              disabled={campaign.estado === 'deshabilitada'}
                            >
                              <i className="fas fa-lock"></i>
                            </button>
                          )}

                          {/* Botón Habilitar/Deshabilitar */}
                          <button
                            className={`btn-icon ${campaign.estado === 'habilitada' ? 'btn-disable' : 'btn-enable'}`}
                            onClick={() => handleToggleCampaign(campaign._id, campaign.estado)}
                            title={campaign.estado === 'habilitada' ? 'Deshabilitar' : 'Habilitar'}
                            disabled={campaign.estado === 'cerrada'}
                          >
                            <i className={`fas ${campaign.estado === 'habilitada' ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>

                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDeleteCampaign(campaign._id)}
                            title="Eliminar"
                            disabled={campaign.totalVotos > 0}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enlaces adicionales */}
        <div className="quick-actions">
          <button className="action-card" onClick={() => navigate('/admin/reports')}>
            <i className="fas fa-file-alt"></i>
            <span>Reportes Generales</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;