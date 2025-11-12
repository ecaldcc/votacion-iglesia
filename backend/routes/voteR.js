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
// EMITIR VOTO CON TRANSACCIONES
// ========================================
router.post('/', authMiddleware, iglesiaMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { campaignId, candidateId } = req.body;

    // Validaciones básicas
    if (!campaignId || !candidateId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Campaña y candidato son requeridos.'
      });
    }

    // Obtener campaña DENTRO de la transacción
    const campaign = await Campaign.findById(campaignId).session(session);
    
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

    // Obtener iglesia DENTRO de la transacción
    const iglesia = await Iglesia.findById(req.userId).session(session);
    if (!iglesia) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Iglesia no encontrada.'
      });
    }

    // Contar votos usados DENTRO de la transacción
    const votosUsados = await Vote.countDocuments({
      campaignId,
      iglesiaId: req.userId
    }).session(session);

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

    // Actualizar contadores usando operadores atómicos
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
        new: true
      }
    );

    // Actualizar o crear registro de votos por iglesia
    const iglesiaVotoIndex = campaign.votosPorIglesia.findIndex(
      v => v.iglesiaId && v.iglesiaId.toString() === req.userId.toString()
    );

    if (iglesiaVotoIndex >= 0) {
      // Iglesia ya tiene votos, incrementar
      await Campaign.findOneAndUpdate(
        { 
          _id: campaignId,
          'votosPorIglesia.iglesiaId': req.userId
        },
        {
          $inc: { 'votosPorIglesia.$.votosUsados': 1 }
        },
        { session }
      );
    } else {
      // Primera vez que vota esta iglesia
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
        { session }
      );
    }

    // ✅ COMMIT de la transacción
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
    console.error('❌ Error al votar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar voto.',
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

