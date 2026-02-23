const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'epeoplesync',
    password: 'Bachtiar@94',
    port: 5432,
});

async function verifyPerformance() {
    console.log('--- PERFORMANCE DATA VERIFICATION ---');
    try {
        // Check Table Columns
        const columnsRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'evaluations'
        `);
        console.log('Table Schema:');
        console.table(columnsRes.rows);

        // Check Latest Evaluations
        const evalsRes = await pool.query(`
            SELECT e.id, u.name as employee, e.feedback_message, e.feedback_by, e.updated_at
            FROM evaluations e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.updated_at DESC
            LIMIT 5
        `);
        console.log('\nLatest Evaluations:');
        console.table(evalsRes.rows);

    } catch (err) {
        console.error('Error during verification:', err.message);
    } finally {
        await pool.end();
    }
}

verifyPerformance();
