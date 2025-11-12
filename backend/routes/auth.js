import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Iglesia from '../models/iglesia.js';
import { authMiddleware } from '../middleware/auth-jwt.js';

const router = express.Router();

const generateToken = (userId, role) => {
  const expiresIn = process.env.JWT_EXPIRATION || '24h';
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'secret_key_default',
    { expiresIn }
  );
};

// Login para iglesias y admin
router.post('/login', async (req, res) => {
  try {
    const { codigo, nombre, password, userType } = req.body;

    console.log('📝 Login attempt:', { codigo, nombre, userType }); // Debug

    if (!codigo || !password) {
      return res.status(400).json({
        success: false,
        message: 'Código y contraseña son requeridos.'
      });
    }

    // ========== VERIFICAR SI ES ADMIN ==========
    if (userType === 'admin' || codigo === 'ADMIN' || !nombre) {
      console.log('🔐 Intentando login como ADMIN');
      
      const admin = await User.findOne({ numeroColegiado: codigo, role: 'admin' });
      
      if (!admin) {
        console.log('❌ Admin no encontrado');
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas.'
        });
      }

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

      const token = generateToken(admin._id, admin.role);

      console.log('✅ Admin login exitoso');
      
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

    // Buscar iglesia por código Y nombre
    const iglesia = await Iglesia.findOne({ codigo, nombre });

    if (!iglesia) {
      console.log('❌ Iglesia no encontrada con codigo:', codigo, 'y nombre:', nombre);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifica el código y nombre de la iglesia.'
      });
    }

    console.log('🔍 Iglesia encontrada:', iglesia.nombre);

    // Comparar password
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

    const token = generateToken(iglesia._id, 'iglesia');

    console.log('✅ Iglesia login exitoso');

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

// Obtener lista de iglesias (sin contraseñas)
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

// Verificar token
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

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente.'
  });
});

export default router;