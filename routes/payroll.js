const express = require('express');
const router = express.Router();
const pool = require('../db');

// Auto-migrate: tambah kolom baru jika belum ada
(async () => {
    const cols = [
        'fixed_allowance      NUMERIC(15,2) DEFAULT 0',
        'transport_allowance  NUMERIC(15,2) DEFAULT 0',
        'ot_hours             NUMERIC(10,2) DEFAULT 0',
        'bonus                NUMERIC(15,2) DEFAULT 0',
        'gross_salary         NUMERIC(15,2) DEFAULT 0',
        'manual_deduction     NUMERIC(15,2) DEFAULT 0',
        "email_status         VARCHAR(50)   DEFAULT 'Not Sent'"
    ];
    for (const col of cols) {
        try {
            await pool.query(`ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS ${col}`);
        } catch { /* ignore */ }
    }
})();

// GET /api/payroll/settings
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM payroll_settings');
        const settings = {};
        result.rows.forEach(r => { settings[r.key] = parseFloat(r.value); });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/payroll/settings
router.put('/settings', async (req, res) => {
    const settings = req.body;
    try {
        const client = await pool.connect();
        for (const [key, value] of Object.entries(settings)) {
            await client.query(
                `INSERT INTO payroll_settings (key, value) VALUES ($1,$2)
                 ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=CURRENT_TIMESTAMP`,
                [key, value]
            );
        }
        client.release();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/payroll/records?userId=&month=&year=
router.get('/records', async (req, res) => {
    const { userId, month, year } = req.query;
    try {
        let query = `SELECT pr.*, u.name, u.department FROM payroll_records pr JOIN users u ON pr.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (userId) { query += ` AND pr.user_id = $${idx++}`; params.push(userId); }
        if (month) { query += ` AND pr.period_month = $${idx++}`; params.push(month); }
        if (year) { query += ` AND pr.period_year  = $${idx++}`; params.push(year); }
        query += ' ORDER BY pr.period_year DESC, pr.period_month DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/payroll/records (upsert)
router.post('/records', async (req, res) => {
    const {
        user_id, period_month, period_year,
        basic_salary, fixed_allowance, transport_allowance,
        ot_hours, total_ot, bonus, gross_salary,
        bpjs_jht, bpjs_jp, bpjs_kes, pph21,
        manual_deduction, total_deductions, net_salary,
        status, email_status
    } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO payroll_records
               (user_id, period_month, period_year,
                basic_salary, fixed_allowance, transport_allowance,
                ot_hours, total_ot, bonus, gross_salary,
                bpjs_jht, bpjs_jp, bpjs_kes, pph21,
                manual_deduction, total_deductions, net_salary,
                status, email_status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
             ON CONFLICT (user_id, period_month, period_year) DO UPDATE SET
               basic_salary=$4, fixed_allowance=$5, transport_allowance=$6,
               ot_hours=$7, total_ot=$8, bonus=$9, gross_salary=$10,
               bpjs_jht=$11, bpjs_jp=$12, bpjs_kes=$13, pph21=$14,
               manual_deduction=$15, total_deductions=$16, net_salary=$17,
               status=$18,
               email_status=COALESCE($19, payroll_records.email_status)
             RETURNING *`,
            [
                user_id, period_month, period_year,
                basic_salary || 0, fixed_allowance || 0, transport_allowance || 0,
                ot_hours || 0, total_ot || 0, bonus || 0, gross_salary || 0,
                bpjs_jht || 0, bpjs_jp || 0, bpjs_kes || 0, pph21 || 0,
                manual_deduction || 0, total_deductions || 0, net_salary || 0,
                status || 'draft', email_status || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST payroll/records error:', err.message);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

module.exports = router;
