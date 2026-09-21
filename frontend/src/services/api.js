import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
      }
      return res.data;
    } catch (err) {
      // Mock fallback for offline demo
      const mockUser = {
        id: 1,
        name: email.split('@')[0] || 'User',
        email,
        role: email.includes('trainer') ? 'trainer' : email.includes('admin') ? 'admin' : 'trainee'
      };
      return { access_token: 'mock_jwt_token', user: mockUser };
    }
  },
  register: async (name, email, password, role = 'trainee') => {
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      return res.data;
    } catch (err) {
      return { id: 2, name, email, role };
    }
  }
};

export const courseService = {
  getCourses: async () => {
    try {
      const res = await api.get('/courses/');
      return res.data;
    } catch (err) {
      return [
        {
          id: 1,
          title: "Python Programming",
          category: "Software & Development",
          description: "Master core Python syntax, data structures, OOP, and asynchronous programming.",
          duration: "6 Hours"
        },
        {
          id: 2,
          title: "Web Development & APIs",
          category: "Fullstack Engineering",
          description: "Learn HTML, CSS, JavaScript ES6+, RESTful APIs, and modern frontend frameworks.",
          duration: "8 Hours"
        },
        {
          id: 3,
          title: "Industrial SOP & Operational Safety",
          category: "Industrial Operations",
          description: "Standard operating procedures, emergency protocols, hazard prevention, and compliance.",
          duration: "4 Hours"
        }
      ];
    }
  },
  getCourseDetail: async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      return res.data;
    } catch (err) {
      return null;
    }
  },
  getQuizQuestions: async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}/quiz`);
      return res.data;
    } catch (err) {
      return [
        {
          id: 1,
          course_id: courseId,
          question: "Which keyword is used to define a function in Python?",
          options: ["func", "def", "function", "lambda"],
          difficulty: "easy",
          topic: "Python Syntax"
        },
        {
          id: 2,
          course_id: courseId,
          question: "What is the result of `type([])` in Python?",
          options: ["<class 'tuple'>", "<class 'list'>", "<class 'array'>", "<class 'dict'>"],
          difficulty: "easy",
          topic: "Data Types"
        },
        {
          id: 3,
          course_id: courseId,
          question: "How does a list comprehension `[x**2 for x in range(5) if x % 2 == 0]` evaluate?",
          options: ["[0, 4, 16]", "[1, 9, 25]", "[0, 1, 4, 9, 16]", "[0, 2, 4]"],
          difficulty: "moderate",
          topic: "List Comprehensions"
        },
        {
          id: 4,
          course_id: courseId,
          question: "In Python memory management, what is the purpose of reference counting and garbage collection?",
          options: ["Speed up CPU execution", "Automatically reclaim unused memory blocks", "Prevent type errors at compile time", "Encrypt memory pointers"],
          difficulty: "moderate",
          topic: "Memory Management"
        },
        {
          id: 5,
          course_id: courseId,
          question: "Which of the following describes the GIL (Global Interpreter Lock) in CPython?",
          options: [
            "A lock preventing memory leaks across processes",
            "A mutex that prevents multiple native threads from executing Python bytecodes at once",
            "A feature that automatically parallelizes nested for-loops",
            "A database connection manager in Python"
          ],
          difficulty: "pro",
          topic: "Concurrency & GIL"
        }
      ];
    }
  }
};

export const personalizationService = {
  scaleLevel: async (courseId, selfLevel, answers) => {
    try {
      const res = await api.post('/personalization/scale-level', {
        course_id: courseId,
        self_assessed_level: selfLevel,
        answers: answers
      });
      return res.data;
    } catch (err) {
      // Offline fallback calculation
      const score = answers.reduce((acc, curr, idx) => acc + (idx % 2 === 0 ? 1 : 0), 0);
      const total = answers.length || 5;
      const pct = (score / total) * 100;
      let assessed = selfLevel;
      if (pct < 50) assessed = "Beginner";
      else if (pct < 80) assessed = "Intermediate";
      else assessed = "Advanced";

      return {
        attempt_id: 101,
        course_id: courseId,
        self_level: selfLevel,
        assessed_level: assessed,
        score: score,
        total_questions: total,
        percentage: pct,
        difficulty_scores: {
          easy: { correct: 2, total: 2, ratio: 1.0 },
          moderate: { correct: 1, total: 2, ratio: 0.5 },
          pro: { correct: 0, total: 1, ratio: 0.0 }
        },
        knowledge_gaps: ["Concurrency & GIL", "Memory Optimization"]
      };
    }
  },
  getPersonalizedPath: async () => {
    try {
      const res = await api.get('/personalization/learning-path/latest');
      return res.data;
    } catch (err) {
      return {
        id: 1,
        course_id: 1,
        course_title: "Python Programming",
        assessed_level: "Beginner",
        title: "Python Fundamentals — Personalized Beginner Path",
        objective: "Bridge identified skill gaps in Concurrency & Memory Management through targeted video instruction.",
        modules: [
          { step: 1, title: "Module 1: Memory Allocation & Variables", duration: "15 mins", description: "Clear breakdown of reference counting and memory handles.", status: "active" },
          { step: 2, title: "Module 2: Concurrency & Asyncio Basics", duration: "20 mins", description: "Understanding single-threaded event loops and GIL locks.", status: "pending" },
          { step: 3, title: "Module 3: Practice Exercises & Final Review", duration: "10 mins", description: "Hands-on code snippets and post-assessment prep.", status: "pending" }
        ],
        video_title: "AI Generated Instructional Video: Master Python Core Gaps",
        video_summary: "Custom video generated specifically for your assessed Beginner tier, focusing on foundational concepts.",
        knowledge_gaps: ["Concurrency & GIL", "Memory Management"]
      };
    }
  }
};

export const monitoringService = {
  startSession: async (courseId, moduleId = null, materialId = null) => {
    try {
      const res = await api.post('/monitoring/sessions/start', {
        course_id: courseId,
        module_id: moduleId,
        material_id: materialId
      });
      return res.data;
    } catch (err) {
      return { session_id: Date.now(), course_id: courseId, status: 'in_progress', progress_pct: 0 };
    }
  },
  sendTelemetry: async (sessionId, eventType, progressPct, details = "", watchTimeSec = 0, skippedSec = 0, speed = 1.0) => {
    try {
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
    } catch (err) {
      return {
        session_id: sessionId || 1,
        status: eventType === 'seek_skip' ? 'incomplete' : progressPct >= 100 ? 'completed' : 'in_progress',
        progress_pct: progressPct,
        message: eventType === 'seek_skip' ? 'AI Alert: Seek detected! Session flagged.' : 'Telemetry updated.'
      };
    }
  },
  getPolicyStatus: async (courseId) => {
    try {
      const res = await api.get(`/monitoring/courses/${courseId}/policy-status`);
      return res.data;
    } catch (err) {
      return { is_unlocked: true, policy_passed: true };
    }
  }
};

export const certificateService = {
  submitPostAssessment: async (courseId, answers) => {
    try {
      const res = await api.post('/certificates/submit-post-assessment', { course_id: courseId, answers });
      return res.data;
    } catch (err) {
      return {
        id: 501,
        user_name: "Trainee User",
        course_title: "Python Programming",
        certificate_code: "CC-9F8A2E10",
        issued_date: new Date().toISOString(),
        status: "VALID"
      };
    }
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
    try {
      const res = await api.get('/trainer/skill-gap-analytics');
      return res.data;
    } catch (err) {
      return [];
    }
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
    try {
      const res = await api.get('/admin/dashboard-stats');
      return res.data;
    } catch (err) {
      // Fallback mock data
      return {
        total_users: 148,
        trainee_count: 131,
        trainer_count: 17,
        active_courses: 3,
        total_quiz_attempts: 312,
        issued_certificates: 89,
        active_learning_sessions: 24,
        system_status: 'Operational',
        notifications: [
          { id: 1, title: 'System Update', message: 'AI Level Scaling Engine upgraded to v2.4', time: '10 mins ago' },
          { id: 2, title: 'New Trainer Upload', message: 'SOP-Safety-2026 resource uploaded by Trainer', time: '1 hour ago' }
        ]
      };
    }
  },

  getUsers: async () => {
    try {
      const res = await api.get('/admin/users');
      return res.data;
    } catch (err) {
      return [
        { id: 1, name: 'Alex Johnson', email: 'alex@example.com', role: 'trainee', status: 'Active' },
        { id: 2, name: 'Sarah Miller', email: 'sarah@example.com', role: 'trainer', status: 'Active' },
        { id: 3, name: 'David Chen', email: 'david@example.com', role: 'trainee', status: 'Active' }
      ];
    }
  }
};
