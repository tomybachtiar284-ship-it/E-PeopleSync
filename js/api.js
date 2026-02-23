/**
 * E-PeopleSync - Centralized API Client
 * Semua request ke backend PostgreSQL melalui file ini.
 */

const API_BASE = 'http://localhost:3001';

// ── Core Helpers ─────────────────────────────────────────────

async function apiRequest(method, endpoint, body = null) {
    const token = localStorage.getItem('jwtToken');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }
        return data;
    } catch (err) {
        console.error(`[API] ${method} ${endpoint} failed:`, err.message);
        throw err;
    }
}

const apiGet = (endpoint) => apiRequest('GET', endpoint);
const apiPost = (endpoint, body) => apiRequest('POST', endpoint, body);
const apiPut = (endpoint, body) => apiRequest('PUT', endpoint, body);
const apiDelete = (endpoint) => apiRequest('DELETE', endpoint);

// ── Auth ─────────────────────────────────────────────────────

const API = {
    // AUTH
    login: (username, password) => apiPost('/api/login', { username, password }),
    registerCandidate: (email, name) => apiPost('/api/auth/register-candidate', { email, name }),

    // EMPLOYEES
    getEmployees: (params = {}) => apiGet('/api/employees?' + new URLSearchParams(params)),
    getEmployee: (id) => apiGet(`/api/employees/${id}`),
    createEmployee: (data) => apiPost('/api/employees', data),
    updateEmployee: (id, data) => apiPut(`/api/employees/${id}`, data),
    deleteEmployee: (id) => apiDelete(`/api/employees/${id}`),

    // ATTENDANCE
    getAttendance: (params = {}) => apiGet('/api/attendance?' + new URLSearchParams(params)),
    saveAttendance: (data) => apiPost('/api/attendance', data),
    updateAttendance: (id, data) => apiPut(`/api/attendance/${id}`, data),
    deleteAttendance: (id) => apiDelete(`/api/attendance/${id}`),

    // ROSTER
    getRoster: (params = {}) => apiGet('/api/attendance/roster?' + new URLSearchParams(params)),
    saveRoster: (data) => apiPost('/api/attendance/roster', data),

    // SHIFTS
    getShifts: () => apiGet('/api/attendance/shifts'),
    saveShift: (data) => apiPost('/api/attendance/shifts', data),

    // LEAVE
    getLeave: (params = {}) => apiGet('/api/leave?' + new URLSearchParams(params)),
    submitLeave: (data) => apiPost('/api/leave', data),
    approveLeave: (id, data) => apiPut(`/api/leave/${id}/approve`, data),
    deleteLeave: (id) => apiDelete(`/api/leave/${id}`),

    // PAYROLL
    getPayrollSettings: () => apiGet('/api/payroll/settings'),
    savePayrollSettings: (data) => apiPut('/api/payroll/settings', data),
    getPayrollRecords: (params = {}) => apiGet('/api/payroll/records?' + new URLSearchParams(params)),
    savePayrollRecord: (data) => apiPost('/api/payroll/records', data),

    // ASSETS
    getAssets: () => apiGet('/api/assets'),
    createAsset: (data) => apiPost('/api/assets', data),
    updateAsset: (id, data) => apiPut(`/api/assets/${id}`, data),
    deleteAsset: (id) => apiDelete(`/api/assets/${id}`),

    // LEARNING
    getCourses: () => apiGet('/api/learning/courses'),
    createCourse: (data) => apiPost('/api/learning/courses', data),
    updateCourse: (id, data) => apiPut(`/api/learning/courses/${id}`, data),
    deleteCourse: (id) => apiDelete(`/api/learning/courses/${id}`),
    getCourseModules: (courseId) => apiGet(`/api/learning/courses/${courseId}/modules`),
    addCourseModule: (courseId, data) => apiPost(`/api/learning/courses/${courseId}/modules`, data),
    updateCourseModule: (id, data) => apiPut(`/api/learning/modules/${id}`, data),
    deleteCourseModule: (id) => apiDelete(`/api/learning/modules/${id}`),
    getEnrollments: (params = {}) => apiGet('/api/learning/enrollments?' + new URLSearchParams(params)),
    enroll: (data) => apiPost('/api/learning/enrollments', data),
    updateEnrollment: (id, data) => apiPut(`/api/learning/enrollments/${id}`, data),
    getQuizzes: (params = {}) => apiGet('/api/learning/quizzes?' + new URLSearchParams(params)),
    createQuiz: (data) => apiPost('/api/learning/quizzes', data),
    updateQuiz: (id, data) => apiPut(`/api/learning/quizzes/${id}`, data),
    getQuizAttempts: (params = {}) => apiGet('/api/learning/quiz-attempts?' + new URLSearchParams(params)),
    submitQuizAttempt: (data) => apiPost('/api/learning/quiz-attempts', data),
    updateQuizAttempt: (id, data) => apiPut(`/api/learning/quiz-attempts/${id}`, data),

    // EVALUATIONS
    getEvaluations: (params = {}) => apiGet('/api/evaluations?' + new URLSearchParams(params)),
    createEvaluation: (data) => apiPost('/api/evaluations', data),
    updateEvaluation: (id, data) => apiPut(`/api/evaluations/${id}`, data),

    // RECRUITMENT
    getJobs: (params = {}) => apiGet('/api/recruitment/jobs?' + new URLSearchParams(params)),
    createJob: (data) => apiPost('/api/recruitment/jobs', data),
    updateJob: (id, data) => apiPut(`/api/recruitment/jobs/${id}`, data),
    deleteJob: (id) => apiDelete(`/api/recruitment/jobs/${id}`),
    getApplications: (params = {}) => apiGet('/api/recruitment/applications?' + new URLSearchParams(params)),
    applyJob: (data) => apiPost('/api/recruitment/applications', data),
    updateApplication: (id, data) => apiPut(`/api/recruitment/applications/${id}`, data),

    // NEWS
    getNews: () => apiGet('/api/news'),
    createNews: (data) => apiPost('/api/news', data),
    updateNews: (id, data) => apiPut(`/api/news/${id}`, data),
    deleteNews: (id) => apiDelete(`/api/news/${id}`),

    // SETTINGS
    getSettings: () => apiGet('/api/settings'),
    saveSetting: (key, value) => apiPut(`/api/settings/${key}`, { value }),

    // NOTIFICATIONS
    getNotifications: (userId) => apiGet(`/api/settings/notifications?userId=${userId}`),
    createNotification: (data) => apiPost('/api/settings/notifications', data),
    markNotifRead: (id) => apiPut(`/api/settings/notifications/${id}/read`, {}),
};
