const pool = require('./db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'quiz_attempts'
        `);
        console.log('Columns in quiz_attempts:');
        for (let row of res.rows) {
            console.log(`[COLUMN] ${row.column_name} => ${row.data_type}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

check();
