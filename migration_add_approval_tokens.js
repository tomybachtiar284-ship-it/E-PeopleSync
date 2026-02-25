const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'epeoplesync',
    password: 'Bachtiar@94',
    port: 5432,
});

async function migrate() {
    console.log('--- MIGRATION: ADDING APPROVAL TOKENS TO leave_requests ---');
    try {
        const columns = [
            'supervisor_token VARCHAR(255)',
            'manager_token VARCHAR(255)'
        ];

        for (const col of columns) {
            const colName = col.split(' ')[0];
            const checkRes = await pool.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'leave_requests' AND column_name = $1
            `, [colName]);

            if (checkRes.rows.length === 0) {
                console.log(`Adding column: ${colName}`);
                await pool.query(`ALTER TABLE leave_requests ADD COLUMN ${col}`);
            } else {
                console.log(`Column already exists: ${colName}`);
            }
        }
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
