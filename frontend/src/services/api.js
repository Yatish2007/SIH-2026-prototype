import axios from 'axios';

// Local dev backend. Override with VITE_API_BASE_URL in frontend/.env.local
// (see frontend/.env.example) instead of editing this file.
const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token);
    }
    return res.data;
  },
  register: async (name, email, password, role = 'trainee') => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
  }
};

export const courseService = {
  getCourses: async () => {
    const res = await api.get('/courses/');
    return res.data;
  },
  getCourseDetail: async (courseId) => {
    const res = await api.get(`/courses/${courseId}`);
    return res.data;
  },
  getQuizQuestions: async (courseId) => {
    const res = await api.get(`/courses/${courseId}/quiz`);
    return res.data;
  }
};

export const personalizationService = {
  scaleLevel: async (courseId, selfLevel, answers) => {
    const res = await api.post('/personalization/scale-level', {
      course_id: courseId,
      self_assessed_level: selfLevel,
      answers: answers
    });
    return res.data;
  },
  getPersonalizedPath: async () => {
    const res = await api.get('/personalization/learning-path/latest');
    return res.data;
  }
};

export const monitoringService = {
  startSession: async (courseId, moduleId = null, materialId = null) => {
    const res = await api.post('/monitoring/sessions/start', {
      course_id: courseId,
      module_id: moduleId,
      material_id: materialId
    });
    return res.data;
  },
  sendTelemetry: async (sessionId, eventType, progressPct, details = "", watchTimeSec = 0, skippedSec = 0, speed = 1.0) => {
    const res = await api.post('/monitoring/telemetry', {
      session_id: sessionId,
      event_type: eventType,
      progress_pct: progressPct,
      watch_time_seconds: watchTimeSec,
      skipped_time_seconds: skippedSec,
      playback_speed: speed,
      details: details
    });
    return res.data;
  },
  getPolicyStatus: async (courseId) => {
    const res = await api.get(`/monitoring/courses/${courseId}/policy-status`);
    return res.data;
  }
};

export const certificateService = {
  submitPostAssessment: async (courseId, answers) => {
    const res = await api.post('/certificates/submit-post-assessment', { course_id: courseId, answers });
    return res.data;
  },
  getMyCertificates: async () => {
    const res = await api.get('/certificates/me');
    return res.data;
  }
};

// ==========================================
// TRAINER SERVICE — Course, Module, Material, Policy, Assessment Management
// ==========================================

export const trainerService = {
  // ---- COURSES ----
  createCourse: async (data) => {
    const res = await api.post('/courses/', data);
    return res.data;
  },

  updateCourse: async (courseId, data) => {
    const res = await api.put(`/courses/${courseId}`, data);
    return res.data;
  },

  getCourseDetail: async (courseId) => {
    const res = await api.get(`/courses/${courseId}`);
    return res.data;
  },

  // ---- MODULES ----
  getModules: async (courseId) => {
    const res = await api.get(`/trainer/courses/${courseId}/modules`);
    return res.data;
  },

  createModule: async (courseId, data) => {
    const res = await api.post(`/trainer/courses/${courseId}/modules`, data);
    return res.data;
  },

  updateModule: async (moduleId, data) => {
    const res = await api.put(`/trainer/modules/${moduleId}`, data);
    return res.data;
  },

  deleteModule: async (moduleId) => {
    const res = await api.delete(`/trainer/modules/${moduleId}`);
    return res.data;
  },

  // ---- MATERIALS (File Upload) ----
  uploadMaterial: async (courseId, moduleId, formData, onProgress) => {
    // formData must contain: file, title, material_type, description (optional)
    const token = localStorage.getItem('access_token');
    const res = await axios.post(
      `${API_BASE_URL}/trainer/courses/${courseId}/modules/${moduleId}/materials`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        }
      }
    );
    return res.data;
  },

  deleteMaterial: async (materialId) => {
    const res = await api.delete(`/trainer/materials/${materialId}`);
    return res.data;
  },

  // ---- LEARNING POLICY ----
  getLearningPolicy: async (courseId) => {
    const res = await api.get(`/trainer/courses/${courseId}/learning-policy`);
    return res.data;
  },

  updateLearningPolicy: async (courseId, data) => {
    const res = await api.put(`/trainer/courses/${courseId}/learning-policy`, data);
    return res.data;
  },

  // ---- FINAL ASSESSMENT ----
  getAssessment: async (courseId) => {
    const res = await api.get(`/trainer/courses/${courseId}/assessment`);
    return res.data;
  },

  updateAssessmentSettings: async (courseId, data) => {
    const res = await api.put(`/trainer/courses/${courseId}/assessment/settings`, data);
    return res.data;
  },

  addQuestion: async (courseId, data) => {
    const res = await api.post(`/trainer/courses/${courseId}/assessment/questions`, data);
    return res.data;
  },

  updateQuestion: async (questionId, data) => {
    const res = await api.put(`/trainer/assessment/questions/${questionId}`, data);
    return res.data;
  },

  deleteQuestion: async (questionId) => {
    const res = await api.delete(`/trainer/assessment/questions/${questionId}`);
    return res.data;
  },

  // ---- TRAINEE PROGRESS ANALYTICS ----
  getTraineeProgress: async (courseId) => {
    const res = await api.get(`/trainer/courses/${courseId}/trainee-progress`);
    return res.data;
  },

  // ---- SKILL GAP ANALYTICS ----
  getSkillGapAnalytics: async () => {
    const res = await api.get('/trainer/skill-gap-analytics');
    return res.data;
  }
};

// ==========================================
// FINAL ASSESSMENT SERVICE (TRAINEE EXAM & POLICY)
// ==========================================

export const finalAssessmentService = {
  getAssessmentStatus: async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}/final-assessment`);
      return res.data;
    } catch (err) {
      console.error('Error fetching final assessment status:', err);
      return null;
    }
  },

  submitAssessment: async (courseId, answers) => {
    // answers: { [questionId]: selectedOptionIndex }
    const res = await api.post(`/courses/${courseId}/final-assessment/submit`, { answers });
    return res.data;
  }
};


// ==========================================
// ADMIN SERVICE — Dashboard Stats, User Management
// ==========================================

export const adminService = {
  getDashboardStats: async () => {
    const res = await api.get('/admin/dashboard-stats');
    return res.data;
  },

  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  updateUserRole: async (userId, role) => {
    const res = await api.put(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  deleteUser: async (userId) => {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  }
};

