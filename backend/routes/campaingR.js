import express from 'express';
import Campaign from '../models/campaing.js';
import { authMiddleware, iglesiaMiddleware } from '../middleware/auth-jwt.js';
import Vote from '../models/vote.js';

const router = express.Router();

// Obtener todas las campañas (para votantes)
router.get('/', authMiddleware, iglesiaMiddleware, async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .select('-createdBy')
      .sort({ createdAt: -1 });

    const now = new Date();
    for (let campaign of campaigns) {
      if (campaign.estado === 'habilitada' && campaign.fechaFin < now) {
        campaign.estado = 'cerrada';
        await campaign.save();
      }
    }

    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener campañas.',
      error: error.message
    });
  }
});

// Obtener una campaña específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaña no encontrada.'
      });
    }

    const now = new Date();
    if (campaign.estado === 'habilitada' && campaign.fechaFin < now) {
      campaign.estado = 'cerrada';
      await campaign.save();
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error al obtener campaña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener campaña.',
      error: error.message
    });
  }
});

export default router;