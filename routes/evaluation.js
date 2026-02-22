const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/evaluations?userId=
router.get('/', async (req, res) => {
    const { userId } = req.query;
    try {
        let q = 'SELECT e.*, u.name FROM evaluations e JOIN users u ON e.user_id=u.id WHERE 1=1';
        const params = [];
        if (userId) { q += ' AND e.user_id=$1'; params.push(userId); }
        q += ' ORDER BY e.updated_at DESC';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/evaluations
router.post('/', async (req, res) => {
    const { user_id, radar_data, history_data, objectives, feedback_message, feedback_date, feedback_by, period } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO evaluations (user_id, radar_data, history_data, objectives, feedback_message, feedback_date, feedback_by, period)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [user_id, JSON.stringify(radar_data), JSON.stringify(history_data), JSON.stringify(objectives), feedback_message, feedback_date, feedback_by, period]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/evaluations/:id
router.put('/:id', async (req, res) => {
    const { radar_data, history_data, objectives, feedback_message, feedback_date, feedback_by, period } = req.body;
    try {
        const result = await pool.query(
            `UPDATE evaluations SET radar_data=$1,history_data=$2,objectives=$3,feedback_message=$4,
             feedback_date=$5,feedback_by=$6,period=$7,updated_at=CURRENT_TIMESTAMP WHERE id=$8 RETURNING *`,
            [JSON.stringify(radar_data), JSON.stringify(history_data), JSON.stringify(objectives), feedback_message, feedback_date, feedback_by, period, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/evaluations/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM evaluations WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
