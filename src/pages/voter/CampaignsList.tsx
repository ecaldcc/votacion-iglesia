import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsAPI, authAPI } from '../../services/api';
import { wsService, WSEventType } from '../../services/websocketService';
import '../../styles/CampaignList.scss';

interface Candidate {
  _id: string;
  nombre: string;
  foto?: string;
  propuestas?: string;
  votos: number;
}

interface Campaign {
  _id: string;
  titulo: string;
  descripcion: string;
  votosDisponibles: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  candidatos: Candidate[];
  totalVotos: number;
}

const CampaignsList: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState<'all' | 'habilitada' | 'finalizada'>('all');

  useEffect(() => {
    loadCampaigns();
    const name = localStorage.getItem('userName') || 'Usuario';
    setUserName(name);

    // Intentar conectar WebSocket
    const WS_URL = import.meta.env.VITE_WS_URL;
    if (WS_URL) {
      try {
        if (!wsService.isConnected()) {
          wsService.connect(WS_URL);
        }

        // Escuchar eventos globales
        const handleNewCampaign = () => {
          console.log('Nueva campaña creada');
          loadCampaigns();
        };

        const handleCampaignDeleted = () => {
          console.log('Campaña eliminada');
          loadCampaigns();
        };

        const handleCampaignToggled = () => {
          console.log(' Estado de campaña cambió');
          loadCampaigns();
        };

        const handleVoteCast = () => {
          console.log('Nuevo voto registrado');
          loadCampaigns();
        };

        wsService.on(WSEventType.NEW_CAMPAIGN, handleNewCampaign);
        wsService.on(WSEventType.CAMPAIGN_DELETED, handleCampaignDeleted);
        wsService.on(WSEventType.CAMPAIGN_TOGGLED, handleCampaignToggled);
        wsService.on(WSEventType.VOTE_CAST, handleVoteCast);

        return () => {
          wsService.off(WSEventType.NEW_CAMPAIGN, handleNewCampaign);
          wsService.off(WSEventType.CAMPAIGN_DELETED, handleCampaignDeleted);
          wsService.off(WSEventType.CAMPAIGN_TOGGLED, handleCampaignToggled);
          wsService.off(WSEventType.VOTE_CAST, handleVoteCast);
        };
      } catch (error) {
        console.log('WebSocket no disponible, usando actualizaciones periodicas');
      }
    } else {
      // Fallback: Actualizacion periodica
      const interval = setInterval(() => {
        loadCampaigns();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);
  

  const loadCampaigns = async () => {
    try {
      const response = await campaignsAPI.getAll();
      setCampaigns(response.campaigns);
    } catch (error) {
      console.error('Error al cargar campañas:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      wsService.disconnect(); // Desconectar WebSocket al salir
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login');
    }
  };

  const getTimeRemaining = (fechaFin: string) => {
    const now = new Date().getTime();
    const end = new Date(fechaFin).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Finalizada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.estado === filter;
  });

  return (
    <div className="campaigns-page">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <i className="fas fa-vote-yea"></i>
            <span>Sistema de Votación</span>
          </div>
          <div className="navbar-user">
            <span className="user-name">
              <i className="fas fa-user"></i> {userName}
            </span>
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="campaigns-container">
        <div className="campaigns-header">
          <h1>Campañas de Votación</h1>
          <p>Selecciona una campaña para ver detalles y emitir tu voto</p>
        </div>

        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <i className="fas fa-list"></i> Todas
          </button>
          <button
            className={`filter-btn ${filter === 'habilitada' ? 'active' : ''}`}
            onClick={() => setFilter('habilitada')}
          >
            <i className="fas fa-check-circle"></i> Activas
          </button>
          <button
            className={`filter-btn ${filter === 'finalizada' ? 'active' : ''}`}
            onClick={() => setFilter('finalizada')}
          >
            <i className="fas fa-flag-checkered"></i> Finalizadas
          </button>
        </div>

        <div className="campaigns-grid">
          {filteredCampaigns.length === 0 ? (
            <div className="no-campaigns">
              <i className="fas fa-inbox"></i>
              <h3>No hay campañas disponibles</h3>
              <p>Por el momento no hay campañas {filter === 'all' ? '' : filter === 'habilitada' ? 'activas' : 'finalizadas'}</p>
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <div
                key={campaign._id}
                className={`campaign-card ${campaign.estado}`}
                onClick={() => navigate(`/voter/campaign/${campaign._id}`)}
              >
                <div className="campaign-status">
                  <span className={`status-badge ${campaign.estado}`}>
                    {campaign.estado === 'habilitada' ? (
                      <>
                        <i className="fas fa-circle"></i> Activa
                      </>
                    ) : campaign.estado === 'finalizada' ? (
                      <>
                        <i className="fas fa-flag-checkered"></i> Finalizada
                      </>
                    ) : (
                      <>
                        <i className="fas fa-pause-circle"></i> Deshabilitada
                      </>
                    )}
                  </span>
                </div>

                <div className="campaign-content">
                  <h3>{campaign.titulo}</h3>
                  <p className="campaign-description">{campaign.descripcion}</p>

                  <div className="campaign-stats">
                    <div className="stat">
                      <i className="fas fa-users"></i>
                      <span>{campaign.candidatos.length} candidatos</span>
                    </div>
                    <div className="stat">
                      <i className="fas fa-vote-yea"></i>
                      <span>{campaign.totalVotos} votos</span>
                    </div>
                  </div>

                  <div className="campaign-dates">
                    <div className="date-info">
                      <i className="fas fa-calendar-alt"></i>
                      <small>
                        {new Date(campaign.fechaInicio).toLocaleDateString('es-GT')} -{' '}
                        {new Date(campaign.fechaFin).toLocaleDateString('es-GT')}
                      </small>
                    </div>
                    {campaign.estado === 'habilitada' && (
                      <div className="time-remaining">
                        <i className="fas fa-clock"></i>
                        <small>{getTimeRemaining(campaign.fechaFin)}</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="campaign-footer">
                  <button className="btn-view">
                    {campaign.estado === 'habilitada' ? (
                      <>
                        <i className="fas fa-vote-yea"></i> Ver y Votar
                      </>
                    ) : (
                      <>
                        <i className="fas fa-eye"></i> Ver Resultados
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignsList;