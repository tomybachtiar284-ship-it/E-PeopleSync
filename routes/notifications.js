const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/notifications?userId=
router.get('/', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/notifications error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/notifications/:id/read error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
