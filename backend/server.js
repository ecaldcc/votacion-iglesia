import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

// Importar config de base de datos
import connectDB from './config/conexion.js';

// Importar rutas
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaingR.js';
import voteRoutes from './routes/voteR.js';
import adminRoutes from './routes/adminR.js';

// Importar funciones para inyectar broadcast
import { setBroadcastFunction } from './routes/voteR.js';
import { setBroadcastFunctions } from './routes/adminR.js';

// Cargar variables de entorno
dotenv.config();

const app = express();

// Crear servidor HTTP (necesario para WebSocket)
const server = http.createServer(app);

// ============================================
// WEBSOCKET SERVER
// ============================================

const wss = new WebSocketServer({ server });

// Mapas para gestionar clientes
const campaignSubscribers = new Map(); // { campaignId: Set<WebSocket> }
const allClients = new Set(); //Todos los clientes conectados

console.log('🔌 Servidor WebSocket inicializado');

wss.on('connection', (ws, req) => {
  console.log(' Nueva conexion WebSocket');
  
  let authenticatedUser = null;
  let subscribedCampaigns = new Set();
  
  allClients.add(ws);

  // Timeout de autenticacion (5 segundos)
  const authTimeout = setTimeout(() => {
    if (!authenticatedUser) {
      ws.close(4001, 'No autenticado');
      console.log('Conexión cerrada: timeout de autenticacion');
    }
  }, 5000);

  // Manejar mensajes del cliente
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, data: payload } = data;

      switch (type) {
        case 'authenticate':
          // Verificar JWT token
          try {
            const token = payload.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            authenticatedUser = decoded;
            clearTimeout(authTimeout);
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              data: { success: true, user: { id: decoded.id, role: decoded.role } }
            }));
            
            console.log(`Usuario autenticado: ${decoded.id} (${decoded.role})`);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'auth_error',
              data: { message: 'Token inválido' }
            }));
            ws.close(4001, 'Token inválido');
          }
          break;

        case 'subscribe':
          if (!authenticatedUser) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'No autenticado' }
            }));
            return;
          }

          const campaignId = payload.campaignId;
          subscribedCampaigns.add(campaignId);
          
          if (!campaignSubscribers.has(campaignId)) {
            campaignSubscribers.set(campaignId, new Set());
          }
          campaignSubscribers.get(campaignId).add(ws);
          
          console.log(`Usuario ${authenticatedUser.id} suscrito a campaña: ${campaignId}`);
          break;

        case 'unsubscribe':
          const unsubCampaignId = payload.campaignId;
          subscribedCampaigns.delete(unsubCampaignId);
          
          if (campaignSubscribers.has(unsubCampaignId)) {
            campaignSubscribers.get(unsubCampaignId).delete(ws);
          }
          
          console.log(`Usuario ${authenticatedUser?.id} desuscrito de campaña: ${unsubCampaignId}`);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log(' Tipo de mensaje desconocido:', type);
      }
    } catch (error) {
      console.error(' Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Error procesando mensaje' }
      }));
    }
  });

  // Manejar desconexión
  ws.on('close', () => {
    console.log(' Cliente desconectado');
    allClients.delete(ws);
    
    // Limpiar suscripciones
    subscribedCampaigns.forEach(campaignId => {
      if (campaignSubscribers.has(campaignId)) {
        campaignSubscribers.get(campaignId).delete(ws);
        
        // Limpiar campaña si no tiene suscriptores
        if (campaignSubscribers.get(campaignId).size === 0) {
          campaignSubscribers.delete(campaignId);
        }
      }
    });
  });

  // Manejar errores
  ws.on('error', (error) => {
    console.error('Error WebSocket:', error);
  });

  // Keep-alive ping cada 30 segundos
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

// ============================================
// FUNCIONES DE BROADCAST
// ============================================

/**
 * Enviar mensaje a todos los suscriptores de una campaña
 */
function broadcastToCampaign(campaignId, eventType, data) {
  const subscribers = campaignSubscribers.get(campaignId);
  
  if (!subscribers || subscribers.size === 0) {
    console.log(` No hay suscriptores para campaña: ${campaignId}`);
    return;
  }

  const message = JSON.stringify({
    type: eventType,
    data: { ...data, campaignId }
  });

  let sentCount = 0;
  subscribers.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });

  console.log(`Broadcast enviado a ${sentCount} cliente(s) en campaña ${campaignId}`);
}

/**
 * Enviar mensaje a todos los clientes conectados
 */
function broadcastToAll(eventType, data) {
  const message = JSON.stringify({
    type: eventType,
    data
  });

  let sentCount = 0;
  allClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sentCount++;
    }
  });

  console.log(` Broadcast global enviado a ${sentCount} cliente(s)`);
}

// Inyectar funciones de broadcast en los routers
setBroadcastFunction(broadcastToCampaign);
setBroadcastFunctions(broadcastToCampaign, broadcastToAll);

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Configuracion para produccion y desarrollo
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL  // URL de frontend en produccion
    : ['http://localhost:5174', 'http://localhost:5173'], // URLs de desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// CONEXIoN A BASE DE DATOS
// ============================================

// Conectar a MongoDB antes de iniciar el servidor
await connectDB();

// ============================================
// RUTAS
// ============================================

// Ruta raiz
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'API Sistema de Votacion - Colegio de Ingenieros',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    websocket: 'enabled'
  });
});

// Health check 
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Estadísticas WebSocket
app.get('/api/websocket/stats', (req, res) => {
  const stats = {
    totalConnections: allClients.size,
    totalCampaigns: campaignSubscribers.size,
    campaigns: Array.from(campaignSubscribers.entries()).map(([id, subs]) => ({
      campaignId: id,
      subscribers: subs.size
    }))
  };
  res.json(stats);
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// Ruta 404 - No encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

app.use((err, req, res, next) => {
  console.error('Error capturado:', err.stack);
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;

// IMPORTANTE: Usar 'server' en lugar de 'app'
server.listen(PORT, () => {
  console.log('═'.repeat(50));
  console.log(` Servidor HTTP corriendo en puerto ${PORT}`);
  console.log(` Servidor WebSocket activo en puerto ${PORT}`);
  console.log(` Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Stats WebSocket: http://localhost:${PORT}/api/websocket/stats`);
  console.log('═'.repeat(50));
});