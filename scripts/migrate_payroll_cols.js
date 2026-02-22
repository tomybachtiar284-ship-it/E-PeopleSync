/**
 * Migration: Add extra columns to payroll_records
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const cols = [
    'fixed_allowance      NUMERIC(15,2) DEFAULT 0',
    'transport_allowance  NUMERIC(15,2) DEFAULT 0',
    'ot_hours             NUMERIC(10,2) DEFAULT 0',
    'bonus                NUMERIC(15,2) DEFAULT 0',
    'gross_salary         NUMERIC(15,2) DEFAULT 0',
    'manual_deduction     NUMERIC(15,2) DEFAULT 0',
    'email_status         VARCHAR(50)   DEFAULT \'Not Sent\''
];

(async () => {
    for (const col of cols) {
        const colName = col.trim().split(/\s+/)[0];
        try {
            await pool.query(`ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS ${col}`);
            console.log(`✅ Added: ${colName}`);
        } catch (e) {
            console.log(`⚠️  ${colName}: ${e.message}`);
        }
    }
    await pool.end();
    console.log('Done.');
})();
