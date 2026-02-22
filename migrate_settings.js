const pool = require('./db');
async function migrate() {
    try {
        console.log('Starting migration...');
        // Rename 'approvers' key to 'companyApprovers' if it exists
        const res = await pool.query(`
            UPDATE settings 
            SET key = 'companyApprovers' 
            WHERE key = 'approvers' 
            AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'companyApprovers')
        `);
        console.log('Migration rows affected:', res.rowCount);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}
migrate();
