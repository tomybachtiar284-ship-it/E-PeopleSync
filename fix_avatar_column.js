require('dotenv').config();
const pool = require('./db');

async function run() {
    console.log('Altering "avatar" column from VARCHAR(255) to TEXT...');
    await pool.query('ALTER TABLE users ALTER COLUMN avatar TYPE TEXT');
    console.log('✅ Berhasil! Kolom avatar sekarang bertipe TEXT.');

    // Verify
    const r = await pool.query(
        "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='users' AND column_name='avatar'"
    );
    console.log('New column type:', r.rows[0]);
    pool.end();
}
run().catch(e => { console.error('Error:', e.message); pool.end(); });
