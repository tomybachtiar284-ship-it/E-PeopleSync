const { createNotification } = require('./middleware/notifHelper');
const pool = require('./db');

async function testNotif() {
    console.log('--- TESTING NOTIFICATION TRIGGER ---');
    try {
        // Find a test user (e.g., TOBA)
        const userRes = await pool.query("SELECT id, name FROM users WHERE name ILIKE '%TOBA%' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log('Test user not found.');
            return;
        }
        const user = userRes.rows[0];
        console.log(`Found test user: ${user.name} (ID: ${user.id})`);

        // Create a test notification
        await createNotification(
            user.id,
            'Test Notifikasi',
            'Ini adalah pesan uji coba untuk sistem notifikasi baru.',
            'general'
        );

        // Verify in DB
        const notifRes = await pool.query(
            "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
            [user.id]
        );
        console.log('Latest notification in DB:');
        console.table(notifRes.rows);

    } catch (err) {
        console.error('Test failed:', err.message);
    } finally {
        await pool.end();
    }
}

testNotif();
