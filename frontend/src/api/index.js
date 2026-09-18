import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_admin');
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

// Classes
export const classAPI = {
  getAll: () => api.get('/classes'),
  getById: (id) => api.get(`/classes/${id}`),
};

// Subjects
export const subjectAPI = {
  getByClass: (classId) => api.get(`/subjects/class/${classId}`),
};

// Students
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  restore: (id) => api.patch(`/students/${id}/restore`),
};

// Shared class test definitions
export const classTestAPI = {
  getAll: (params) => api.get('/class-tests', { params }),
  create: (data) => api.post('/class-tests', data),
  update: (id, data) => api.put(`/class-tests/${id}`, data),
  delete: (id) => api.delete(`/class-tests/${id}`),
};

// Marks
export const marksAPI = {
  submit: (records) => api.post('/marks', { records }),
  getByStudent: (studentId, semester) =>
    api.get(`/marks/student/${studentId}`, { params: semester ? { semester } : {} }),
  update: (id, data) => api.put(`/marks/${id}`, data),
  delete: (id) => api.delete(`/marks/${id}`),
  studentReport: (studentId, params) => api.get(`/marks/report/student/${studentId}`, { params }),
  classReport: (classId, params) => api.get(`/marks/report/class/${classId}`, { params }),
};

export default api;
