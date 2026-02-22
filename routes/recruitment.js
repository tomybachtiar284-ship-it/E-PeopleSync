const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── Jobs ────────────────────────────────────────────────────

router.get('/jobs', async (req, res) => {
    const { status } = req.query;
    try {
        let q = 'SELECT * FROM jobs WHERE 1=1';
        const params = [];
        if (status) { q += ' AND status=$1'; params.push(status); }
        q += ' ORDER BY created_at DESC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/jobs', async (req, res) => {
    const { title, department, location, type, description, requirements, status, posted_by } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO jobs (title, department, location, type, description, requirements, status, posted_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [title, department, location, type, description, requirements, status || 'open', posted_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/jobs/:id', async (req, res) => {
    const { title, department, location, type, description, requirements, status } = req.body;
    try {
        const result = await pool.query(
            `UPDATE jobs SET title=$1,department=$2,location=$3,type=$4,description=$5,requirements=$6,status=$7 WHERE id=$8 RETURNING *`,
            [title, department, location, type, description, requirements, status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/jobs/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Applications ─────────────────────────────────────────────

router.get('/applications', async (req, res) => {
    const { userId, jobId, status } = req.query;
    try {
        let q = `SELECT a.*, j.title as job_title, u.name, u.email 
                 FROM applications a JOIN jobs j ON a.job_id=j.id JOIN users u ON a.user_id=u.id WHERE 1=1`;
        const params = []; let idx = 1;
        if (userId) { q += ` AND a.user_id=$${idx++}`; params.push(userId); }
        if (jobId) { q += ` AND a.job_id=$${idx++}`; params.push(jobId); }
        if (status) { q += ` AND a.status=$${idx++}`; params.push(status); }
        q += ' ORDER BY a.applied_at DESC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/applications', async (req, res) => {
    const { job_id, user_id, cover_letter, quiz_score } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO applications (job_id, user_id, cover_letter, quiz_score)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [job_id, user_id, cover_letter, quiz_score]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/applications/:id', async (req, res) => {
    const { status, quiz_score } = req.body;
    try {
        const result = await pool.query(
            `UPDATE applications SET status=$1, quiz_score=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,
            [status, quiz_score, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
