import axios from 'axios';

// API base URL - all API calls will be under /english path
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com/english';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
};

// Learning Items API
export const itemsAPI = {
  create: (data: { type: string; content: string; example?: string; tags?: string[] }) =>
    api.post('/items', data),
  
  getAll: (date?: string) =>
    api.get('/items', { params: { date } }),
  
  getById: (id: number) =>
    api.get(`/items/${id}`),
};

// Reviews API
export const reviewsAPI = {
  getYesterday: () =>
    api.get('/reviews/yesterday'),
  
  submit: (data: {
    mode: string;
    items: Array<{ item_id: number; result: string; score?: number }>;
  }) =>
    api.post('/reviews/submit', data),
  
  getHistory: (limit = 10) =>
    api.get('/reviews/history', { params: { limit } }),
};

// AI API
export const aiAPI = {
  correctText: (data: { text: string; context?: string }) =>
    api.post('/ai/correct-text', data),
  
  translate: (data: { text: string; source_lang?: string; target_lang?: string }) =>
    api.post('/ai/translate', data),
  
  classify: (data: { text: string }) =>
    api.post('/ai/classify', data),
  
  speakingScore: (audioBlob: Blob, targetText: string, itemId?: number) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('target_text', targetText);
    if (itemId) {
      formData.append('item_id', itemId.toString());
    }
    
    return api.post('/ai/speaking-score', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  speakingScoreText: (data: { transcript: string; target_text: string; item_id?: number }) =>
    api.post('/ai/speaking-score-text', data),
};
