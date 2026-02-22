const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(r => {
            // pg driver auto-parses JSONB columns; value is already a JS object/array/string
            settings[r.key] = r.value;
        });
        res.json(settings);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/settings/:key
router.put('/:key', async (req, res) => {
    const { value } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
             ON CONFLICT (key) DO UPDATE SET value=$2::jsonb, updated_at=CURRENT_TIMESTAMP RETURNING *`,
            [req.params.key, JSON.stringify(value)]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/notifications?userId=
router.get('/notifications', async (req, res) => {
    const { userId } = req.query;
    try {
        let q = 'SELECT * FROM notifications WHERE 1=1';
        const params = [];
        if (userId) { q += ' AND user_id=$1'; params.push(userId); }
        q += ' ORDER BY created_at DESC LIMIT 50';
        const result = await pool.query(q, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/notifications
router.post('/notifications', async (req, res) => {
    const { user_id, title, message, type } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4) RETURNING *`,
            [user_id, title, message, type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
