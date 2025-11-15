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
    
    // Buscar usuario según rol
    if (decoded.role === 'admin') {
      user = await User.findById(decoded.userId).select('-password');
    } else {
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

    // ✅ VALIDAR SESSION ID SOLO SI AMBOS TIENEN VALOR
    // Si alguno es null o undefined, permitir acceso (backward compatibility)
    if (decoded.sessionId && user.currentSessionId) {
      // Ambos tienen valor, validar que coincidan
      if (user.currentSessionId !== decoded.sessionId) {
        return res.status(401).json({
          success: false,
          message: 'Sesión inválida. Has iniciado sesión en otro dispositivo.',
          sessionExpired: true,
          reason: 'other_device'
        });
      }
    }
    // Si solo uno tiene sessionId o ninguno tiene, permitir de todos modos

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