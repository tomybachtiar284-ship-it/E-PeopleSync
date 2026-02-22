require('dotenv').config();
const pool = require('./db');

// Force-set to valid JSON, preserving known entries
const cleanData = [
    { name: "Admin HR", position: "HR Manager", email: "admin@peoplesync.com" },
    { name: "Wisnu Wijaya", position: "Asman OpHar", email: "tomy@peoplesync.com" }
];

const jsonString = JSON.stringify(cleanData);
console.log('Will save:', jsonString);

pool.query(
    "INSERT INTO settings (key, value) VALUES ('companyApprovers', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
    [jsonString]
).then(r => {
    console.log('✅ Berhasil! Data companyApprovers sudah dalam format JSON valid.');

    // Verify
    return pool.query("SELECT value FROM settings WHERE key = 'companyApprovers'");
}).then(r => {
    console.log('\n=== VERIFIKASI ===');
    const parsed = JSON.parse(r.rows[0].value);
    console.log('Jumlah approvers:', parsed.length);
    parsed.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} | ${a.position} | ${a.email}`));
    pool.end();
}).catch(e => { console.error('Error:', e.message); pool.end(); });
