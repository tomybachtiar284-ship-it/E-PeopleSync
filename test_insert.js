const pool = require('./db');
const executeTest = async () => {
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
            [2, '2026-02-22', '23:45', '', 'DT', 'Hadir', 0, 0, 'Mobile App', '']
        );
        console.log("Success Insert:", result.rows[0]);
    } catch (err) {
        console.error("SQL Error:", err.message);
    } finally {
        pool.end();
    }
};
executeTest();
