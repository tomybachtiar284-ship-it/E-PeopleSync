const pool = require('../db');
async function test() {
    try {
        await pool.query(
            `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            ['attendanceConfig', JSON.stringify({ officeLat: -6.1753924, officeLon: 106.8271528, maxRadius: 100 })]
        );
        const res = await pool.query('SELECT value FROM settings WHERE key=$1', ['attendanceConfig']);
        console.log('Config Inserted/Updated:', res.rows[0].value);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
test();
