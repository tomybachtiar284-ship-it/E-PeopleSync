const pool = require('../db');

async function migrate() {
    console.log('Starting Attendance Geotagging Schema Migration...');
    try {
        await pool.query(`
            ALTER TABLE attendance
            ADD COLUMN IF NOT EXISTS latitude_in DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS longitude_in DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS photo_in_url TEXT,
            ADD COLUMN IF NOT EXISTS latitude_out DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS longitude_out DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS photo_out_url TEXT,
            ADD COLUMN IF NOT EXISTS location_status VARCHAR(50);
        `);
        console.log('✅ Columns added successfully.');
    } catch (err) {
        console.error('❌ Error updating attendance table:', err.message);
    } finally {
        pool.end();
    }
}

migrate();
