const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/news
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY published_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/news
router.post('/', async (req, res) => {
    const { title, content, image, author, published_at } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO news (title, content, image, author, published_at) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [title, content, image, author, published_at || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news WHERE id=$1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/news/:id
router.put('/:id', async (req, res) => {
    const { title, content, image, author, published_at } = req.body;
    try {
        const result = await pool.query(
            `UPDATE news SET title=$1,content=$2,image=$3,author=$4,published_at=$5 WHERE id=$6 RETURNING *`,
            [title, content, image, author, published_at, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/news/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM news WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
