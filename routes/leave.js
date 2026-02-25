const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const { sendApprovalEmail } = require('../middleware/mailHelper');
const { createNotification } = require('../middleware/notifHelper');

const authMiddleware = require('../middleware/authMiddleware');

// Helper to sync approved leave to roster
async function syncLeaveToRoster(userId, startDate, endDate, leaveType) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const typeMap = {
            'Cuti Tahunan': 'CT', 'Sakit': 'SD', 'Izin': 'I', 'Dinas Luar': 'DL',
            'Cuti': 'CT', 'Sakit (SD)': 'SD', 'Izin (I)': 'I', 'Dinas Luar (DL)': 'DL',
            'CT': 'CT', 'SD': 'SD', 'I': 'I', 'DL': 'DL'
        };
        const shiftCode = typeMap[leaveType] || leaveType;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            await pool.query(
                `INSERT INTO roster (user_id, date, shift_code)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, date) DO UPDATE SET shift_code = $3`,
                [userId, dateStr, shiftCode]
            );
        }
        console.log(`✅ Roster synced for user ${userId} from ${startDate} to ${endDate} as ${shiftCode}`);
    } catch (err) {
        console.error('Error syncing leave to roster:', err.message);
    }
}

// GET /api/leave?userId=&status=
router.get('/', authMiddleware, async (req, res) => {
    const { userId, status } = req.query;
    try {
        let query = `SELECT l.*, u.name AS emp_name, u.department FROM leave_requests l JOIN users u ON l.user_id = u.id WHERE 1=1`;
        const params = [];
        let idx = 1;
        if (userId) { query += ` AND l.user_id = $${idx++}`; params.push(userId); }
        if (status) { query += ` AND l.status = $${idx++}`; params.push(status); }
        query += ' ORDER BY l.submitted_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/leave/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.*, u.name AS emp_name, u.department FROM leave_requests l
             JOIN users u ON l.user_id = u.id WHERE l.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/leave
router.post('/', authMiddleware, async (req, res) => {
    const {
        user_id, type, start_date, end_date, reason,
        supervisor_id, supervisor_name, supervisor_email,
        manager_id, manager_name, manager_email
    } = req.body;

    try {
        const supervisor_token = crypto.randomUUID();
        const manager_token = crypto.randomUUID();

        const result = await pool.query(
            `INSERT INTO leave_requests (
                user_id, type, start_date, end_date, reason, 
                status, supervisor_id, supervisor_name, supervisor_email, supervisor_token,
                manager_id, manager_name, manager_email, manager_token
            )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [
                user_id, type, start_date, end_date, reason,
                'waiting_supervisor',
                supervisor_id, supervisor_name, supervisor_email, supervisor_token,
                manager_id, manager_name, manager_email, manager_token
            ]
        );

        const request = result.rows[0];

        // Fetch employee NID for security context
        const userRes = await pool.query('SELECT name, nid FROM users WHERE id = $1', [user_id]);
        const employeeSnippet = userRes.rows[0];

        // Send Email to Supervisor
        if (supervisor_email) {
            const approvalLink = `${req.protocol}://${req.get('host')}/external_approve.html?token=${supervisor_token}&role=supervisor`;
            await sendApprovalEmail({
                to: supervisor_email,
                employeeName: employeeSnippet ? employeeSnippet.name : 'Employee',
                leaveType: type,
                startDate: new Date(start_date).toLocaleDateString('id-ID'),
                endDate: new Date(end_date).toLocaleDateString('id-ID'),
                reason: reason,
                approvalLink: approvalLink
            });
        }

        res.status(201).json(request);
    } catch (err) {
        console.error('POST /api/leave error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/leave/:id/approve
router.put('/:id/approve', async (req, res) => {
    const { approved_by, status } = req.body; // status: 'Approved' | 'Rejected'
    try {
        const result = await pool.query(
            `UPDATE leave_requests SET status=$1, approved_by=$2, approved_at=CURRENT_TIMESTAMP
             WHERE id=$3 RETURNING *`,
            [status, approved_by, req.params.id]
        );
        const request = result.rows[0];

        // Create notification for the employee
        if (request) {
            await createNotification(
                request.user_id,
                `Update Pengajuan Cuti`,
                `Pengajuan ${request.type} Anda telah ${status === 'Approved' ? 'disetujui' : 'ditolak'} oleh ${approved_by}.`,
                'leave'
            );

            // SYNC TO ROSTER if approved
            if (status === 'Approved') {
                await syncLeaveToRoster(request.user_id, request.start_date, request.end_date, request.type);
            }
        }

        res.json(request);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/leave/:id (update data pengajuan)
router.put('/:id', async (req, res) => {
    const { type, start_date, end_date, reason } = req.body;
    try {
        const result = await pool.query(
            `UPDATE leave_requests SET type=$1, start_date=$2, end_date=$3, reason=$4
             WHERE id=$5 RETURNING *`,
            [type, start_date, end_date, reason, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/leave/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM leave_requests WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ── PUBLIC ROUTES FOR EXTERNAL APPROVAL ───────────────────────

// GET /api/leave/external/:token
router.get('/external/:token', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT l.id, l.type, l.start_date, l.end_date, l.reason, l.status, u.name as emp_name
             FROM leave_requests l 
             JOIN users u ON l.user_id = u.id
             WHERE l.supervisor_token = $1 OR l.manager_token = $1`,
            [req.params.token]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired link' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/leave/external/process
router.post('/external/process', async (req, res) => {
    const { token, nid, action, note } = req.body; // action: 'approve' | 'reject'
    try {
        // 1. Verify token and get leave info
        const leaveRes = await pool.query(
            `SELECT l.*, u.nid as emp_nid, u.name as emp_name FROM leave_requests l 
             JOIN users u ON l.user_id = u.id
             WHERE l.supervisor_token = $1 OR l.manager_token = $1`,
            [token]
        );
        if (leaveRes.rows.length === 0) return res.status(404).json({ error: 'Link tidak valid' });

        const leave = leaveRes.rows[0];

        // 2. Security Check: NID must match
        if (leave.emp_nid !== nid) {
            return res.status(403).json({ error: 'Verifikasi NID gagal. Data pengajuan tidak cocok.' });
        }

        const isSupervisor = (leave.supervisor_token === token);
        let newStatus = '';
        let approved_by = isSupervisor ? leave.supervisor_name : leave.manager_name;

        if (action === 'approve') {
            if (isSupervisor) {
                newStatus = 'waiting_manager';
                // Trigger Email to Manager
                if (leave.manager_email) {
                    const approvalLink = `${req.protocol}://${req.get('host')}/external_approve.html?token=${leave.manager_token}&role=manager`;
                    await sendApprovalEmail({
                        to: leave.manager_email,
                        employeeName: leave.emp_name,
                        leaveType: leave.type,
                        startDate: new Date(leave.start_date).toLocaleDateString('id-ID'),
                        endDate: new Date(leave.end_date).toLocaleDateString('id-ID'),
                        reason: leave.reason,
                        approvalLink: approvalLink
                    });
                }
            } else {
                newStatus = 'Approved';
            }
        } else {
            newStatus = 'Rejected';
        }

        // 3. Update DB
        await pool.query(
            `UPDATE leave_requests SET status=$1, approved_by=$2, approved_at=CURRENT_TIMESTAMP, 
             reason = reason || $3
             WHERE id=$4`,
            [newStatus, approved_by, note ? `\nNote (${approved_by}): ${note}` : '', leave.id]
        );

        // 4. Notify Employee
        await createNotification(
            leave.user_id,
            'Update Pengajuan Cuti',
            `Pengajuan ${leave.type} Anda telah ${action === 'approve' ? 'disetujui' : 'ditolak'} oleh ${approved_by}.`,
            'leave'
        );

        // SYNC TO ROSTER if final approval
        if (newStatus === 'Approved') {
            await syncLeaveToRoster(leave.user_id, leave.start_date, leave.end_date, leave.type);
        }

        res.json({ success: true, message: `Pengajuan berhasil di-${action}.` });
    } catch (err) {
        console.error('external process error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
