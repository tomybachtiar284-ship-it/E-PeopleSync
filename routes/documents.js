const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/documents
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/documents
router.post('/', async (req, res) => {
    const { id, name, category, version, owner, expiry_date, size, type, file_url } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO documents (id, name, category, version, owner, expiry_date, size, type, file_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [id, name, category, version, owner, expiry_date, size, type, file_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /documents error:', err);
        if (err.code === '23505') return res.status(409).json({ error: 'Document ID already exists.' });
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/documents/:id
router.put('/:id', async (req, res) => {
    const { name, category, version, owner, expiry_date, size, type, file_url } = req.body;
    try {
        const result = await pool.query(
            `UPDATE documents SET name=$1, category=$2, version=$3, owner=$4, expiry_date=$5, size=$6, type=$7, file_url=$8
             WHERE id=$9 RETURNING *`,
            [name, category, version, owner, expiry_date, size, type, file_url, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
