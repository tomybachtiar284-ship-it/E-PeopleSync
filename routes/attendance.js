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
        if (month) {
            if (month.includes('-')) {
                const [y, m] = month.split('-');
                query += ` AND EXTRACT(YEAR FROM a.date) = $${idx++}`; params.push(y);
                query += ` AND EXTRACT(MONTH FROM a.date) = $${idx++}`; params.push(m);
            } else {
                query += ` AND EXTRACT(MONTH FROM a.date) = $${idx++}`; params.push(month);
            }
        }
        if (year && (!month || !month.includes('-'))) { query += ` AND EXTRACT(YEAR FROM a.date) = $${idx++}`; params.push(year); }
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
    let {
        user_id, date, clock_in, clock_out, shift_code, status,
        late_minutes, ot_hours, location, notes,
        lat, lon, photoBase64
    } = req.body;

    clock_in = clock_in === '' ? null : clock_in;
    clock_out = clock_out === '' ? null : clock_out;

    // --- Geotagging & Selfie Logic ---
    let locationStatus = null;
    let photoUrl = null;

    // Fetch dynamic office coordinates and radius from DB
    let OFFICE_LAT = -6.1753924;
    let OFFICE_LON = 106.8271528;
    let MAX_DISTANCE_METERS = 100;

    try {
        const setRes = await pool.query("SELECT value FROM settings WHERE key='attendanceConfig'");
        if (setRes.rows.length > 0) {
            const conf = setRes.rows[0].value;
            if (conf && conf.officeLat !== undefined) OFFICE_LAT = Number(conf.officeLat);
            if (conf && conf.officeLon !== undefined) OFFICE_LON = Number(conf.officeLon);
            if (conf && conf.maxRadius !== undefined) MAX_DISTANCE_METERS = Number(conf.maxRadius);
        }
    } catch (e) {
        console.error('Error fetching attendanceConfig from DB:', e.message);
    }

    // Haversine Formula Setup
    if (lat && lon) {
        const toRad = (value) => value * Math.PI / 180;
        const R = 6371e3; // Earth radius in meters
        const dLat = toRad(lat - OFFICE_LAT);
        const dLon = toRad(lon - OFFICE_LON);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(OFFICE_LAT)) * Math.cos(toRad(lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        locationStatus = distance <= MAX_DISTANCE_METERS ? 'Valid' : 'Luar Jarak';
        // Note: We assign 'location' based on distance to keep the string concise
        location = `GPS: ${distance.toFixed(0)}m (${locationStatus})`;
    }

    // Save Photo Logic
    if (photoBase64) {
        try {
            const fs = require('fs');
            const path = require('path');
            const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
            const filename = `att_${user_id}_${date}_${Date.now()}.jpg`;
            const filepath = path.join(__dirname, '../assets/uploads/attendance', filename);
            fs.writeFileSync(filepath, base64Data, 'base64');
            photoUrl = `/assets/uploads/attendance/${filename}`;
        } catch (fileErr) {
            console.error('Error saving attendance photo:', fileErr);
        }
    }

    try {
        // Fetch existing log to correctly map IN or OUT
        const existingRes = await pool.query('SELECT * FROM attendance WHERE user_id=$1 AND date=$2', [user_id, date]);
        const isClockOut = existingRes.rows.length > 0 && clock_out;

        let lat_in = null, lon_in = null, photo_in_url = null;
        let lat_out = null, lon_out = null, photo_out_url = null;

        if (isClockOut) {
            lat_out = lat || null;
            lon_out = lon || null;
            photo_out_url = photoUrl || null;
        } else {
            lat_in = lat || null;
            lon_in = lon || null;
            photo_in_url = photoUrl || null;
        }

        const result = await pool.query(
            `INSERT INTO attendance (
                user_id, date, clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes,
                latitude_in, longitude_in, photo_in_url, latitude_out, longitude_out, photo_out_url, location_status
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (user_id, date) DO UPDATE SET
                clock_in = COALESCE(EXCLUDED.clock_in, attendance.clock_in),
                clock_out = COALESCE(EXCLUDED.clock_out, attendance.clock_out),
                shift_code = COALESCE(EXCLUDED.shift_code, attendance.shift_code),
                status = COALESCE(EXCLUDED.status, attendance.status),
                late_minutes = COALESCE(EXCLUDED.late_minutes, attendance.late_minutes),
                ot_hours = COALESCE(EXCLUDED.ot_hours, attendance.ot_hours),
                location = COALESCE(EXCLUDED.location, attendance.location),
                notes = COALESCE(EXCLUDED.notes, attendance.notes),
                latitude_in = COALESCE(EXCLUDED.latitude_in, attendance.latitude_in),
                longitude_in = COALESCE(EXCLUDED.longitude_in, attendance.longitude_in),
                photo_in_url = COALESCE(EXCLUDED.photo_in_url, attendance.photo_in_url),
                latitude_out = COALESCE(EXCLUDED.latitude_out, attendance.latitude_out),
                longitude_out = COALESCE(EXCLUDED.longitude_out, attendance.longitude_out),
                photo_out_url = COALESCE(EXCLUDED.photo_out_url, attendance.photo_out_url),
                location_status = COALESCE(EXCLUDED.location_status, attendance.location_status)
             RETURNING *`,
            [
                user_id, date, clock_in, clock_out, shift_code, status, late_minutes || 0, ot_hours || 0, location, notes,
                lat_in, lon_in, photo_in_url, lat_out, lon_out, photo_out_url, locationStatus
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/attendance/:id
router.put('/:id', async (req, res) => {
    let { clock_in, clock_out, shift_code, status, late_minutes, ot_hours, location, notes } = req.body;
    clock_in = clock_in === '' ? null : clock_in;
    clock_out = clock_out === '' ? null : clock_out;
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
