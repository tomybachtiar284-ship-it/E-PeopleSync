const pool = require('./db');
async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND is_nullable = 'NO'
        `);
        console.log('NOT NULL Columns in users table:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (Default: ${row.column_default})`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err.message);
        process.exit(1);
    }
}
checkSchema();
