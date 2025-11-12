import axios, { AxiosError, type AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let sessionExpiredAlertShown = false;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      const isExpired = error.response?.data?.expired || 
                       error.response?.data?.message?.includes('expirado') ||
                       error.response?.data?.message?.includes('expired');
      
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      
      if (!sessionExpiredAlertShown) {
        sessionExpiredAlertShown = true;
        
        if (isExpired) {
          alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else {
          alert('Tu sesión no es válida. Por favor, inicia sesión nuevamente.');
        }
        
        setTimeout(() => {
          sessionExpiredAlertShown = false;
          window.location.href = '/login';
        }, 500);
      }
    }
    
    return Promise.reject(error);
  }
);

// ========== AUTH ==========
export const authAPI = {
  // Login para iglesias
  loginIglesia: async (data: {
    codigo: string;
    nombre: string;
    password: string;
  }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Login para admin
  loginAdmin: async (data: {
    codigo: string;
    password: string;
    userType: string;
  }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Obtener lista de iglesias
  getIglesias: async () => {
    const response = await api.get('/auth/iglesias');
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.log('Error en logout (ignorado):', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    }
  },
};

// ========== CAMPAIGNS ==========
export const campaignsAPI = {
  getAll: async () => {
    const response = await api.get('/campaigns');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  // Verificar votos restantes de una iglesia
  getVotosRestantes: async (campaignId: string) => {
    const response = await api.get(`/votes/remaining/${campaignId}`);
    return response.data;
  },
};

// ========== VOTES ==========
export const votesAPI = {
  cast: async (data: { campaignId: string; candidateId: string }) => {
    const response = await api.post('/votes', data);
    return response.data;
  },

  getCampaignVotes: async (campaignId: string) => {
    const response = await api.get(`/votes/campaign/${campaignId}`);
    return response.data;
  },
};

// ========== ADMIN ==========
export const adminAPI = {
  // Campañas
  createCampaign: async (data: any) => {
    const response = await api.post('/admin/campaigns', data);
    return response.data;
  },

  getAllCampaigns: async () => {
    const response = await api.get('/admin/campaigns');
    return response.data;
  },

  updateCampaign: async (id: string, data: any) => {
    const response = await api.put(`/admin/campaigns/${id}`, data);
    return response.data;
  },

  deleteCampaign: async (id: string) => {
    const response = await api.delete(`/admin/campaigns/${id}`);
    return response.data;
  },

  toggleCampaign: async (id: string, estado: string) => {
    const response = await api.patch(`/admin/campaigns/${id}/toggle`, { estado });
    return response.data;
  },

  // Cerrar/Reabrir votación
  closeCampaign: async (id: string) => {
    const response = await api.patch(`/admin/campaigns/${id}/close`);
    return response.data;
  },

  reopenCampaign: async (id: string) => {
    const response = await api.patch(`/admin/campaigns/${id}/reopen`);
    return response.data;
  },

  // Candidatos
  addCandidate: async (campaignId: string, data: any) => {
    const response = await api.post(`/admin/campaigns/${campaignId}/candidates`, data);
    return response.data;
  },

  updateCandidate: async (campaignId: string, candidateId: string, data: any) => {
    const response = await api.put(`/admin/campaigns/${campaignId}/candidates/${candidateId}`, data);
    return response.data;
  },

  deleteCandidate: async (campaignId: string, candidateId: string) => {
    const response = await api.delete(`/admin/campaigns/${campaignId}/candidates/${candidateId}`);
    return response.data;
  },

  // Reportes
  getGeneralReport: async () => {
    const response = await api.get('/admin/reports/general');
    return response.data;
  },

  getCampaignReport: async (id: string) => {
    const response = await api.get(`/admin/reports/campaign/${id}`);
    return response.data;
  },

  // Estadísticas de iglesias
  getIglesiasStats: async (campaignId: string) => {
    const response = await api.get(`/admin/campaigns/${campaignId}/iglesias-stats`);
    return response.data;
  },

  // Usuarios (mantener para admins)
  getVoters: async () => {
    const response = await api.get('/admin/users/voters');
    return response.data;
  },

  toggleUser: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/admin/users/${id}/toggle`, { isActive });
    return response.data;
  },
};

export default api;