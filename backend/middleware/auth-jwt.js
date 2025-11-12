import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Iglesia from '../models/iglesia.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_default');
    
    let user;
    
    // Buscar primero en usuarios (admin)
    if (decoded.role === 'admin') {
      user = await User.findById(decoded.userId).select('-password');
    } else {
      // Buscar en iglesias
      user = await Iglesia.findById(decoded.userId).select('-password');
      if (user) {
        user.role = 'iglesia';
      }
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo.'
      });
    }

    // ✅ VALIDAR SESSION ID
    if (user.currentSessionId !== decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida. Has iniciado sesión en otro dispositivo.',
        sessionExpired: true,
        reason: 'other_device'
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor, inicia sesión nuevamente.',
        expired: true
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido.'
    });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};

export const iglesiaMiddleware = (req, res, next) => {
  if (req.user.role !== 'iglesia' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de iglesia.'
    });
  }
  next();
};

export const voterMiddleware = iglesiaMiddleware;