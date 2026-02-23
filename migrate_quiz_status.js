const pool = require('./db');

async function migrate() {
    try {
        console.log('Adding status column to quiz_attempts...');
        await pool.query("ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'graded'");
        console.log('Success!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
