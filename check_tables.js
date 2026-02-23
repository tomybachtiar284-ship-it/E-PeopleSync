const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'epeoplesync',
    password: 'Bachtiar@94',
    port: 5432,
});

async function checkTables() {
    console.log('--- DATA VERIFICATION: LEARNING HUB TABLES ---');
    try {
        const tables = ['courses', 'enrollments', 'quizzes', 'quiz_attempts'];

        for (const table of tables) {
            const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`Table '${table}': ${res.rows[0].count} records found.`);
        }

        console.log('\n--- SAMPLE DATA (LATEST COMPLETIONS) ---');
        const completions = await pool.query(`
            SELECT u.name as student, c.title as course, e.status, e.completed_at
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            JOIN courses c ON e.course_id = c.id
            WHERE e.status = 'completed'
            ORDER BY e.completed_at DESC
            LIMIT 5
        `);

        if (completions.rows.length === 0) {
            console.log('No completed enrollments yet.');
        } else {
            console.table(completions.rows);
        }

    } catch (err) {
        console.error('Error checking tables:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
