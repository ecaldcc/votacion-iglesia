import express from 'express';
import mongoose from 'mongoose';
import Vote from '../models/vote.js';
import Campaign from '../models/campaing.js';
import Iglesia from '../models/iglesia.js';
import { authMiddleware, iglesiaMiddleware } from '../middleware/auth-jwt.js';

const router = express.Router();

let broadcastToCampaign = null;

export const setBroadcastFunction = (broadcastFn) => {
  broadcastToCampaign = broadcastFn;
};

// ========================================
// EMITIR VOTO CON TRANSACCIONES OPTIMIZADAS
// ========================================
router.post('/', authMiddleware, iglesiaMiddleware, async (req, res) => {
  // ✅ CREAR SESIÓN CON TIMEOUT AUMENTADO
  const session = await mongoose.startSession();
  
  // ✅ CONFIGURAR OPCIONES DE TRANSACCIÓN
  const transactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' },
    maxCommitTimeMS: 10000, // ← 10 segundos para commit
  };
  
  try {
    // ✅ INICIAR TRANSACCIÓN CON OPCIONES
    await session.startTransaction(transactionOptions);
    
    const { campaignId, candidateId } = req.body;

    // Validaciones básicas
    if (!campaignId || !candidateId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Campaña y candidato son requeridos.'
      });
    }

    // ✅ USAR findOneAndUpdate CON RETRY_WRITES
    // Esto es más rápido que find + save
    const campaign = await Campaign.findById(campaignId)
      .session(session)
      .maxTimeMS(8000); // ← 8 segundos max para esta query
    
    if (!campaign) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    // Validar estado de la campaña
    if (campaign.estado === 'cerrada') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Esta campaña ha sido cerrada.'
      });
    }

    if (campaign.estado !== 'habilitada') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Esta campaña no está habilitada para votación.'
      });
    }

    // Validar fechas
    const now = new Date();
    if (campaign.fechaFin < now) {
      campaign.estado = 'cerrada';
      await campaign.save({ session });
      await session.commitTransaction();
      return res.status(400).json({
        success: false,
        message: 'El tiempo de votación ha finalizado.'
      });
    }

    if (campaign.fechaInicio > now) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'La votación aún no ha iniciado.'
      });
    }

    // Validar que el candidato exista
    const candidate = campaign.candidatos.id(candidateId);
    if (!candidate) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Candidato no encontrado en esta campaña.'
      });
    }

    // Obtener iglesia
    const iglesia = await Iglesia.findById(req.userId)
      .session(session)
      .maxTimeMS(5000);
      
    if (!iglesia) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Iglesia no encontrada.'
      });
    }

    // ✅ CONTAR VOTOS CON TIMEOUT
    const votosUsados = await Vote.countDocuments({
      campaignId,
      iglesiaId: req.userId
    })
      .session(session)
      .maxTimeMS(5000);

    if (votosUsados >= iglesia.votosAsignados) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Ya has usado todos tus votos disponibles en esta campaña.'
      });
    }

    // Crear el voto
    const vote = new Vote({
      campaignId,
      iglesiaId: req.userId,
      candidateId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    await vote.save({ session });

    // ✅ ACTUALIZACIÓN ATÓMICA MÁS EFICIENTE
    await Campaign.findByIdAndUpdate(
      campaignId,
      {
        $inc: { 
          totalVotos: 1,
          'candidatos.$[elem].votos': 1
        }
      },
      {
        arrayFilters: [{ 'elem._id': candidateId }],
        session,
        new: true,
        maxTimeMS: 5000 // ← Timeout para esta operación
      }
    );

    // Actualizar o crear registro de votos por iglesia
    const iglesiaVotoIndex = campaign.votosPorIglesia.findIndex(
      v => v.iglesiaId && v.iglesiaId.toString() === req.userId.toString()
    );

    if (iglesiaVotoIndex >= 0) {
      await Campaign.findOneAndUpdate(
        { 
          _id: campaignId,
          'votosPorIglesia.iglesiaId': req.userId
        },
        {
          $inc: { 'votosPorIglesia.$.votosUsados': 1 }
        },
        { 
          session,
          maxTimeMS: 5000
        }
      );
    } else {
      await Campaign.findByIdAndUpdate(
        campaignId,
        {
          $push: {
            votosPorIglesia: {
              iglesiaId: req.userId,
              votosUsados: 1
            }
          }
        },
        { 
          session,
          maxTimeMS: 5000
        }
      );
    }

    // ✅ COMMIT CON RETRY AUTOMÁTICO
    await session.commitTransaction();

    // Obtener datos actualizados para WebSocket
    const updatedCampaign = await Campaign.findById(campaignId);
    const updatedCandidate = updatedCampaign.candidatos.id(candidateId);

    // WebSocket broadcast DESPUÉS del commit
    if (broadcastToCampaign) {
      broadcastToCampaign(campaignId.toString(), 'vote_cast', {
        campaignId: campaignId.toString(),
        candidateId: candidateId.toString(),
        iglesiaName: iglesia.nombre,
        candidateName: updatedCandidate.nombre,
        newVoteCount: updatedCandidate.votos,
        totalVotes: updatedCampaign.totalVotos,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Voto registrado exitosamente.',
      vote: {
        campaignId,
        candidateId,
        votedAt: vote.votedAt
      },
      votosRestantes: iglesia.votosAsignados - (votosUsados + 1)
    });

  } catch (error) {
    await session.abortTransaction();
    
    // MANEJO DE ERRORES ESPECÍFICOS
    if (error.name === 'MongoServerError' && error.code === 112) {
      // WriteConflict - Reintentar automáticamente
      console.error(' Conflicto de escritura (múltiples votos simultáneos)');
      return res.status(409).json({
        success: false,
        message: 'Múltiples votos simultáneos detectados. Por favor, intenta nuevamente.',
        retryable: true
      });
    }
    
    if (error.name === 'MongoNetworkTimeoutError' || error.message.includes('timeout')) {
      console.error(' Timeout en transacción:', error.message);
      return res.status(408).json({
        success: false,
        message: 'La operación tardó demasiado. Por favor, intenta nuevamente.',
        retryable: true
      });
    }
    
    console.error('Error al votar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar voto. Por favor, intenta nuevamente.',
      error: error.message
    });
  } finally {
    session.endSession();
  }
});

// Obtener votos restantes de una iglesia en una campaña
router.get('/remaining/:campaignId', authMiddleware, iglesiaMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;

    const iglesia = await Iglesia.findById(req.userId);
    if (!iglesia) {
      return res.status(404).json({
        success: false,
        message: 'Iglesia no encontrada.'
      });
    }

    const votosUsados = await Vote.countDocuments({
      campaignId,
      iglesiaId: req.userId
    });

    res.json({
      success: true,
      votosAsignados: iglesia.votosAsignados,
      votosUsados,
      votosDisponibles: iglesia.votosAsignados - votosUsados
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener votos restantes.',
      error: error.message
    });
  }
});

export default router;