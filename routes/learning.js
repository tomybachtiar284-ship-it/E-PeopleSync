const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── Courses ─────────────────────────────────────────────────

router.get('/courses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM courses ORDER BY id');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/courses', async (req, res) => {
    const { title, description, category, department, level, thumbnail, created_by } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO courses (title, description, category, department, level, thumbnail, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [title, description, category, department, level, thumbnail, created_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/courses/:id', async (req, res) => {
    const { title, description, category, department, level, thumbnail } = req.body;
    try {
        const result = await pool.query(
            `UPDATE courses SET title=$1,description=$2,category=$3,department=$4,level=$5,thumbnail=$6 WHERE id=$7 RETURNING *`,
            [title, description, category, department, level, thumbnail, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/courses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Modules ─────────────────────────────────────────────────

router.get('/courses/:courseId/modules', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM course_modules WHERE course_id=$1 ORDER BY sort_order', [req.params.courseId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/courses/:courseId/modules', async (req, res) => {
    const { title, type, url, content, duration, sort_order } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO course_modules (course_id, title, type, url, content, duration, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.params.courseId, title, type, url, content, duration, sort_order || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Enrollments ─────────────────────────────────────────────

router.get('/enrollments', async (req, res) => {
    const { userId, courseId } = req.query;
    try {
        let q = `SELECT e.*, c.title as course_title, u.name FROM enrollments e JOIN courses c ON e.course_id=c.id JOIN users u ON e.user_id=u.id WHERE 1=1`;
        const params = []; let idx = 1;
        if (userId) { q += ` AND e.user_id=$${idx++}`; params.push(userId); }
        if (courseId) { q += ` AND e.course_id=$${idx++}`; params.push(courseId); }
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/enrollments', async (req, res) => {
    const { user_id, course_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2)
             ON CONFLICT (user_id, course_id) DO NOTHING RETURNING *`,
            [user_id, course_id]
        );
        res.status(201).json(result.rows[0] || { message: 'Already enrolled' });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/enrollments/:id', async (req, res) => {
    const { progress, status, completed_at } = req.body;
    try {
        const result = await pool.query(
            `UPDATE enrollments SET progress=$1, status=$2, completed_at=$3 WHERE id=$4 RETURNING *`,
            [progress, status, completed_at, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Quizzes ──────────────────────────────────────────────────

router.get('/quizzes', async (req, res) => {
    const { courseId } = req.query;
    try {
        let q = 'SELECT * FROM quizzes';
        if (courseId) q += ` WHERE course_id = ${parseInt(courseId)}`;
        const result = await pool.query(q);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/quiz-attempts', async (req, res) => {
    const { user_id, quiz_id, score, passed, answers } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO quiz_attempts (user_id, quiz_id, score, passed, answers) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [user_id, quiz_id, score, passed, JSON.stringify(answers)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/quiz-attempts', async (req, res) => {
    const { userId, quizId } = req.query;
    try {
        let q = 'SELECT * FROM quiz_attempts WHERE 1=1';
        const params = []; let idx = 1;
        if (userId) { q += ` AND user_id=$${idx++}`; params.push(userId); }
        if (quizId) { q += ` AND quiz_id=$${idx++}`; params.push(quizId); }
        q += ' ORDER BY attempted_at DESC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
