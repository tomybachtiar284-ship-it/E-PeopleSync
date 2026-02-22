const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/assets
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM assets ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/assets
router.post('/', async (req, res) => {
    const { id, name, category, status, assigned_to, date_assigned, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO assets (id, name, category, status, assigned_to, date_assigned, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [id, name, category, status || 'Available', assigned_to, date_assigned, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Asset ID sudah ada.' });
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/assets/:id
router.put('/:id', async (req, res) => {
    const { name, category, status, assigned_to, date_assigned, notes } = req.body;
    try {
        const result = await pool.query(
            `UPDATE assets SET name=$1,category=$2,status=$3,assigned_to=$4,date_assigned=$5,notes=$6
             WHERE id=$7 RETURNING *`,
            [name, category, status, assigned_to, date_assigned, notes, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/assets/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM assets WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
