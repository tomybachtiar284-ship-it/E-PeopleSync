const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/leave?userId=&status=
router.get('/', async (req, res) => {
    const { userId, status } = req.query;
    try {
        let query = `SELECT l.*, u.name, u.department FROM leave_requests l JOIN users u ON l.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (userId) { query += ` AND l.user_id = $${idx++}`; params.push(userId); }
        if (status) { query += ` AND l.status = $${idx++}`; params.push(status); }
        query += ' ORDER BY l.submitted_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/leave/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, u.name AS emp_name, u.department FROM leave_requests l
             JOIN users u ON l.user_id = u.id WHERE l.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/leave
router.post('/', async (req, res) => {
    const { user_id, type, start_date, end_date, reason } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO leave_requests (user_id, type, start_date, end_date, reason)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [user_id, type, start_date, end_date, reason]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/leave/:id/approve
router.put('/:id/approve', async (req, res) => {
    const { approved_by, status } = req.body; // status: 'Approved' | 'Rejected'
    try {
        const result = await pool.query(
            `UPDATE leave_requests SET status=$1, approved_by=$2, approved_at=CURRENT_TIMESTAMP
             WHERE id=$3 RETURNING *`,
            [status, approved_by, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/leave/:id (update data pengajuan)
router.put('/:id', async (req, res) => {
    const { type, start_date, end_date, reason } = req.body;
    try {
        const result = await pool.query(
            `UPDATE leave_requests SET type=$1, start_date=$2, end_date=$3, reason=$4
             WHERE id=$5 RETURNING *`,
            [type, start_date, end_date, reason, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/leave/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM leave_requests WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
