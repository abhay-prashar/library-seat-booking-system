import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Seats
export const seatsAPI = {
  getAll: (params) => api.get('/seats', { params }),
  getSections: () => api.get('/seats/sections'),
  getById: (id) => api.get(`/seats/${id}`),
  create: (data) => api.post('/seats', data),
  update: (id, data) => api.put(`/seats/${id}`, data),
  delete: (id) => api.delete(`/seats/${id}`),
  createSection: (data) => api.post('/seats/sections', data),
};

// Bookings
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getMy: (params) => api.get('/bookings/my', { params }),
  getActive: () => api.get('/bookings/active'),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.delete(`/bookings/${id}`, { data: { reason } }),
  checkIn: (id) => api.post(`/bookings/${id}/checkin`),
};

// Admin
export const adminAPI = {
  getBookings: (params) => api.get('/admin/bookings', { params }),
  cancelBooking: (id, reason) => api.delete(`/admin/bookings/${id}`, { data: { reason } }),
  getUsers: (params) => api.get('/admin/users', { params }),
  blockUser: (id, isBlocked, reason) => api.put(`/admin/users/${id}/block`, { isBlocked, reason }),
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
