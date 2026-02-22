const pool = require('./db.js');
async function check() {
    try {
        const res = await pool.query("SELECT id, name, basic_salary, role FROM users WHERE basic_salary IS NOT NULL OR role = 'employee'");
        console.log('Users Data:', res.rows);
        const res2 = await pool.query("SELECT * FROM payroll_records LIMIT 2");
        console.log('Payroll Data:', res2.rows);
        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}
check();
