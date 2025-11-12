import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { wsService, WSEventType } from '../../services/websocketService';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import '../../styles/CampaignReport.scss';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Vote {
  voter: string;
  numeroColegiado: string;
  votedAt: string;
  candidateId: string;
}

interface Candidate {
  _id: string;
  nombre: string;
  votos: number;
}

interface CampaignData {
  titulo: string;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  totalVotos: number;
  candidatos: Candidate[];
}

interface Report {
  campaign: CampaignData;
  votes: Vote[];
}

interface IglesiaStats {
  codigo: string;
  nombre: string;
  votosAsignados: number;
  votosUsados: number;
  votosDisponibles: number;
  porcentajeParticipacion: string;
}

const CampaignReport: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [iglesiasStats, setIglesiasStats] = useState<IglesiaStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
      loadIglesiasStats();

      const WS_URL = import.meta.env.VITE_WS_URL;
      if (WS_URL) {
        try {
          if (!wsService.isConnected()) {
            wsService.connect(WS_URL);
          }

          wsService.subscribeToCampaign(id);

          const handleVoteCast = (data: any) => {
            if (data.campaignId === id) {
              console.log('Nuevo voto en reporte');
              loadReport();
              loadIglesiasStats();
            }
          };

          const handleCampaignUpdated = (data: any) => {
            if (data.campaignId === id) {
              console.log('Campaña actualizada en reporte');
              loadReport();
            }
          };

          const handleCampaignClosed = (data: any) => {
            if (data.campaignId === id) {
              console.log('Campaña cerrada');
              loadReport();
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
          console.log('WebSocket no disponible, usando actualizaciones periódicas');
        }
      } else {
        const interval = setInterval(() => {
          if (report?.campaign.estado === 'habilitada') {
            loadReport();
            loadIglesiasStats();
          }
        }, 5000);

        return () => clearInterval(interval);
      }
    }
  }, [id, report?.campaign.estado]);

  const loadReport = async () => {
    try {
      const response = await adminAPI.getCampaignReport(id!);
      setReport(response.report);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      setIsInitialLoad(false);
    }
  };

  const loadIglesiasStats = async () => {
    try {
      const response = await adminAPI.getIglesiasStats(id!);
      setIglesiasStats(response.stats);
    } catch (error) {
      console.error('Error al cargar estadísticas de iglesias:', error);
    }
  };

  const getPieChartData = () => {
    if (!report) return null;

    return {
      labels: report.campaign.candidatos.map(c => c.nombre),
      datasets: [
        {
          data: report.campaign.candidatos.map(c => c.votos),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(237, 100, 166, 0.8)',
            'rgba(255, 154, 158, 0.8)',
            'rgba(250, 208, 196, 0.8)',
            'rgba(66, 214, 164, 0.8)',
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(118, 75, 162, 1)',
            'rgba(237, 100, 166, 1)',
            'rgba(255, 154, 158, 1)',
            'rgba(250, 208, 196, 1)',
            'rgba(66, 214, 164, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getBarChartData = () => {
  if (!report) return null;

  return {
    labels: report.campaign.candidatos.map(c => c.nombre),
    datasets: [
      {
        label: 'Votos',
        data: report.campaign.candidatos.map(c => c.votos),
        // ✅ CAMBIO: Array de colores en lugar de un solo color
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',   // Azul
          'rgba(118, 75, 162, 0.8)',    // Púrpura
          'rgba(237, 100, 166, 0.8)',   // Rosa
          'rgba(255, 154, 158, 0.8)',   // Coral
          'rgba(250, 208, 196, 0.8)',   // Durazno
          'rgba(66, 214, 164, 0.8)',    // Verde agua
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(118, 75, 162, 1)',
          'rgba(237, 100, 166, 1)',
          'rgba(255, 154, 158, 1)',
          'rgba(250, 208, 196, 1)',
          'rgba(66, 214, 164, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };
};

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const getWinner = () => {
    if (!report || report.campaign.candidatos.length === 0) return null;

    const maxVotos = Math.max(...report.campaign.candidatos.map(c => c.votos));
    const winners = report.campaign.candidatos.filter(c => c.votos === maxVotos);

    if (winners.length === 1) {
      return winners[0];
    } else if (winners.length > 1) {
      return { nombre: 'Empate', votos: maxVotos };
    }

    return null;
  };

  const getTotalVotosAsignados = () => {
    return iglesiasStats.reduce((sum, iglesia) => sum + iglesia.votosAsignados, 0);
  };

  const getTotalVotosUsados = () => {
    return iglesiasStats.reduce((sum, iglesia) => sum + iglesia.votosUsados, 0);
  };

  const getParticipacionGeneral = () => {
    const total = getTotalVotosAsignados();
    const usados = getTotalVotosUsados();
    return total > 0 ? ((usados / total) * 100).toFixed(1) : '0';
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredVotes = report?.votes.filter(vote =>
    vote.voter.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.numeroColegiado.includes(searchTerm)
  ) || [];

  if (!isInitialLoad && !report) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Reporte no encontrado</h3>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const winner = getWinner();

  return (
    <div className="campaign-report-page">
      <div className="report-header no-print">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left"></i> Volver al Dashboard
          </button>
        </div>

        <h1>Reporte Detallado</h1>

        <div className="header-right">
          <button className="btn-print" onClick={handlePrint}>
            <i className="fas fa-print"></i> Imprimir
          </button>
        </div>
      </div>

      <div className="report-container">
        {/* Información de la campaña */}
        <div className="campaign-info-card">
          <div className="info-header">
            <h2>{report.campaign.titulo}</h2>
            <span className={`status-badge ${report.campaign.estado}`}>
              {report.campaign.estado === 'habilitada' ? 'Activa' : 
               report.campaign.estado === 'cerrada' ? 'Cerrada' : 
               'Deshabilitada'}
            </span>
          </div>
          <p className="description">{report.campaign.descripcion}</p>
          <div className="info-dates">
            <div className="date-item">
              <i className="fas fa-calendar-alt"></i>
              <span>Inicio: {new Date(report.campaign.fechaInicio).toLocaleString('es-GT')}</span>
            </div>
            <div className="date-item">
              <i className="fas fa-calendar-check"></i>
              <span>Fin: {new Date(report.campaign.fechaFin).toLocaleString('es-GT')}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="stats-section">
          <div className="stat-box blue">
            <div className="stat-icon">
              <i className="fas fa-vote-yea"></i>
            </div>
            <div className="stat-content">
              <h3>{report.campaign.totalVotos}</h3>
              <p>Votos Registrados</p>
            </div>
          </div>

          <div className="stat-box green">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{report.campaign.candidatos.length}</h3>
              <p>Candidatos</p>
            </div>
          </div>

          <div className="stat-box purple">
            <div className="stat-icon">
              <i className="fas fa-percentage"></i>
            </div>
            <div className="stat-content">
              <h3>{getParticipacionGeneral()}%</h3>
              <p>Participación General</p>
            </div>
          </div>

          <div className="stat-box orange">
            <div className="stat-icon">
              <i className="fas fa-church"></i>
            </div>
            <div className="stat-content">
              <h3>{iglesiasStats.length}</h3>
              <p>Iglesias Participantes</p>
            </div>
          </div>
        </div>

        {/* Ganador */}
        {winner && (
          <div className="winner-section">
            <div className="winner-card">
              <i className="fas fa-trophy trophy-icon"></i>
              <div className="winner-info">
                {winner.nombre === 'Empate' ? (
                  <>
                    <h3>Empate Técnico</h3>
                    <p>Múltiples candidatos con {(winner as any).votos} votos</p>
                  </>
                ) : (
                  <>
                    <h3>Primer Lugar</h3>
                    <h2>{winner.nombre}</h2>
                    <p>{winner.votos} votos ({((winner.votos / report.campaign.totalVotos) * 100).toFixed(1)}%)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="charts-section">
          <div className="chart-card">
            <h3><i className="fas fa-chart-pie"></i> Distribución de Votos</h3>
            <div className="chart-container pie">
              {getPieChartData() && <Pie data={getPieChartData()!} options={chartOptions} />}
            </div>
          </div>

          <div className="chart-card">
            <h3><i className="fas fa-chart-bar"></i> Comparación de Votos</h3>
            <div className="chart-container bar">
              {getBarChartData() && <Bar data={getBarChartData()!} options={barChartOptions} />}
            </div>
          </div>
        </div>

        {/* Resultados por candidato */}
        <div className="candidates-results">
          <h3><i className="fas fa-list-ol"></i> Resultados por Candidato</h3>
          <div className="candidates-table">
            <table>
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Candidato</th>
                  <th>Votos</th>
                  <th>Porcentaje</th>
                  <th>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {report.campaign.candidatos
                  .sort((a, b) => b.votos - a.votos)
                  .map((candidate, index) => (
                    <tr key={candidate._id}>
                      <td className="position">
                        {index === 0 ? (
                          <i className="fas fa-trophy gold-trophy"></i>
                        ) : (
                          <span>#{index + 1}</span>
                        )}
                      </td>
                      <td className="candidate-name">{candidate.nombre}</td>
                      <td className="votes">{candidate.votos}</td>
                      <td className="percentage">
                        {report.campaign.totalVotos > 0
                          ? ((candidate.votos / report.campaign.totalVotos) * 100).toFixed(1)
                          : 0}%
                      </td>
                      <td className="progress-cell">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: report.campaign.totalVotos > 0
                                ? `${(candidate.votos / report.campaign.totalVotos) * 100}%`
                                : '0%'
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NUEVO: Participación por Iglesia */}
        <div className="iglesias-stats-section">
          <h3><i className="fas fa-church"></i> Participación por Iglesia</h3>
          <div className="iglesias-table">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre de la Iglesia</th>
                  <th>Votos Asignados</th>
                  <th>Votos Usados</th>
                  <th>Votos Disponibles</th>
                  <th>Participación</th>
                  <th>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {iglesiasStats.map((iglesia) => (
                  <tr key={iglesia.codigo}>
                    <td className="codigo">{iglesia.codigo}</td>
                    <td className="nombre">{iglesia.nombre}</td>
                    <td className="text-center">{iglesia.votosAsignados}</td>
                    <td className="text-center">{iglesia.votosUsados}</td>
                    <td className="text-center">{iglesia.votosDisponibles}</td>
                    <td className="text-center">
                      <span className={`percentage-badge ${
                        parseFloat(iglesia.porcentajeParticipacion) >= 80 ? 'high' : 
                        parseFloat(iglesia.porcentajeParticipacion) >= 50 ? 'medium' : 
                        'low'
                      }`}>
                        {iglesia.porcentajeParticipacion}%
                      </span>
                    </td>
                    <td className="progress-cell">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            parseFloat(iglesia.porcentajeParticipacion) >= 80 ? 'high' : 
                            parseFloat(iglesia.porcentajeParticipacion) >= 50 ? 'medium' : 
                            'low'
                          }`}
                          style={{
                            width: `${iglesia.porcentajeParticipacion}%`
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="additional-info">
          <div className="info-box">
            <h4><i className="fas fa-info-circle"></i> Información del Reporte</h4>
            <p><strong>Fecha de Generación:</strong> {new Date().toLocaleString('es-GT')}</p>
            <p><strong>Estado de la Campaña:</strong> {report.campaign.estado}</p>
            <p><strong>Total de Votos Registrados:</strong> {report.campaign.totalVotos}</p>
            <p><strong>Total de Votos Asignados:</strong> {getTotalVotosAsignados()}</p>
            <p><strong>Total de Votos Usados:</strong> {getTotalVotosUsados()}</p>
            <p><strong>Votos Disponibles Restantes:</strong> {getTotalVotosAsignados() - getTotalVotosUsados()}</p>
            <p><strong>Iglesias Participantes:</strong> {iglesiasStats.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignReport;