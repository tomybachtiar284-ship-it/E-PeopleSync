const pool = require('./db');
async function testUpdate() {
    try {
        const id = 1;
        const name = 'Admin HR Updated';
        const result = await pool.query(
            `UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [name, id]
        );
        console.log('✅ Update success:', JSON.stringify(result.rows[0]));
        process.exit(0);
    } catch (err) {
        console.error('❌ Update FAILED:', err.message);
        process.exit(1);
    }
}
testUpdate();
