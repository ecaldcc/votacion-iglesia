import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.js';
import Iglesia from '../models/iglesia.js';
import { authMiddleware } from '../middleware/auth-jwt.js';

const router = express.Router();

const generateToken = (userId, role, sessionId) => {
  const expiresIn = process.env.JWT_EXPIRATION || '24h';
  return jwt.sign(
    { userId, role, sessionId },
    process.env.JWT_SECRET || 'secret_key_default',
    { expiresIn }
  );
};

const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Login para iglesias y admin
router.post('/login', async (req, res) => {
  try {
    const { codigo, nombre, password, userType } = req.body;

    console.log('🔐 Login attempt:', { codigo, nombre, userType });

    if (!codigo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Código y contraseña son requeridos.'
      });
    }

    const userAgent = req.get('user-agent') || 'Desconocido';
    const deviceInfo = userAgent.substring(0, 100);

    // Detección de admin
    const esAdmin = codigo.toUpperCase().startsWith('ADM') || 
                    userType === 'admin' || 
                    !nombre;

    if (esAdmin) {
      console.log('🔐 Intentando login como ADMIN con código:', codigo);
      
      // Buscar admin (case insensitive)
      const admin = await User.findOne({ 
        numeroColegiado: { $regex: new RegExp(`^${codigo}$`, 'i') },
        role: 'admin' 
      });
      
      if (!admin) {
        console.log('❌ Admin no encontrado');
        
        // DEBUG: Ver todos los admins
        const allAdmins = await User.find({ role: 'admin' }).select('numeroColegiado');
        console.log('   Admins en BD:', allAdmins.map(a => a.numeroColegiado));
        
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.'
        });
      }

      console.log('✅ Admin encontrado:', admin.numeroColegiado);

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        console.log('❌ Password incorrecto para admin');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.'
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta ha sido desactivada.'
        });
      }

      // Generar session ID
      const sessionId = generateSessionId();
      
      // Actualizar session
      admin.currentSessionId = sessionId;
      admin.lastLoginAt = new Date();
      admin.lastLoginDevice = deviceInfo;
      await admin.save();

      // Generar token
      const token = generateToken(admin._id, admin.role, sessionId);

      console.log('✅ Admin login exitoso');
      console.log('   SessionId:', sessionId.substring(0, 8) + '...');
      console.log('   Guardado en BD:', admin.currentSessionId ? 'SÍ' : 'NO');
      
      return res.json({
        success: true,
        token,
        role: admin.role,
        name: admin.nombreCompleto,
        message: 'Inicio de sesión exitoso.'
      });
    }

    // ========== LOGIN PARA IGLESIAS ==========
    console.log('⛪ Intentando login como IGLESIA');
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de iglesia es requerido.'
      });
    }

    const iglesia = await Iglesia.findOne({ codigo, nombre });

    if (!iglesia) {
      console.log('❌ Iglesia no encontrada con codigo:', codigo, 'y nombre:', nombre);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifica el código y nombre de la iglesia.'
      });
    }

    console.log('✅ Iglesia encontrada:', iglesia.nombre);

    const isMatch = await iglesia.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Password incorrecto para iglesia');
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta.'
      });
    }

    if (!iglesia.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tu iglesia ha sido desactivada.'
      });
    }

    // Generar session ID
    const sessionId = generateSessionId();
    
    // Actualizar session
    iglesia.currentSessionId = sessionId;
    iglesia.lastLoginAt = new Date();
    iglesia.lastLoginDevice = deviceInfo;
    await iglesia.save();

    // Generar token
    const token = generateToken(iglesia._id, 'iglesia', sessionId);

    console.log('✅ Iglesia login exitoso');
    console.log('   SessionId:', sessionId.substring(0, 8) + '...');

    res.json({
      success: true,
      token,
      role: 'iglesia',
      name: iglesia.nombre,
      codigo: iglesia.codigo,
      votosAsignados: iglesia.votosAsignados,
      message: 'Inicio de sesión exitoso.'
    });

  } catch (error) {
    console.error('💥 Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión.',
      error: error.message
    });
  }
});

router.get('/iglesias', async (req, res) => {
  try {
    const iglesias = await Iglesia.find({ isActive: true })
      .select('codigo nombre')
      .sort({ nombre: 1 });

    res.json({
      success: true,
      iglesias
    });
  } catch (error) {
    console.error('Error al obtener iglesias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener iglesias.',
      error: error.message
    });
  }
});

router.get('/verify', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.nombreCompleto || req.user.nombre,
      role: req.user.role || 'iglesia'
    }
  });
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await User.findByIdAndUpdate(req.userId, {
        currentSessionId: null
      });
    } else {
      await Iglesia.findByIdAndUpdate(req.userId, {
        currentSessionId: null
      });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente.'
    });
  } catch (error) {
    console.log('Error en logout (ignorado):', error);
    res.json({
      success: true,
      message: 'Sesión cerrada.'
    });
  }
});

export default router;