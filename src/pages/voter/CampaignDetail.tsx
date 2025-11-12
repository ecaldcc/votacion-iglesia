import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, votesAPI } from '../../services/api';
import { wsService, WSEventType } from '../../services/websocketService';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import '../../styles/CampaignDetail.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  candidatos: Candidate[];
  totalVotos: number;
}

interface VotosRestantes {
  votosAsignados: number;
  votosUsados: number;
  votosDisponibles: number;
}

const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [votosRestantes, setVotosRestantes] = useState<VotosRestantes | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false); // ← NUEVO
  const [successMessage, setSuccessMessage] = useState(''); // ← NUEVO

  useEffect(() => {
    if (id) {
      loadCampaignData();
      loadVotosRestantes();

      const WS_URL = import.meta.env.VITE_WS_URL;
      if (WS_URL) {
        try {
          if (!wsService.isConnected()) wsService.connect(WS_URL);
          wsService.subscribeToCampaign(id);

          const handleVoteCast = (data: any) => {
            if (data.campaignId === id) {
              loadCampaignData();
              loadVotosRestantes();
            }
          };

          const handleCampaignUpdated = (data: any) => {
            if (data.campaignId === id) {
              loadCampaignData();
            }
          };

          const handleCampaignClosed = (data: any) => {
            if (data.campaignId === id) {
              loadCampaignData();
            }
          };

          wsService.on(WSEventType.VOTE_CAST, handleVoteCast);
          wsService.on(WSEventType.CAMPAIGN_UPDATED, handleCampaignUpdated);
          wsService.on('campaign_closed', handleCampaignClosed);

          return () => {
            wsService.off(WSEventType.VOTE_CAST, handleVoteCast);
            wsService.off(WSEventType.CAMPAIGN_UPDATED, handleCampaignUpdated);
            wsService.off('campaign_closed', handleCampaignClosed);
            wsService.unsubscribeFromCampaign(id);
          };
        } catch (error) {
          console.error('Error en la conexión WebSocket:', error);
        }
      }
    }
  }, [id]);

  useEffect(() => {
    if (campaign && campaign.estado === 'habilitada') {
      updateTimeRemaining();
      const interval = setInterval(() => updateTimeRemaining(), 1000);
      return () => clearInterval(interval);
    }
  }, [campaign]);

  const loadCampaignData = async () => {
    try {
      const campaignRes = await campaignsAPI.getById(id!);
      setCampaign(campaignRes.campaign);
    } catch (error) {
      console.error('Error al cargar campaña:', error);
      setCampaign(null);
    } finally {
      setInitialLoadComplete(true);
    }
  };

  const loadVotosRestantes = async () => {
    try {
      const response = await campaignsAPI.getVotosRestantes(id!);
      setVotosRestantes(response);
    } catch (error) {
      console.error('Error al cargar votos restantes:', error);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !campaign) return;
    
    if (votosRestantes && votosRestantes.votosDisponibles <= 0) {
      setSuccessMessage('Ya has usado todos tus votos disponibles');
      setShowSuccessCheck(true);
      setTimeout(() => {
        setShowSuccessCheck(false);
        setSuccessMessage('');
      }, 2000);
      return;
    }

    try {
      setVoting(true);
      
      // 1. Registrar voto
      const response = await votesAPI.cast({
        campaignId: campaign._id,
        candidateId: selectedCandidate
      });
      
      const candidateName = campaign.candidatos.find(c => c._id === selectedCandidate)?.nombre;
      
      // 2. ✅ MOSTRAR CHECKMARK CON MENSAJE
      setSuccessMessage('¡Voto registrado exitosamente!');
      setShowSuccessCheck(true);
      
      // 3. Limpiar selección
      setSelectedCandidate(null);
      
      // 4. Actualizar datos
      await Promise.all([
        loadCampaignData(),
        loadVotosRestantes()
      ]);
      
      // 5. Si quedan votos, ocultar después de 2 segundos
      if (response.votosRestantes > 0) {
        setTimeout(() => {
          setShowSuccessCheck(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        // Si no quedan votos, mostrar mensaje y recargar
        setTimeout(() => {
          setSuccessMessage('Has completado todos tus votos. Recargando...');
        }, 1500);
        
        setTimeout(() => {
          window.location.reload();
        }, 3500);
      }
      
    } catch (error: any) {
      console.error('Error al votar:', error);
      setShowSuccessCheck(false);
      setSuccessMessage('');
      alert('❌ Error al registrar el voto:\n' + (error.response?.data?.message || 'Por favor, intenta nuevamente'));
    } finally {
      setVoting(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!campaign) return;
    const now = new Date().getTime();
    const end = new Date(campaign.fechaFin).getTime();
    const diff = end - now;

    if (diff <= 0) {
      setTimeRemaining('Finalizada');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    else if (minutes > 0) setTimeRemaining(`${minutes}m ${seconds}s`);
    else setTimeRemaining(`${seconds}s`);
  };

  const getChartData = () => {
    if (!campaign) return null;
    return {
      labels: campaign.candidatos.map(c => c.nombre),
      datasets: [
        {
          label: 'Votos',
          data: campaign.candidatos.map(c => c.votos),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)',
            'rgba(255, 154, 158, 0.8)',
            'rgba(250, 208, 196, 0.8)'
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(118, 75, 162, 1)',
            'rgba(237, 100, 166, 1)',
            'rgba(255, 154, 158, 1)',
            'rgba(250, 208, 196, 1)'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Resultados de Votación',
        font: { size: 18, weight: 'bold' as const }
      }
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  if (!initialLoadComplete) {
    return null;
  }

  if (!campaign) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Campaña no encontrada</h3>
        <button onClick={() => navigate('/voter/campaigns')} className="btn-back">
          Volver a campañas
        </button>
      </div>
    );
  }

  return (
    <div className="campaign-detail-page">
      
      {/* ✅ CHECKMARK ANIMADO CON MENSAJE - NUEVO */}
      {showSuccessCheck && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-checkmark">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <p className="success-message">{successMessage}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="detail-header">
        <button
          className="btn-back-arrow"
          onClick={() => navigate('/voter/campaigns')}
        >
          <i className="fas fa-arrow-left"></i> Volver
        </button>

        <div className="header-info">
          <h1>{campaign.titulo}</h1>
          <span className={`status-badge ${campaign.estado}`}>
            {campaign.estado === 'habilitada'
              ? 'Activa'
              : campaign.estado === 'cerrada'
              ? 'Cerrada'
              : 'Deshabilitada'}
          </span>
        </div>

        {campaign.estado === 'habilitada' && (
          <div className="time-remaining-card">
            <i className="fas fa-clock"></i>
            <div>
              <h4>Tiempo Restante</h4>
              <p className="countdown">{timeRemaining}</p>
            </div>
          </div>
        )}

        {campaign.estado === 'cerrada' && (
          <div className="time-remaining-card closed">
            <i className="fas fa-lock"></i>
            <div>
              <h4>Estado</h4>
              <p className="countdown">Cerrada</p>
            </div>
          </div>
        )}
      </div>

      <div className="detail-container">
        <div className="campaign-info-section">
          <div className="info-card">
            <h3>
              <i className="fas fa-info-circle"></i> Descripción
            </h3>
            <p>{campaign.descripcion}</p>
          </div>

          <div className="info-stats">
            <div className="stat-box">
              <i className="fas fa-users"></i>
              <div>
                <h4>{campaign.candidatos.length}</h4>
                <span>Candidatos</span>
              </div>
            </div>
            <div className="stat-box">
              <i className="fas fa-vote-yea"></i>
              <div>
                <h4>{campaign.totalVotos}</h4>
                <span>Votos Totales</span>
              </div>
            </div>
            {votosRestantes && (
              <div className="stat-box highlight">
                <i className="fas fa-check-circle"></i>
                <div>
                  <h4>{votosRestantes.votosDisponibles}</h4>
                  <span>Votos Disponibles</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="candidates-section">
          <h3>
            <i className="fas fa-users"></i> Candidatos
          </h3>
          <div className="candidates-grid">
            {campaign.candidatos.map(candidate => (
              <div
                key={candidate._id}
                className={`candidate-card ${
                  selectedCandidate === candidate._id ? 'selected' : ''
                } ${
                  campaign.estado !== 'habilitada' ||
                  (votosRestantes && votosRestantes.votosDisponibles === 0)
                    ? 'disabled'
                    : ''
                }`}
                onClick={() => {
                  if (
                    campaign.estado === 'habilitada' &&
                    votosRestantes &&
                    votosRestantes.votosDisponibles > 0
                  ) {
                    setSelectedCandidate(candidate._id);
                  }
                }}
              >
                <div className="candidate-header">
                  <div className="candidate-avatar">
                    {candidate.foto ? (
                      <img src={candidate.foto} alt={candidate.nombre} />
                    ) : (
                      <i className="fas fa-user"></i>
                    )}
                  </div>
                  <div className="candidate-info">
                    <h4>{candidate.nombre}</h4>
                    <span className="vote-count">
                      <i className="fas fa-vote-yea"></i> {candidate.votos} votos
                    </span>
                  </div>
                </div>

                {candidate.propuestas && (
                  <div className="candidate-proposals">
                    <h5>
                      <i className="fas fa-lightbulb"></i> Propuestas:
                    </h5>
                    <p>{candidate.propuestas}</p>
                  </div>
                )}

                {selectedCandidate === candidate._id &&
                  campaign.estado === 'habilitada' &&
                  votosRestantes &&
                  votosRestantes.votosDisponibles > 0 && (
                    <div className="selected-indicator">
                      <i className="fas fa-check-circle"></i> Seleccionado
                    </div>
                  )}
              </div>
            ))}
          </div>

          {campaign.estado === 'habilitada' &&
            votosRestantes &&
            votosRestantes.votosDisponibles > 0 && (
              <div className="vote-action">
                <button
                  className="btn-vote"
                  disabled={!selectedCandidate || voting}
                  onClick={handleVote}
                >
                  {voting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Registrando voto...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-vote-yea"></i> Confirmar Voto
                    </>
                  )}
                </button>
                {selectedCandidate && (
                  <p className="vote-hint">
                    <i className="fas fa-info-circle"></i> Estás votando por:{' '}
                    <strong>
                      {
                        campaign.candidatos.find(
                          c => c._id === selectedCandidate
                        )?.nombre
                      }
                    </strong>
                  </p>
                )}
              </div>
            )}

          {votosRestantes &&
            votosRestantes.votosDisponibles === 0 &&
            campaign.estado === 'habilitada' && (
              <div className="no-votes-alert">
                <i className="fas fa-exclamation-triangle"></i>
                <p>Ya has usado todos tus votos disponibles en esta campaña</p>
              </div>
            )}

          {campaign.estado === 'cerrada' && (
            <div className="no-votes-alert closed">
              <i className="fas fa-lock"></i>
              <p>La votación ha sido cerrada por el administrador</p>
            </div>
          )}
        </div>

        <div className="chart-section">
          <div className="chart-container">
            {getChartData() && (
              <Bar data={getChartData()!} options={chartOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;