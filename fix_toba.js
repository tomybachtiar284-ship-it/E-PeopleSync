const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres:Bachtiar@94@localhost:5432/epeoplesync"
});

async function fix() {
    try {
        console.log('Resetting enrollment for user 2, course 1...');
        await pool.query("UPDATE enrollments SET status = 'in-progress', progress = 0 WHERE user_id = 2 AND course_id = 1");

        console.log('Deleting failed quiz attempt for user 2, quiz 1...');
        await pool.query("DELETE FROM quiz_attempts WHERE user_id = 2 AND quiz_id = 1");

        console.log('Done.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

fix();
