const express = require('express');
const router = express.Router();
const pool = require('../db');

// Kolom-kolom yang bisa di-insert/update (semua kolom HR)
const EMPLOYEE_FIELDS = [
    'username', 'password', 'role', 'name', 'email', 'nid', 'position', 'department',
    'group', 'shift_code', 'avatar', 'phone', 'address', 'join_date', 'status', 'order', 'source',
    'supervisor_name', 'supervisor_job', 'supervisor_email',
    'final_approver_name', 'final_approver_job', 'final_approver_email',
    'basic_salary', 'bank_name', 'bank_account', 'bank_holder',
    'fixed_allowance', 'transport_allowance',
    // Detail personal
    'birth_place', 'birth_date', 'gender', 'marital_status', 'religion', 'citizenship',
    'ktp_number', 'npwp', 'address_domicile', 'address_ktp', 'phone_emergency', 'email_personal',
    // Detail employment
    'employee_status', 'contract_period', 'location', 'grade', 'level', 'bpjs_health', 'bpjs_labor',
    // Pendidikan & kompetensi
    'education', 'major', 'grad_year', 'skills', 'certifications',
    'training_history', 'competency_level',
    // Riwayat
    'position_history', 'promotion_history', 'mutation_history', 'previous_company',
    'kpi_score', 'eval_history', 'discipline_status', 'hr_notes'
];

// Kolom reservasi DB yang perlu dikutip
const QUOTED_COLS = new Set(['group', 'order']);

// GET /api/employees
router.get('/', async (req, res) => {
    try {
        const { role, department, status } = req.query;
        let query = 'SELECT * FROM users WHERE 1=1';
        const params = [];
        let idx = 1;
        if (role) { query += ` AND role = $${idx++}`; params.push(role); }
        if (department) { query += ` AND department = $${idx++}`; params.push(department); }
        if (status) { query += ` AND status = $${idx++}`; params.push(status); }
        query += ' ORDER BY "order" ASC, id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/employees/list/approvers
router.get('/list/approvers', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT name, position, email FROM users WHERE role IN ('admin', 'manager') ORDER BY name ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /approvers error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    console.log('POST /api/employees - Request Body:', JSON.stringify(req.body));
    const body = req.body;

    // Kumpulkan field yang ada di body dan di EMPLOYEE_FIELDS
    const presentFields = EMPLOYEE_FIELDS.filter(f => body[f] !== undefined && body[f] !== null && body[f] !== '');
    if (!body.name) return res.status(400).json({ error: 'Field "name" wajib diisi.' });
    if (!presentFields.includes('name')) presentFields.push('name');
    if (!presentFields.includes('role')) presentFields.push('role');
    if (!presentFields.includes('status')) presentFields.push('status');

    const colNames = presentFields.map(f => QUOTED_COLS.has(f) ? `"${f}"` : f).join(', ');
    const placeholders = presentFields.map((_, i) => `$${i + 1}`).join(', ');
    const values = presentFields.map(f => {
        if (f === 'role') return body.role || 'employee';
        if (f === 'status') return body.status || 'active';
        if (f === 'password') return body.password || 'password';
        return body[f];
    });

    try {
        const result = await pool.query(
            `INSERT INTO users (${colNames}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /employees error:', err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'Username atau NID sudah digunakan.' });
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

router.put('/:id', async (req, res) => {
    console.log(`PUT /api/employees/${req.params.id} - Request Body:`, JSON.stringify(req.body));
    const body = req.body;
    const id = req.params.id;

    const updateableFields = EMPLOYEE_FIELDS.filter(f => {
        if (f === 'password' && !body[f]) return false; // skip password jika kosong
        return body[f] !== undefined;
    });

    if (updateableFields.length === 0) {
        return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });
    }

    const setClauses = updateableFields.map((f, i) =>
        `${QUOTED_COLS.has(f) ? `"${f}"` : f} = $${i + 1}`
    ).join(', ');
    const values = updateableFields.map(f => body[f] || null);
    values.push(id); // WHERE id = $N

    try {
        const result = await pool.query(
            `UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PUT /employees/:id error:', err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
