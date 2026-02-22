const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── Attendance ──────────────────────────────────────────────

// GET /api/attendance?userId=&date=&month=&year=
router.get('/', async (req, res) => {
    const { userId, date, month, year } = req.query;
    try {
        let query = `
            SELECT a.*, u.name, u.department, u."group"
            FROM attendance a JOIN users u ON a.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (userId) { query += ` AND a.user_id = $${idx++}`; params.push(userId); }
        if (date) { query += ` AND a.date = $${idx++}`; params.push(date); }
        if (month) { query += ` AND EXTRACT(MONTH FROM a.date) = $${idx++}`; params.push(month); }
        if (year) { query += ` AND EXTRACT(YEAR FROM a.date) = $${idx++}`; params.push(year); }
        query += ' ORDER BY a.date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/attendance (clock-in / upsert)
router.post('/', async (req, res) => {
    const { user_id, date, clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO attendance (user_id, date, clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (user_id, date) DO UPDATE SET
                clock_in = COALESCE(EXCLUDED.clock_in, attendance.clock_in),
                clock_out = COALESCE(EXCLUDED.clock_out, attendance.clock_out),
                shift_code = COALESCE(EXCLUDED.shift_code, attendance.shift_code),
                status = COALESCE(EXCLUDED.status, attendance.status),
                late_minutes = COALESCE(EXCLUDED.late_minutes, attendance.late_minutes),
                ot_hours = COALESCE(EXCLUDED.ot_hours, attendance.ot_hours),
                location = COALESCE(EXCLUDED.location, attendance.location),
                notes = COALESCE(EXCLUDED.notes, attendance.notes)
             RETURNING *`,
            [user_id, date, clock_in, clock_out, shift_code, status, late_minutes || 0, ot_hours || 0, location, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/attendance/:id
router.put('/:id', async (req, res) => {
    const { clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes } = req.body;
    try {
        const result = await pool.query(
            `UPDATE attendance SET clock_in=$1,clock_out=$2,shift_code=$3,status=$4,
             late_minutes=$5,ot_hours=$6,location=$7,notes=$8 WHERE id=$9 RETURNING *`,
            [clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/attendance/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM attendance WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Roster ──────────────────────────────────────────────────

// GET /api/attendance/roster?userId=&month=&year=
router.get('/roster', async (req, res) => {
    const { userId, month, year, group } = req.query;
    try {
        let query = `
            SELECT r.*, u.name, u."group" FROM roster r JOIN users u ON r.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (userId) { query += ` AND r.user_id = $${idx++}`; params.push(userId); }
        if (group) { query += ` AND u."group" = $${idx++}`; params.push(group); }
        if (month) { query += ` AND EXTRACT(MONTH FROM r.date) = $${idx++}`; params.push(month); }
        if (year) { query += ` AND EXTRACT(YEAR FROM r.date) = $${idx++}`; params.push(year); }
        query += ' ORDER BY r.date ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/attendance/roster (upsert)
router.post('/roster', async (req, res) => {
    const { user_id, date, shift_code, notes } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO roster (user_id, date, shift_code, notes)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id, date) DO UPDATE SET shift_code=$3, notes=$4
             RETURNING *`,
            [user_id, date, shift_code, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Shift Definitions ───────────────────────────────────────

// GET /api/attendance/shifts
router.get('/shifts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM shift_definitions ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/attendance/shifts
router.post('/shifts', async (req, res) => {
    const { code, name, clock_in, clock_out } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO shift_definitions (code, name, clock_in, clock_out)
             VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO UPDATE SET name=$2,clock_in=$3,clock_out=$4 RETURNING *`,
            [code, name, clock_in || null, clock_out || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
