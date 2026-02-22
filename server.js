require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
const authMiddleware = require('./middleware/authMiddleware');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ── Routes ───────────────────────────────────────────────────
const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const attendanceRoute = require('./routes/attendance');
const leaveRoute = require('./routes/leave');
const payrollRoute = require('./routes/payroll');
const assetsRoute = require('./routes/assets');
const learningRoute = require('./routes/learning');
const evaluationRoute = require('./routes/evaluation');
const recruitmentRoute = require('./routes/recruitment');
const newsRoute = require('./routes/news');
const settingsRoute = require('./routes/settings');
const documentsRoute = require('./routes/documents');

app.use('/api', authRoute);     // Covers /api/login (Public)
app.use('/api/auth', authRoute); // Covers /api/auth/register-candidate (Public)

// Protected Routes
app.use('/api/employees', authMiddleware, usersRoute);
app.use('/api/attendance', authMiddleware, attendanceRoute);
app.use('/api/leave', authMiddleware, leaveRoute);
app.use('/api/payroll', authMiddleware, payrollRoute);
app.use('/api/assets', authMiddleware, assetsRoute);
app.use('/api/learning', authMiddleware, learningRoute);
app.use('/api/evaluations', authMiddleware, evaluationRoute);
app.use('/api/recruitment', authMiddleware, recruitmentRoute);
app.use('/api/news', authMiddleware, newsRoute);
app.use('/api/settings', authMiddleware, settingsRoute);
app.use('/api/documents', authMiddleware, documentsRoute);

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'E-PeopleSync API running', version: '2.0.0' });
});

// ── Catch-all: Serve frontend index ─────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(port, () => {
    console.log(`🚀 E-PeopleSync API running at http://localhost:${port}`);
    console.log(`📋 Endpoints: /api/employees, /api/attendance, /api/leave, /api/payroll, ...`);
});
