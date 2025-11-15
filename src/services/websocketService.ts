// src/services/websocketService.ts

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Conecta al servidor WebSocket
   */
  connect(url: string) {
    // Si ya hay una conexion activa, no crear otra
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket ya está conectado');
      return;
    }

    try {
      // Crear conexion WebSocket
      this.socket = new WebSocket(url);

      // Evento: Conexión establecida
      this.socket.onopen = () => {
        console.log('WebSocket conectado');
        this.reconnectAttempts = 0;

        // Autenticar con el token JWT
        const token = localStorage.getItem('token');
        if (token) {
          this.send('authenticate', { token });
        }
      };

      // Evento: Mensaje recibido
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          // Notificar a todos los listeners de este tipo de evento
          const callbacks = this.listeners.get(type) || [];
          callbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      };

      // Evento: Error
      this.socket.onerror = (error) => {
        console.error('Error en WebSocket:', error);
      };

      // Evento: Conexión cerrada
      this.socket.onclose = (event) => {
        console.log(' WebSocket desconectado', event.code, event.reason);
        this.socket = null;

        // Intentar reconectar automáticamente
        // if (this.reconnectAttempts < this.maxReconnectAttempts) {
        //   this.reconnectAttempts++;
        //   console.log(`Reintentando conexion (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          
        //   this.reconnectTimeout = setTimeout(() => {
        //     this.connect(url);
        //   }, this.reconnectDelay);
        // } else {
        //   console.error('No se pudo reconectar al WebSocket');
        // }
      };
    } catch (error) {
      console.error('Error al crear WebSocket:', error);
    }
  }

  /**
   * Envía un mensaje al servidor
   */
  send(type: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket no esta conectado. No se puede enviar mensaje.');
    }
  }

  /**
   * Registra un listener para un tipo de evento
   */
  on(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  /**
   * Elimina un listener
   */
  off(eventType: string, callback: EventCallback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Elimina todos los listeners de un tipo de evento
   */
  removeAllListeners(eventType: string) {
    this.listeners.delete(eventType);
  }

  /**
   * Cierra la conexion WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.listeners.clear();
    this.reconnectAttempts = 0;
    console.log('WebSocket desconectado manualmente');
  }

  /**
   * Verifica si esta conectado
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Suscribirse a actualizaciones de una campaña específica
   */
  subscribeToCampaign(campaignId: string) {
    this.send('subscribe', { campaignId });
  }

  /**
   * Desuscribirse de actualizaciones de una campaña
   */
  unsubscribeFromCampaign(campaignId: string) {
    this.send('unsubscribe', { campaignId });
  }
}

// Exportar instancia unica (Singleton)
export const wsService = new WebSocketService();

// Tipos de eventos que el servidor puede enviar
export const WSEventType = {
  VOTE_CAST: 'vote_cast',           // Nuevo voto registrado
  CAMPAIGN_UPDATED: 'campaign_updated', // Campaña actualizada
  CAMPAIGN_TOGGLED: 'campaign_toggled', // Estado de campaña cambió
  USER_TOGGLED: 'user_toggled',     // Usuario activado/desactivado
  CAMPAIGN_CLOSED: 'campaign_closed',        // NUEVO
  CAMPAIGN_REOPENED: 'campaign_reopened', 
  NEW_CAMPAIGN: 'new_campaign',     // Nueva campaña creada
  CAMPAIGN_DELETED: 'campaign_deleted', // Campaña eliminada
} as const;

export default wsService;