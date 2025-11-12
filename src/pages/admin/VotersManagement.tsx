import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../../services/api';
import '../../styles/VotersManagement.scss';

interface Voter {
  _id: string;
  numeroColegiado: string;
  nombreCompleto: string;
  correo: string;
  dpi: string;
  fechaNacimiento: string;
  isActive: boolean;
  votedCampaigns: any[];
  createdAt: string;
}

const VotersManagement: React.FC = () => {
  const navigate = useNavigate();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'votes'>('name');

  useEffect(() => {
    loadVoters();
  }, []);

  useEffect(() => {
    filterAndSortVoters();
  }, [voters, searchTerm, filterStatus, sortBy]);

  const loadVoters = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getVoters();
      setVoters(response.voters);
    } catch (error) {
      console.error('Error al cargar votantes:', error);
      alert('Error al cargar votantes');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVoters = () => {
    let filtered = [...voters];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(voter =>
        voter.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.numeroColegiado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.dpi.includes(searchTerm)
      );
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(voter =>
        filterStatus === 'active' ? voter.isActive : !voter.isActive
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nombreCompleto.localeCompare(b.nombreCompleto);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'votes':
          return b.votedCampaigns.length - a.votedCampaigns.length;
        default:
          return 0;
      }
    });

    setFilteredVoters(filtered);
  };

  const handleToggleStatus = async (voterId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activar' : 'desactivar';

    if (!window.confirm(`¿Está seguro de ${action} este votante?`)) {
      return;
    }

    try {
      await adminAPI.toggleUser(voterId, newStatus);
      await loadVoters();
      alert(`Votante ${action}do exitosamente`);
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      alert(error.response?.data?.message || 'Error al cambiar estado del votante');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const getStats = () => {
    const total = voters.length;
    const active = voters.filter(v => v.isActive).length;
    const inactive = voters.filter(v => !v.isActive).length;
    const withVotes = voters.filter(v => v.votedCampaigns.length > 0).length;

    return { total, active, inactive, withVotes };
  };

  const stats = getStats();

 

  return (
    <div className="voters-management-page">
      <nav className="admin-navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <i className="fas fa-shield-alt"></i>
            <span>Panel de Administración</span>
          </div>
          <div className="navbar-user">
            <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
              <i className="fas fa-arrow-left"></i> Dashboard
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="management-container">
        <div className="page-header">
          <h1><i className="fas fa-users"></i> Gestión de Votantes</h1>
          <p>Administra los usuarios registrados en el sistema</p>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Votantes</p>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.active}</h3>
              <p>Activos</p>
            </div>
          </div>

          <div className="stat-card red">
            <div className="stat-icon">
              <i className="fas fa-user-times"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.inactive}</h3>
              <p>Inactivos</p>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">
              <i className="fas fa-vote-yea"></i>
            </div>
            <div className="stat-info">
              <h3>{stats.withVotes}</h3>
              <p>Han Votado</p>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="filters-section">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, colegiado, correo o DPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={filterStatus === 'all' ? 'active' : ''}
              onClick={() => setFilterStatus('all')}
            >
              <i className="fas fa-list"></i> Todos
            </button>
            <button
              className={filterStatus === 'active' ? 'active' : ''}
              onClick={() => setFilterStatus('active')}
            >
              <i className="fas fa-check-circle"></i> Activos
            </button>
            <button
              className={filterStatus === 'inactive' ? 'active' : ''}
              onClick={() => setFilterStatus('inactive')}
            >
              <i className="fas fa-ban"></i> Inactivos
            </button>
          </div>

          <div className="sort-select">
            <label>
              <i className="fas fa-sort"></i> Ordenar por:
            </label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="name">Nombre</option>
              <option value="date">Fecha de Registro</option>
              <option value="votes">Votos Emitidos</option>
            </select>
          </div>
        </div>

        {/* Tabla de votantes */}
        <div className="voters-table-section">
          <div className="table-header">
            <h3>Votantes Registrados ({filteredVoters.length})</h3>
          </div>

          <div className="voters-table">
            <table>
              <thead>
                <tr>
                  <th>No. Colegiado</th>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>DPI</th>
                  <th>Fecha Nacimiento</th>
                  <th>Votos Emitidos</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.length > 0 ? (
                  filteredVoters.map((voter) => (
                    <tr key={voter._id} className={!voter.isActive ? 'inactive-row' : ''}>
                      <td className="colegiado">{voter.numeroColegiado}</td>
                      <td className="name">{voter.nombreCompleto}</td>
                      <td className="email">{voter.correo}</td>
                      <td className="dpi">{voter.dpi}</td>
                      <td>{new Date(voter.fechaNacimiento).toLocaleDateString('es-GT')}</td>
                      <td className="text-center">
                        <span className="vote-badge">
                          <i className="fas fa-vote-yea"></i> {voter.votedCampaigns.length}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${voter.isActive ? 'active' : 'inactive'}`}>
                          {voter.isActive ? (
                            <>
                              <i className="fas fa-check-circle"></i> Activo
                            </>
                          ) : (
                            <>
                              <i className="fas fa-ban"></i> Inactivo
                            </>
                          )}
                        </span>
                      </td>
                      <td>{new Date(voter.createdAt).toLocaleDateString('es-GT')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`btn-toggle ${voter.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => handleToggleStatus(voter._id, voter.isActive)}
                            title={voter.isActive ? 'Desactivar' : 'Activar'}
                          >
                            <i className={`fas ${voter.isActive ? 'fa-times-circle' : 'fa-check-circle'}`}></i>
                            {voter.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="no-data">
                      <i className="fas fa-inbox"></i>
                      <p>
                        {searchTerm || filterStatus !== 'all'
                          ? 'No se encontraron votantes con los criterios seleccionados'
                          : 'No hay votantes registrados'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="info-panel">
          <div className="info-card">
            <h4><i className="fas fa-info-circle"></i> Información</h4>
            <ul>
              <li>Los votantes inactivos no podrán iniciar sesión en el sistema</li>
              <li>Al desactivar un votante, no se eliminan sus votos anteriores</li>
              <li>Los votantes pueden ser reactivados en cualquier momento</li>
              <li>El historial de votos se mantiene para auditoría</li>
            </ul>
          </div>

          <div className="info-card">
            <h4><i className="fas fa-chart-line"></i> Estadísticas Rápidas</h4>
            <ul>
              <li>Tasa de participación: {stats.total > 0 ? ((stats.withVotes / stats.total) * 100).toFixed(1) : 0}%</li>
              <li>Promedio de votos por usuario: {stats.total > 0 ? (voters.reduce((sum, v) => sum + v.votedCampaigns.length, 0) / stats.total).toFixed(1) : 0}</li>
              <li>Votantes sin participación: {stats.total - stats.withVotes}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotersManagement;