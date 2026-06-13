import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'https://smarthire-backend-f1x0.onrender.com'

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  me: () => api.get('/me'),
}

// Candidates
export const candidatesAPI = {
  upload: (formData) => api.post('/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (status) => api.get('/candidates', { params: status ? { status } : {} }),
  get: (id) => api.get(`/candidate/${id}`),
  updateStatus: (id, status) => api.patch(`/candidate/${id}/status`, { status }),
  delete: (id) => api.delete(`/candidate/${id}`),
}

// Jobs
export const jobsAPI = {
  create: (data) => api.post('/job-descriptions', data),
  uploadJD: (formData) => api.post('/upload-jd', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/job-descriptions'),
  get: (id) => api.get(`/job-description/${id}`),
  delete: (id) => api.delete(`/job-description/${id}`),
}

// Analysis
export const analysisAPI = {
  rank: (candidate_id, job_description_id) => api.post('/rank', { candidate_id, job_description_id }),
  skillGap: (candidate_id, job_description_id) => api.post('/skill-gap', { candidate_id, job_description_id }),
  roadmap: (candidate_id, job_description_id) => api.post('/roadmap', { candidate_id, job_description_id }),
  interviewQuestions: (data) => api.post('/interview-questions', data),
  compare: (candidate_ids, job_description_id) => api.post('/compare', { candidate_ids, job_description_id }),
}

// Analytics
export const analyticsAPI = {
  get: () => api.get('/analytics'),
}

// Chat
export const chatAPI = {
  send: (candidate_id, message) => api.post('/chat', { candidate_id, message }),
  history: (candidate_id) => api.get(`/chat/${candidate_id}/history`),
  clearHistory: (candidate_id) => api.delete(`/chat/${candidate_id}/history`),
}

// Export
export const exportAPI = {
  download: (format = 'csv', status) => api.get('/export', {
    params: { format, ...(status ? { status } : {}) },
    responseType: 'blob',
  }),
}

export default api
