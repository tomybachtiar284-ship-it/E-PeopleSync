require('dotenv').config();
const pool = require('./db');

async function run() {
    // Check what columns exist in settings table
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings'");
    console.log('Settings table columns:');
    cols.rows.forEach(c => console.log(' -', c.column_name, ':', c.data_type));

    // Get the raw bytes of the value
    const r = await pool.query("SELECT key, value, pg_typeof(value) as valuetype FROM settings WHERE key = 'companyApprovers'");
    console.log('\nPG type of value column:', r.rows[0]?.valuetype);
    console.log('Value starts with:', r.rows[0]?.value?.substring(0, 100));

    pool.end();
}
run().catch(e => { console.error(e); pool.end(); });
